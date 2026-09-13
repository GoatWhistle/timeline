//go:build integration

package delivery_test

import (
	"strings"
	"testing"

	"github.com/GoatWhistle/timeline/internal/models"
)

func TestTelegramDeliveryUsesHTMLWithHeadingDeadlineAndOpenButton(t *testing.T) {
	w := newWorld(t)
	w.cfg.App.PublicURL = "https://timeline.example"
	w.setChannels(true, false)
	telegram, email := newSender(), newSender()
	r, n := seedOneDue(t, w, telegram, email)

	if n.RequestedChannel != models.ChannelTelegram {
		t.Fatalf("expected requested_channel TELEGRAM, got %s", n.RequestedChannel)
	}

	r.work()

	if telegram.count() != 1 {
		t.Fatalf("expected exactly one telegram call, got %d", telegram.count())
	}
	msg := telegram.last()
	if !msg.TelegramHTML {
		t.Fatalf("telegram message must be sent with HTML formatting: %+v", msg)
	}
	if !strings.Contains(msg.Body, "<b>") {
		t.Fatalf("telegram message is missing a bold heading: %q", msg.Body)
	}
	if !strings.Contains(msg.Body, "Test event") {
		t.Fatalf("telegram message is missing the event title: %q", msg.Body)
	}
	if !strings.Contains(msg.Body, "Deadline:") {
		t.Fatalf("telegram message is missing the deadline line: %q", msg.Body)
	}
	if msg.OpenURL == "" || !strings.Contains(msg.OpenURL, "https://timeline.example/events/") {
		t.Fatalf("telegram message is missing the event open link: %q", msg.OpenURL)
	}
	if msg.OpenText == "" {
		t.Fatalf("telegram message is missing the open button text")
	}
	if msg.ButtonData == "" {
		t.Fatalf("telegram message is missing the mark-registered button")
	}
}

func TestEmailDeliveryUsesTheSharedHTMLTemplateNotTelegramMarkup(t *testing.T) {
	w := newWorld(t)
	w.cfg.App.PublicURL = "https://timeline.example"
	w.setChannels(false, true)
	telegram, email := newSender(), newSender()
	r, n := seedOneDue(t, w, telegram, email)
	if n.RequestedChannel != models.ChannelEmail {
		t.Fatalf("expected requested_channel EMAIL, got %s", n.RequestedChannel)
	}

	r.work()

	if email.count() != 1 {
		t.Fatalf("expected exactly one email call, got %d", email.count())
	}
	msg := email.last()
	if msg.TelegramHTML {
		t.Fatalf("email delivery must not carry the telegram HTML flag: %+v", msg)
	}
	if msg.Subject == "" {
		t.Fatalf("email delivery must keep its subject line")
	}
	if !strings.Contains(msg.HTML, "<html") || !strings.Contains(msg.HTML, "</html>") {
		t.Fatalf("email delivery must render the shared HTML letter template: %q", msg.HTML)
	}
	if !strings.Contains(msg.HTML, "Test event") {
		t.Fatalf("email HTML is missing the event title: %q", msg.HTML)
	}
	if strings.Contains(msg.HTML, "<b>") {
		t.Fatalf("email HTML must not carry telegram-specific bold markup: %q", msg.HTML)
	}
	if msg.UnsubscribeURL == "" {
		t.Fatalf("email delivery must carry an unsubscribe link for the List-Unsubscribe header")
	}
	if !strings.Contains(msg.UnsubscribeURL, "https://timeline.example/catalog") {
		t.Fatalf("unsubscribe url does not point at the notification settings: %q", msg.UnsubscribeURL)
	}
}

func TestDeliveryIdentifiesMailByTheExternalNotificationID(t *testing.T) {
	w := newWorld(t)
	w.cfg.App.PublicURL = "https://timeline.example"
	w.setChannels(false, true)
	telegram, email := newSender(), newSender()
	r, n := seedOneDue(t, w, telegram, email)

	r.work()

	if email.count() != 1 {
		t.Fatalf("expected exactly one email call, got %d", email.count())
	}
	key := email.last().IdempotencyKey
	if key == n.ID.String() {
		t.Fatalf("TestDeliveryIdentifiesMailByTheExternalNotificationID: the internal UUID reaches "+
			"the Message-ID header of every notification email: %q", key)
	}
	if key != n.DisplayID {
		t.Fatalf("TestDeliveryIdentifiesMailByTheExternalNotificationID: mail must be identified by "+
			"the external display id so retries stay deduplicated, got %q want %q", key, n.DisplayID)
	}
}
