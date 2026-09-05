package email

import (
	"bytes"
	"context"
	"log/slog"
	"strings"
	"testing"

	"github.com/GoatWhistle/timeline/internal/config"
	"github.com/GoatWhistle/timeline/internal/models"
)

const resetBody = "Set a new password\n\nHello Ada,\n\nSomeone asked to recover access.\n\n" +
	"Set a new password:\nhttp://localhost:5173/reset-password?token=s3cr3t-token-value\n\n" +
	"The link is valid for 30 minutes.\n"

func capture(t *testing.T, sender Sender, msg models.OutboundMessage) string {
	t.Helper()
	var buf bytes.Buffer
	previous := slog.Default()
	slog.SetDefault(slog.New(slog.NewTextHandler(&buf, nil)))
	defer slog.SetDefault(previous)
	if err := sender.Send(context.Background(), msg); err != nil {
		t.Fatalf("the log transport rejected a deliverable message: %v", err)
	}
	return buf.String()
}

func resetMessage() models.OutboundMessage {
	return models.OutboundMessage{
		Recipient: "ada@example.test",
		Subject:   "Account recovery in Timeline",
		Body:      resetBody,
		HTML:      "<a href=\"http://localhost:5173/reset-password?token=s3cr3t-token-value\">go</a>",
	}
}

func TestNewFallsBackToTheLogTransportWithoutAnSMTPHost(t *testing.T) {
	if _, ok := New(config.Email{Host: ""}).(*logSender); !ok {
		t.Error("an empty SMTP host must not produce a sender that dials nowhere")
	}
	if _, ok := New(config.Email{Host: "smtp.example.test"}).(*smtpSender); !ok {
		t.Error("a configured SMTP host must still produce the SMTP sender")
	}
}

func TestLogTransportAcceptsDeliverableMailAndRejectsBadAddresses(t *testing.T) {
	sender := &logSender{dev: true}
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

func TestLogTransportNeverWritesTheMessageBody(t *testing.T) {
	for name, sender := range map[string]*logSender{
		"dev":        {dev: true},
		"production": {dev: false},
	} {
		t.Run(name, func(t *testing.T) {
			line := capture(t, sender, resetMessage())
			for _, leaked := range []string{"Hello Ada", "Someone asked to recover access",
				"The link is valid", "<a href="} {
				if strings.Contains(line, leaked) {
					t.Errorf("TestLogTransportNeverWritesTheMessageBody: the log carries the "+
						"message body, which puts personal text in every operator's reach: %q", leaked)
				}
			}
		})
	}
}

func TestLogTransportKeepsTheLinkReachableInDevelopment(t *testing.T) {
	line := capture(t, &logSender{dev: true}, resetMessage())
	if !strings.Contains(line, "http://localhost:5173/reset-password?token=s3cr3t-token-value") {
		t.Error("TestLogTransportKeepsTheLinkReachableInDevelopment: without the link a developer " +
			"cannot finish password recovery when SMTP is unconfigured")
	}
}

func TestLogTransportRedactsTheLinkOutsideDevelopment(t *testing.T) {
	line := capture(t, &logSender{dev: false}, resetMessage())
	if strings.Contains(line, "s3cr3t-token-value") {
		t.Error("TestLogTransportRedactsTheLinkOutsideDevelopment: a recovery token in a production " +
			"log hands account takeover to anyone who can read logs")
	}
	if !strings.Contains(line, redactedLink) {
		t.Errorf("TestLogTransportRedactsTheLinkOutsideDevelopment: the redaction marker must stay "+
			"visible so an operator sees mail is going nowhere: %s", line)
	}
}

func TestFirstLinkPicksTheActionURL(t *testing.T) {
	if got := FirstLink(resetBody); got != "http://localhost:5173/reset-password?token=s3cr3t-token-value" {
		t.Errorf("TestFirstLinkPicksTheActionURL: got %q", got)
	}
	if got := FirstLink("no link at all"); got != "" {
		t.Errorf("TestFirstLinkPicksTheActionURL: a body without a link must yield nothing, got %q", got)
	}
}
