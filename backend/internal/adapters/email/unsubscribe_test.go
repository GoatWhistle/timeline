package email

import (
	"regexp"
	"strings"
	"testing"

	"github.com/GoatWhistle/timeline/internal/config"
	"github.com/GoatWhistle/timeline/internal/models"
)

var internalUUID = regexp.MustCompile(
	`[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}`)

func TestListUnsubscribeHeaderIsSetWhenAnURLIsProvided(t *testing.T) {
	sender := &smtpSender{cfg: config.Email{From: "no-reply@example.test", FromName: "Timeline"}}
	raw := sender.compose(models.OutboundMessage{
		Recipient:      "user@example.test",
		Subject:        "Subject",
		Body:           "plain body",
		UnsubscribeURL: "https://timeline.test/catalog?settings=notifications",
	})

	if !strings.Contains(raw, "List-Unsubscribe: <https://timeline.test/catalog?settings=notifications>\r\n") {
		t.Errorf("the List-Unsubscribe header is missing or malformed:\n%s", raw)
	}
}

func TestListUnsubscribeHeaderIsAbsentWithoutAnURL(t *testing.T) {
	sender := &smtpSender{cfg: config.Email{From: "no-reply@example.test", FromName: "Timeline"}}
	raw := sender.compose(models.OutboundMessage{
		Recipient: "user@example.test",
		Subject:   "Subject",
		Body:      "plain body",
	})

	if strings.Contains(raw, "List-Unsubscribe") {
		t.Errorf("a letter with no unsubscribe link must not send the header:\n%s", raw)
	}
}

func TestMessageIDNeverCarriesAnInternalUUID(t *testing.T) {
	sender := &smtpSender{cfg: config.Email{From: "no-reply@example.test", FromName: "Timeline"}}
	raw := sender.compose(models.OutboundMessage{
		Recipient:      "user@example.test",
		Subject:        "Subject",
		Body:           "plain body",
		IdempotencyKey: "nt_abc123def456",
	})

	if !strings.Contains(raw, "Message-ID: <nt_abc123def456@example.test>\r\n") {
		t.Errorf("TestMessageIDNeverCarriesAnInternalUUID: the external identifier must reach the "+
			"Message-ID header so delivery stays idempotent:\n%s", raw)
	}

	for _, line := range strings.Split(raw, "\r\n") {
		if !strings.HasPrefix(line, "Message-ID:") {
			continue
		}
		if internalUUID.MatchString(line) {
			t.Errorf("TestMessageIDNeverCarriesAnInternalUUID: an internal UUID reached a header "+
				"every recipient and every relay can read: %s", line)
		}
	}
}
