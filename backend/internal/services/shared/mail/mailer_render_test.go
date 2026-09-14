package mail

import (
	"context"
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/locale"
)

func sendAll(t *testing.T, lang string) map[string]struct{ subject, text, html string } {
	t.Helper()
	out := make(map[string]struct{ subject, text, html string })
	cases := map[string]func(m *Mailer){
		"verification": func(m *Mailer) {
			m.SendVerification(context.Background(), "user@example.test", "Maria Ivanova", lang, "dark", "tok", 24*time.Hour, TelegramRecipient{})
		},
		"password_reset": func(m *Mailer) {
			m.SendPasswordReset(context.Background(), "user@example.test", "Maria Ivanova", lang, "dark", "tok", 2*time.Hour, TelegramRecipient{})
		},
		"email_change": func(m *Mailer) {
			m.SendEmailChange(context.Background(), "user@example.test", "Maria Ivanova", lang, "dark", "tok", 24*time.Hour)
		},
	}
	for name, send := range cases {
		sender := &recordingMailSender{}
		send(NewMailer(sender, nil, "https://timeline.test"))
		msg := sender.last(t)
		out[name] = struct{ subject, text, html string }{msg.Subject, msg.Body, msg.HTML}
	}
	return out
}

func TestEveryLetterCarriesBothAPlainTextAndAnHTMLPart(t *testing.T) {
	for _, lang := range []string{"ru", "en"} {
		for name, got := range sendAll(t, lang) {
			if strings.TrimSpace(got.text) == "" {
				t.Errorf("%s/%s has no plain-text part", lang, name)
			}
			if strings.Contains(got.text, "<") {
				t.Errorf("%s/%s leaks markup into the plain-text part:\n%s", lang, name, got.text)
			}
			if !strings.Contains(got.html, "<html") || !strings.Contains(got.html, "</html>") {
				t.Errorf("%s/%s has no HTML part", lang, name)
			}
		}
	}
}

func TestEveryLetterOffersTheLinkAsBothAButtonAndCopyableText(t *testing.T) {
	for _, lang := range []string{"ru", "en"} {
		for name, got := range sendAll(t, lang) {
			link := "https://timeline.test"
			if strings.Count(got.html, `href="`+link) < 2 {
				t.Errorf("%s/%s does not repeat the link outside the button; a client that "+
					"drops the button leaves the reader with nothing:\n%s", lang, name, got.html)
			}
			if !strings.Contains(got.text, link) {
				t.Errorf("%s/%s does not carry the link in the plain-text part", lang, name)
			}
		}
	}
}

func TestHTMLLettersStayReadableWithoutRemoteImages(t *testing.T) {
	for _, lang := range []string{"ru", "en"} {
		for name, got := range sendAll(t, lang) {
			for _, tag := range []string{"background-image", "<svg"} {
				if strings.Contains(got.html, tag) {
					t.Errorf("%s/%s depends on %q; a client that blocks images must still "+
						"show the whole letter", lang, name, tag)
				}
			}
			if !strings.Contains(got.html, `alt="Timeline"`) {
				t.Errorf("%s/%s: the logo image has no text alternative for blocked images", lang, name)
			}
			if !strings.Contains(got.html, "TIME") || !strings.Contains(got.html, "LINE") {
				t.Errorf("%s/%s: the brand name is not present as text next to the logo image", lang, name)
			}
		}
	}
}

func TestHTMLLettersUseExactlyOneImageForTheLogo(t *testing.T) {
	for _, lang := range []string{"ru", "en"} {
		for name, got := range sendAll(t, lang) {
			if strings.Count(got.html, "<img") != 1 {
				t.Errorf("%s/%s: expected exactly one image (the logo), got %d", lang, name,
					strings.Count(got.html, "<img"))
			}
		}
	}
}

func TestHTMLLettersUseTableLayoutAndInlineStyleThatMailClientsKeep(t *testing.T) {
	for _, lang := range []string{"ru", "en"} {
		for name, got := range sendAll(t, lang) {
			if strings.Contains(got.html, "display:flex") || strings.Contains(got.html, "display:grid") {
				t.Errorf("%s/%s uses a layout Outlook does not render", lang, name)
			}
			if !strings.Contains(got.html, "<table") {
				t.Errorf("%s/%s is not laid out with tables", lang, name)
			}
			if !strings.Contains(got.html, "width:600px") {
				t.Errorf("%s/%s is not held to the 600px mail width", lang, name)
			}
		}
	}
}

func TestHTMLLettersAdaptToADarkClient(t *testing.T) {
	for _, lang := range []string{"ru", "en"} {
		for name, got := range sendAll(t, lang) {
			if !strings.Contains(got.html, "prefers-color-scheme: light") {
				t.Errorf("%s/%s has no opposite light-theme block for a dark-by-default letter", lang, name)
			}
			if strings.Contains(got.html, "prefers-color-scheme: dark") {
				t.Errorf("%s/%s: dark is the default theme here, it must be inlined, not gated behind @media",
					lang, name)
			}
			if !strings.Contains(got.html, colorShellDark) {
				t.Errorf("%s/%s: the dark palette is not inlined as the default", lang, name)
			}
			if !strings.Contains(got.html, `name="color-scheme"`) {
				t.Errorf("%s/%s does not declare the colour schemes it supports, so a client "+
					"is free to invert it by force", lang, name)
			}
		}
	}
}

func TestLettersRenderEntirelyInTheRecipientLanguage(t *testing.T) {
	ru := sendAll(t, "ru")
	en := sendAll(t, "en")
	for name := range ru {
		if ru[name].subject == en[name].subject {
			t.Errorf("%s: both languages share a subject", name)
		}
		if ru[name].html == en[name].html {
			t.Errorf("%s: both languages share an HTML body", name)
		}
		if !strings.Contains(ru[name].html, `lang="ru"`) || !strings.Contains(en[name].html, `lang="en"`) {
			t.Errorf("%s: the document language is not the recipient language", name)
		}
	}
}

func TestNoLetterLeavesAnUnresolvedPlaceholderOrMissingKey(t *testing.T) {
	for _, lang := range []string{"ru", "en"} {
		for name, got := range sendAll(t, lang) {
			for _, part := range []string{got.subject, got.text, got.html} {
				if strings.Contains(part, "{{") {
					t.Errorf("%s/%s leaves an unsubstituted placeholder:\n%s", lang, name, part)
				}
			}
			if strings.Contains(got.text, "email.") {
				t.Errorf("%s/%s prints a dictionary key where the text should be:\n%s",
					lang, name, got.text)
			}
		}
	}
}

func TestDurationsDeclineInTheRecipientLanguage(t *testing.T) {
	cases := []struct {
		lang   string
		ttl    time.Duration
		unit   string
		form   string
		amount int
	}{
		{"ru", 24 * time.Hour, "duration.day", "one", 1},
		{"ru", 72 * time.Hour, "duration.day", "few", 3},
		{"ru", 5 * 24 * time.Hour, "duration.day", "many", 5},
		{"ru", 21 * 24 * time.Hour, "duration.day", "one", 21},
		{"ru", 11 * 24 * time.Hour, "duration.day", "many", 11},
		{"ru", 2 * time.Hour, "duration.hour", "few", 2},
		{"ru", 30 * time.Minute, "duration.minute", "many", 30},
		{"en", 24 * time.Hour, "duration.day", "one", 1},
		{"en", 72 * time.Hour, "duration.day", "many", 3},
		{"en", 2 * time.Hour, "duration.hour", "many", 2},
	}
	for _, tc := range cases {
		duration := fmt.Sprintf(locale.Message(tc.lang, tc.unit+"."+tc.form), tc.amount)
		want := locale.Message(tc.lang, "email.expiry", "ttl", duration)
		wrong := otherExpiries(t, tc.lang, tc.unit, tc.form, tc.amount, want)

		sender := &recordingMailSender{}
		mailer := NewMailer(sender, nil, "https://timeline.test")
		mailer.SendVerification(context.Background(), "user@example.test", "Maria", tc.lang, "dark", "tok", tc.ttl, TelegramRecipient{})
		got := sender.last(t)

		for _, part := range []string{got.Body, got.HTML} {
			if !strings.Contains(part, want) {
				t.Errorf("%s/%s: the letter does not say %q, the %q form of %q",
					tc.lang, tc.ttl, want, tc.form, tc.unit)
			}
			for _, other := range wrong {
				if strings.Contains(part, other) {
					t.Errorf("%s/%s: the letter says %q instead of the %q form %q",
						tc.lang, tc.ttl, other, tc.form, want)
				}
			}
		}
	}
}

func otherExpiries(t *testing.T, lang, unit, form string, amount int, want string) []string {
	t.Helper()
	var out []string
	for _, other := range []string{"one", "few", "many"} {
		if other == form {
			continue
		}
		duration := fmt.Sprintf(locale.Message(lang, unit+"."+other), amount)
		if sentence := locale.Message(lang, "email.expiry", "ttl", duration); sentence != want {
			out = append(out, sentence)
		}
	}
	if len(out) == 0 {
		t.Fatalf("%s: the %q forms of %q are indistinguishable, so this case proves nothing",
			lang, form, unit)
	}
	return out
}
