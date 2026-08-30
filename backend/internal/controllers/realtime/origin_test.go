package realtime

import (
	"net/http"
	"testing"
)

func request(t *testing.T, host, origin string) *http.Request {
	t.Helper()
	r, err := http.NewRequest(http.MethodGet, "http://"+host+"/api/v1/realtime", nil)
	if err != nil {
		t.Fatalf("building request: %v", err)
	}
	r.Host = host
	if origin != "" {
		r.Header.Set("Origin", origin)
	}
	return r
}

func TestOriginAllowedAcceptsTheConfiguredOrigin(t *testing.T) {
	allowed := []string{"https://timeline.example"}
	if !OriginAllowed(request(t, "api.internal", "https://timeline.example"), allowed) {
		t.Error("the configured origin was rejected")
	}
}

func TestOriginAllowedAcceptsTheSameHost(t *testing.T) {
	if !OriginAllowed(request(t, "timeline.example", "https://timeline.example"), nil) {
		t.Error("a request from its own host was rejected")
	}
}

func TestOriginAllowedRejectsAForeignSite(t *testing.T) {
	allowed := []string{"https://timeline.example"}
	cases := []string{
		"https://evil.example",
		"https://timeline.example.evil.example",
		"https://eviltimeline.example",
	}
	for _, origin := range cases {
		if OriginAllowed(request(t, "timeline.example", origin), allowed) {
			t.Errorf("%q was accepted: a foreign page could open the socket", origin)
		}
	}
}

func TestOriginAllowedRejectsAMissingHeader(t *testing.T) {
	if OriginAllowed(request(t, "timeline.example", ""), []string{"https://timeline.example"}) {
		t.Error("a request without an Origin header was accepted")
	}
}

func TestOriginAllowedRejectsANonWebScheme(t *testing.T) {
	cases := []string{
		"file://timeline.example",
		"javascript://timeline.example",
		"ws://timeline.example",
	}
	for _, origin := range cases {
		if OriginAllowed(request(t, "timeline.example", origin), []string{"https://timeline.example"}) {
			t.Errorf("%q was accepted although it is not an http(s) origin", origin)
		}
	}
}

func TestOriginAllowedIgnoresAWildcardEntry(t *testing.T) {
	if OriginAllowed(request(t, "timeline.example", "https://evil.example"), []string{"*"}) {
		t.Error("a wildcard entry opened the socket to any site")
	}
}
