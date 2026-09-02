package validation

import "testing"

func TestProfileLinkURLAcceptsPlainHTTP(t *testing.T) {
	cases := []struct {
		name  string
		value string
		want  string
	}{
		{"https", "https://example.org/ivan", "https://example.org/ivan"},
		{"plain http", "http://example.org/ivan", "http://example.org/ivan"},
		{"internal host over http", "http://intranet.local:8080/ivan", "http://intranet.local:8080/ivan"},
		{"surrounding whitespace trimmed", "  http://example.org/ivan  ", "http://example.org/ivan"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := ProfileLinkURL("url", tc.value)
			if err != nil {
				t.Fatalf("expected the address to be accepted, got %v", err)
			}
			if got != tc.want {
				t.Fatalf("expected %q, got %q", tc.want, got)
			}
		})
	}
}

func TestProfileLinkURLRejectsExecutableSchemes(t *testing.T) {
	cases := []struct {
		name  string
		value string
	}{
		{"javascript", "javascript:alert(document.cookie)"},
		{"javascript with mixed case spelling", "JavaScript:alert(1)"},
		{"javascript disguised with an authority", "JaVaScRiPt://example.org/%0aalert(1)"},
		{"data", "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=="},
		{"data carrying an authority", "data://example.org/text/html,<script>alert(1)</script>"},
		{"vbscript", "vbscript:msgbox(1)"},
		{"vbscript with an authority", "vbscript://example.org/x"},
		{"file", "file:///etc/passwd"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if _, err := ProfileLinkURL("url", tc.value); err == nil {
				t.Fatalf("expected the address to be rejected: %q", tc.value)
			}
		})
	}
}

func TestProfileLinkURLRejectsValuesThatNameNoAddress(t *testing.T) {
	cases := []struct {
		name  string
		value string
	}{
		{"empty", ""},
		{"blank", "   "},
		{"no scheme", "example.org/ivan"},
		{"free text", "ask me on the chat"},
		{"relative path", "/ivan"},
		{"scheme without host", "https://"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if _, err := ProfileLinkURL("url", tc.value); err == nil {
				t.Fatalf("expected the address to be rejected: %q", tc.value)
			}
		})
	}
}
