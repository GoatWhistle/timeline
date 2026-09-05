package email

import (
	"context"
	"log/slog"
	"strings"

	"github.com/GoatWhistle/timeline/internal/models"
)

const redactedLink = "[redacted]"

type logSender struct{ dev bool }

func (s *logSender) Send(ctx context.Context, msg models.OutboundMessage) error {
	if !validAddress(msg.Recipient) {
		return models.NewPermanentDeliveryError("invalid recipient address", nil)
	}
	slog.InfoContext(ctx, "email delivered to the log transport",
		"recipient", msg.Recipient, "subject", msg.Subject, "link", s.link(msg.Body))
	return nil
}

func (s *logSender) link(body string) string {
	link := FirstLink(body)
	if link == "" {
		return ""
	}
	if !s.dev {
		return redactedLink
	}
	return link
}

func FirstLink(body string) string {
	for _, field := range strings.Fields(body) {
		if strings.HasPrefix(field, "http://") || strings.HasPrefix(field, "https://") {
			return field
		}
	}
	return ""
}
