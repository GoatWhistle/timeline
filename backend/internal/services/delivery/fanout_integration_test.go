//go:build integration

package delivery_test

import (
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/models"
)

func TestTwoSelectedChannelsProduceTwoNotifications(t *testing.T) {
	w := newWorld(t)
	w.setChannels(true, true)
	r := newRig(t, w, newSender(), newSender())
	r.clock.at = w.DeadlineAt.Add(-30 * time.Minute)

	result := r.reconcile()
	if result.Primary != 2 {
		t.Fatalf("selecting both channels must create two primary notifications, got %+v", result)
	}
	if got := w.countAll(); got != 2 {
		t.Fatalf("expected two notification rows, got %d (%v)", got, w.keys())
	}

	telegramRow := r.byKey(r.primaryKey(models.ChannelTelegram))
	emailRow := r.byKey(r.primaryKey(models.ChannelEmail))
	if telegramRow.RequestedChannel != models.ChannelTelegram {
		t.Fatalf("expected the telegram row to request TELEGRAM, got %s", telegramRow.RequestedChannel)
	}
	if emailRow.RequestedChannel != models.ChannelEmail {
		t.Fatalf("expected the email row to request EMAIL, got %s", emailRow.RequestedChannel)
	}

	again := r.reconcile()
	if again.Primary != 0 {
		t.Fatalf("a repeated pass must not duplicate either channel's row: %+v", again)
	}
	if got := w.countAll(); got != 2 {
		t.Fatalf("expected exactly two rows after a repeated pass, got %d", got)
	}
}
