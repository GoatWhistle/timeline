package email

import (
	"context"
	"testing"

	"github.com/GoatWhistle/timeline/internal/config"
	"github.com/GoatWhistle/timeline/internal/models"
)

func TestNewFallsBackToTheLogTransportWithoutAnSMTPHost(t *testing.T) {
	if _, ok := New(config.Email{Host: ""}).(*logSender); !ok {
		t.Error("an empty SMTP host must not produce a sender that dials nowhere")
	}
	if _, ok := New(config.Email{Host: "smtp.example.test"}).(*smtpSender); !ok {
		t.Error("a configured SMTP host must still produce the SMTP sender")
	}
}

func TestLogTransportAcceptsDeliverableMailAndRejectsBadAddresses(t *testing.T) {
	sender := &logSender{}
	if err := sender.Send(context.Background(), models.OutboundMessage{
		Recipient: "user@example.test", Subject: "s", Body: "b",
	}); err != nil {
		t.Errorf("the log transport must accept a deliverable message: %v", err)
	}
	if err := sender.Send(context.Background(), models.OutboundMessage{
		Recipient: "not-an-address", Subject: "s", Body: "b",
	}); err == nil {
		t.Error("the log transport must still reject an invalid recipient")
	}
}
