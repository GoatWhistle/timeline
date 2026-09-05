//go:build integration

package support

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
	AccessCookie  = "access_token"
	RefreshCookie = "refresh_token"
	CSRFCookie    = "csrf_token"
	DeviceCookie  = "device_id"
	CSRFHeader    = "X-CSRF-Token"
)

type Client struct {
	t     *testing.T
	stack *Stack
	http  *http.Client
}

type Response struct {
	Status int
	Body   []byte
	Header http.Header
}

func (r Response) Decode(t *testing.T, into any) {
	t.Helper()
	if err := json.Unmarshal(r.Body, into); err != nil {
		t.Fatalf("decoding response %s: %v", r.Body, err)
	}
}

func (r Response) ErrorCode(t *testing.T) string {
	t.Helper()
	var body struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	r.Decode(t, &body)
	return body.Error.Code
}

func (s *Stack) Client(t *testing.T) *Client {
	t.Helper()
	jar, err := cookiejar.New(nil)
	if err != nil {
		t.Fatalf("creating a cookie jar: %v", err)
	}
	return &Client{t: t, stack: s, http: &http.Client{
		Jar:       jar,
		Transport: s.Transport(),
		CheckRedirect: func(*http.Request, []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}}
}

func (c *Client) Cookie(name string) string {
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

func (c *Client) SetCookie(name, value string) {
	base, err := url.Parse(c.stack.server.URL)
	if err != nil {
		c.t.Fatalf("parsing the server URL: %v", err)
	}
	c.http.Jar.SetCookies(base, []*http.Cookie{{Name: name, Value: value, Path: "/"}})
}

func (c *Client) Do(method, path string, body any, headers map[string]string) Response {
	c.t.Helper()

	var reader io.Reader
	if body != nil {
		encoded, err := json.Marshal(body)
		if err != nil {
			c.t.Fatalf("encoding the request body: %v", err)
		}
		reader = bytes.NewReader(encoded)
	}
	req, err := http.NewRequest(method, c.stack.URL(path), reader)
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
	return Response{Status: resp.StatusCode, Body: payload, Header: resp.Header}
}

func (c *Client) Get(path string) Response { return c.Do(http.MethodGet, path, nil, nil) }

func (c *Client) Mutate(method, path string, body any) Response {
	c.t.Helper()
	c.RefreshCSRF()
	return c.Do(method, path, body, map[string]string{CSRFHeader: c.Cookie(CSRFCookie)})
}

func (c *Client) Post(path string, body any) Response {
	return c.Mutate(http.MethodPost, path, body)
}

func (c *Client) Patch(path string, body any) Response {
	return c.Mutate(http.MethodPatch, path, body)
}

func (c *Client) Delete(path string) Response {
	return c.Mutate(http.MethodDelete, path, nil)
}

func (c *Client) RefreshCSRF() {
	c.t.Helper()
	if resp := c.Get("/auth/csrf"); resp.Status != http.StatusOK {
		c.t.Fatalf("obtaining a CSRF token: status %d body %s", resp.Status, resp.Body)
	}
}

func (c *Client) Login(email, password string) {
	c.t.Helper()
	resp := c.Post("/auth/login", map[string]string{"email": email, "password": password})
	if resp.Status != http.StatusOK {
		c.t.Fatalf("signing in as %s: status %d body %s", email, resp.Status, resp.Body)
	}
	if c.Cookie(AccessCookie) == "" {
		c.t.Fatalf("signing in as %s left no access cookie", email)
	}
}

func RequireStatus(t *testing.T, resp Response, want int, what string) {
	t.Helper()
	if resp.Status != want {
		t.Fatalf("%s: expected status %d, got %d, body %s", what, want, resp.Status, resp.Body)
	}
}

func RequireNoBodyField(t *testing.T, resp Response, field, what string) {
	t.Helper()
	var generic any
	resp.Decode(t, &generic)
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

func ContainsAll(haystack string, needles ...string) bool {
	for _, needle := range needles {
		if !strings.Contains(haystack, needle) {
			return false
		}
	}
	return true
}

func RequireErrorCode(t *testing.T, resp Response, wantStatus int, wantCode, what string) {
	t.Helper()
	RequireStatus(t, resp, wantStatus, what)
	if code := resp.ErrorCode(t); code != wantCode {
		t.Fatalf("%s: expected error code %q, got %q, body %s", what, wantCode, code, resp.Body)
	}
}
