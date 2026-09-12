package email

import (
	"io"
	"mime"
	"mime/multipart"
	"net/mail"
	"strings"
	"testing"

	"github.com/GoatWhistle/timeline/internal/config"
	"github.com/GoatWhistle/timeline/internal/models"
)

func parts(t *testing.T, raw string) map[string]string {
	t.Helper()
	msg, err := mail.ReadMessage(strings.NewReader(raw))
	if err != nil {
		t.Fatalf("the composed message does not parse as mail: %v", err)
	}
	mediaType, params, err := mime.ParseMediaType(msg.Header.Get("Content-Type"))
	if err != nil {
		t.Fatalf("the Content-Type does not parse: %v", err)
	}
	found := make(map[string]string)
	if !strings.HasPrefix(mediaType, "multipart/") {
		found[mediaType] = readAll(t, msg.Body)
		return found
	}
	if mediaType != "multipart/alternative" {
		t.Errorf("a letter with two renderings must be multipart/alternative, got %q", mediaType)
	}
	reader := multipart.NewReader(msg.Body, params["boundary"])
	for {
		part, err := reader.NextPart()
		if err == io.EOF {
			break
		}
		if err != nil {
			t.Fatalf("a part does not parse: %v", err)
		}
		partType, _, err := mime.ParseMediaType(part.Header.Get("Content-Type"))
		if err != nil {
			t.Fatalf("a part Content-Type does not parse: %v", err)
		}
		found[partType] = readAll(t, part)
	}
	return found
}

func readAll(t *testing.T, r io.Reader) string {
	t.Helper()
	body, err := io.ReadAll(r)
	if err != nil {
		t.Fatal(err)
	}
	return string(body)
}

func TestAnHTMLLetterIsSentAsMultipartAlternativeWithTextFirst(t *testing.T) {
	sender := &smtpSender{cfg: config.Email{From: "no-reply@example.test", FromName: "Timeline"}}
	raw := sender.compose(models.OutboundMessage{
		Recipient: "user@example.test",
		Subject:   "Subject",
		Body:      "plain body",
		HTML:      "<html><body>rich body</body></html>",
	})

	found := parts(t, raw)
	if got := found["text/plain"]; !strings.Contains(got, "plain body") {
		t.Errorf("the plain-text part is missing or wrong: %q", got)
	}
	if got := found["text/html"]; !strings.Contains(got, "rich body") {
		t.Errorf("the HTML part is missing or wrong: %q", got)
	}
	if strings.Index(raw, "text/plain") > strings.Index(raw, "text/html") {
		t.Error("the HTML part precedes the plain-text part; a client picks the last it understands, " +
			"so the fallback must come first")
	}
}

func TestALetterWithoutHTMLStaysASinglePlainTextMessage(t *testing.T) {
	sender := &smtpSender{cfg: config.Email{From: "no-reply@example.test", FromName: "Timeline"}}
	raw := sender.compose(models.OutboundMessage{
		Recipient: "user@example.test",
		Subject:   "Subject",
		Body:      "plain body",
	})

	found := parts(t, raw)
	if _, ok := found["text/plain"]; !ok {
		t.Errorf("a plain letter must stay text/plain: %q", raw)
	}
	if strings.Contains(raw, "multipart") {
		t.Error("a letter with no HTML must not be wrapped in multipart")
	}
}

func TestAPartIsNeverCutShortByItsOwnSeparator(t *testing.T) {
	sender := &smtpSender{cfg: config.Email{From: "no-reply@example.test", FromName: "Timeline"}}
	raw := sender.compose(models.OutboundMessage{
		Recipient: "user@example.test",
		Subject:   "Subject",
		Body:      "plain body",
		HTML:      "<html><body>rich body</body></html>",
	})
	found := parts(t, raw)
	if got := found["text/plain"]; got != "plain body" {
		t.Errorf("the plain part is not delivered exactly: %q", got)
	}
	if got := found["text/html"]; got != "<html><body>rich body</body></html>" {
		t.Errorf("the HTML part is not delivered exactly: %q", got)
	}
}

func TestALetterCarriesDateAndMessageIDInBothRenderings(t *testing.T) {
	sender := &smtpSender{cfg: config.Email{From: "no-reply@example.test", FromName: "Timeline"}}
	cases := map[string]models.OutboundMessage{
		"plain": {Recipient: "user@example.test", Subject: "Subject", Body: "plain body"},
		"multipart": {
			Recipient: "user@example.test",
			Subject:   "Subject",
			Body:      "plain body",
			HTML:      "<html><body>rich body</body></html>",
		},
	}
	for name, message := range cases {
		t.Run(name, func(t *testing.T) {
			msg, err := mail.ReadMessage(strings.NewReader(sender.compose(message)))
			if err != nil {
				t.Fatalf("the composed message does not parse as mail: %v", err)
			}
			if _, err := msg.Header.Date(); err != nil {
				t.Errorf("RFC 5322 makes Date mandatory and filters treat a letter without it "+
					"as spam: %v", err)
			}
			id := msg.Header.Get("Message-ID")
			if id == "" {
				t.Fatal("every letter must carry a Message-ID, not only the idempotent ones")
			}
			if !strings.HasSuffix(id, "@example.test>") {
				t.Errorf("the Message-ID must end in the sender domain, got %q", id)
			}
		})
	}
}

func TestTheMessageIDKeepsTheIdempotencyKeyWhenThereIsOne(t *testing.T) {
	sender := &smtpSender{cfg: config.Email{From: "no-reply@example.test", FromName: "Timeline"}}
	raw := sender.compose(models.OutboundMessage{
		Recipient:      "user@example.test",
		Subject:        "Subject",
		Body:           "plain body",
		IdempotencyKey: "notification-42",
	})
	msg, err := mail.ReadMessage(strings.NewReader(raw))
	if err != nil {
		t.Fatalf("the composed message does not parse as mail: %v", err)
	}
	if got := msg.Header.Get("Message-ID"); got != "<notification-42@example.test>" {
		t.Errorf("the idempotency key must survive into the Message-ID, got %q", got)
	}
}
