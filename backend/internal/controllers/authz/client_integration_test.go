//go:build integration

package authz_test

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"strings"
	"testing"
)

const (
	accessCookie  = "access_token"
	refreshCookie = "refresh_token"
	csrfCookie    = "csrf_token"
	csrfHeader    = "X-CSRF-Token"
)

type client struct {
	t     *testing.T
	stack *stack
	http  *http.Client
}

type response struct {
	Status int
	Body   []byte
}

func (r response) decode(t *testing.T, into any) {
	t.Helper()
	if err := json.Unmarshal(r.Body, into); err != nil {
		t.Fatalf("decoding response %s: %v", r.Body, err)
	}
}

func (r response) errorCode(t *testing.T) string {
	t.Helper()
	var body struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	r.decode(t, &body)
	return body.Error.Code
}

func (s *stack) client(t *testing.T) *client {
	t.Helper()
	jar, err := cookiejar.New(nil)
	if err != nil {
		t.Fatalf("creating a cookie jar: %v", err)
	}
	return &client{t: t, stack: s, http: &http.Client{
		Jar:       jar,
		Transport: s.transport(),
		CheckRedirect: func(*http.Request, []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}}
}

func (c *client) cookie(name string) string {
	base, err := url.Parse(c.stack.server.URL)
	if err != nil {
		c.t.Fatalf("parsing the server URL: %v", err)
	}
	for _, ck := range c.http.Jar.Cookies(base) {
		if ck.Name == name {
			return ck.Value
		}
	}
	return ""
}

func (c *client) setCookie(name, value string) {
	base, err := url.Parse(c.stack.server.URL)
	if err != nil {
		c.t.Fatalf("parsing the server URL: %v", err)
	}
	c.http.Jar.SetCookies(base, []*http.Cookie{{Name: name, Value: value, Path: "/"}})
}

func (c *client) do(method, path string, body any, headers map[string]string) response {
	c.t.Helper()

	var reader io.Reader
	if body != nil {
		encoded, err := json.Marshal(body)
		if err != nil {
			c.t.Fatalf("encoding the request body: %v", err)
		}
		reader = bytes.NewReader(encoded)
	}
	req, err := http.NewRequest(method, c.stack.url(path), reader)
	if err != nil {
		c.t.Fatalf("building the request: %v", err)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	for name, value := range headers {
		req.Header.Set(name, value)
	}

	resp, err := c.http.Do(req)
	if err != nil {
		c.t.Fatalf("performing %s %s: %v", method, path, err)
	}
	defer resp.Body.Close()
	payload, err := io.ReadAll(resp.Body)
	if err != nil {
		c.t.Fatalf("reading the response body: %v", err)
	}
	return response{Status: resp.StatusCode, Body: payload}
}

func (c *client) get(path string) response { return c.do(http.MethodGet, path, nil, nil) }

func (c *client) mutate(method, path string, body any) response {
	c.t.Helper()
	c.refreshCSRF()
	return c.do(method, path, body, map[string]string{csrfHeader: c.cookie(csrfCookie)})
}

func (c *client) post(path string, body any) response {
	return c.mutate(http.MethodPost, path, body)
}

func (c *client) patch(path string, body any) response {
	return c.mutate(http.MethodPatch, path, body)
}

func (c *client) delete(path string) response {
	return c.mutate(http.MethodDelete, path, nil)
}

func (c *client) refreshCSRF() {
	c.t.Helper()
	if resp := c.get("/auth/csrf"); resp.Status != http.StatusOK {
		c.t.Fatalf("obtaining a CSRF token: status %d body %s", resp.Status, resp.Body)
	}
}

func (c *client) login(email, password string) {
	c.t.Helper()
	resp := c.post("/auth/login", map[string]string{"email": email, "password": password})
	if resp.Status != http.StatusOK {
		c.t.Fatalf("signing in as %s: status %d body %s", email, resp.Status, resp.Body)
	}
	if c.cookie(accessCookie) == "" {
		c.t.Fatalf("signing in as %s left no access cookie", email)
	}
}

func requireStatus(t *testing.T, resp response, want int, what string) {
	t.Helper()
	if resp.Status != want {
		t.Fatalf("%s: expected status %d, got %d, body %s", what, want, resp.Status, resp.Body)
	}
}

func requireNoBodyField(t *testing.T, resp response, field, what string) {
	t.Helper()
	var generic any
	resp.decode(t, &generic)
	if found := searchKey(generic, field); found {
		t.Fatalf("%s: the response exposes the %q field: %s", what, field, resp.Body)
	}
}

func searchKey(node any, key string) bool {
	switch typed := node.(type) {
	case map[string]any:
		for name, value := range typed {
			if name == key {
				return true
			}
			if searchKey(value, key) {
				return true
			}
		}
	case []any:
		for _, value := range typed {
			if searchKey(value, key) {
				return true
			}
		}
	}
	return false
}

func containsAll(haystack string, needles ...string) bool {
	for _, needle := range needles {
		if !strings.Contains(haystack, needle) {
			return false
		}
	}
	return true
}
