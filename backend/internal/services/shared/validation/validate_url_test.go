package validation

import "testing"

func TestValidateURLAcceptsAnyBrowserSafeScheme(t *testing.T) {
	cases := []struct {
		name  string
		value string
		want  string
	}{
		{"https", "https://example.org/rules", "https://example.org/rules"},
		{"plain http", "http://example.org/rules", "http://example.org/rules"},
		{"internal host", "http://intranet.local:8080/form", "http://intranet.local:8080/form"},
		{"telegram scheme", "tg://resolve?domain=hackathon_crew", "tg://resolve?domain=hackathon_crew"},
		{"surrounding whitespace trimmed", "  https://example.org/x  ", "https://example.org/x"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := ValidateURL("url", tc.value)
			if err != nil {
				t.Fatalf("expected the address to be accepted, got %v", err)
			}
			if got != tc.want {
				t.Fatalf("expected %q, got %q", tc.want, got)
			}
		})
	}
}

func TestValidateURLRejectsExecutableSchemes(t *testing.T) {
	cases := []struct {
		name  string
		value string
	}{
		{"javascript", "javascript:alert(document.cookie)"},
		{"javascript with mixed case spelling", "JavaScript:alert(1)"},
		{"javascript disguised with an authority", "JaVaScRiPt://example.org/%0aalert(1)"},
		{"data", "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=="},
		{"vbscript", "vbscript:msgbox(1)"},
		{"file", "file:///etc/passwd"},
		{"livescript is a javascript alias", "livescript://example.org/%0aalert(1)"},
		{"mocha is a javascript alias", "mocha://example.org/%0aalert(1)"},
		{"data carrying an authority", "data://example.org/text/html,<script>alert(1)</script>"},
		{"ms-msdt invokes an operating system handler", "ms-msdt://x"},
		{"search-ms invokes an operating system handler", "search-ms://query=x"},
		{"steam invokes an operating system handler", "steam://run/1"},
		{"chrome reaches browser internals", "chrome://settings"},
		{"about reaches browser internals", "about://blank"},
		{"intent invokes an android handler", "intent://scan/#Intent;scheme=zxing;end"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if _, err := ValidateURL("url", tc.value); err == nil {
				t.Fatalf("expected the address to be rejected: %q", tc.value)
			}
		})
	}
}

func TestValidateURLRejectsUnparseableValues(t *testing.T) {
	cases := []struct {
		name  string
		value string
	}{
		{"empty", ""},
		{"blank", "   "},
		{"free text", "see the chat for the link"},
		{"relative path", "/events/42"},
		{"scheme without host", "https://"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if _, err := ValidateURL("url", tc.value); err == nil {
				t.Fatalf("expected the address to be rejected: %q", tc.value)
			}
		})
	}
}
