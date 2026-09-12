package email

import (
	"strings"
	"testing"

	"github.com/GoatWhistle/timeline/internal/config"
	"github.com/GoatWhistle/timeline/internal/models"
)

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
