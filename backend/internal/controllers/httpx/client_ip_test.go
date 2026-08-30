package httpx

import (
	"net/http"
	"testing"
)

func withForwarded(t *testing.T, remote, forwarded string) *http.Request {
	t.Helper()
	r, err := http.NewRequest(http.MethodGet, "http://timeline.example/", nil)
	if err != nil {
		t.Fatalf("building request: %v", err)
	}
	r.RemoteAddr = remote
	if forwarded != "" {
		r.Header.Set("X-Forwarded-For", forwarded)
	}
	return r
}

func TestClientIPTakesTheHopAddedByOurProxy(t *testing.T) {
	r := withForwarded(t, "10.0.0.2:5555", "1.2.3.4, 203.0.113.9")
	if got := ClientIP(r); got != "203.0.113.9" {
		t.Errorf("ClientIP = %q, want the last hop 203.0.113.9", got)
	}
}

func TestClientIPIgnoresAForgedLeadingHop(t *testing.T) {
	forged := withForwarded(t, "10.0.0.2:5555", "9.9.9.9, 203.0.113.9")
	honest := withForwarded(t, "10.0.0.2:5555", "203.0.113.9")
	if ClientIP(forged) == "9.9.9.9" {
		t.Fatal("a client-supplied leading hop became the rate limiting key")
	}
	if ClientIP(forged) != ClientIP(honest) {
		t.Errorf("prepending a hop changed the key: %q against %q",
			ClientIP(forged), ClientIP(honest))
	}
}

func TestClientIPFallsBackToTheConnection(t *testing.T) {
	if got := ClientIP(withForwarded(t, "198.51.100.7:44321", "")); got != "198.51.100.7" {
		t.Errorf("ClientIP = %q, want 198.51.100.7 from RemoteAddr", got)
	}
}

func TestClientIPIgnoresAnEmptyHeader(t *testing.T) {
	r := withForwarded(t, "198.51.100.7:44321", "   ")
	if got := ClientIP(r); got != "198.51.100.7" {
		t.Errorf("ClientIP = %q, want the connection address", got)
	}
}
