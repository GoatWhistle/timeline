package email

import (
	"context"
	"log/slog"

	"github.com/GoatWhistle/timeline/internal/models"
)

type logSender struct{}

func (s *logSender) Send(ctx context.Context, msg models.OutboundMessage) error {
	if !validAddress(msg.Recipient) {
		return models.NewPermanentDeliveryError("invalid recipient address", nil)
	}
	slog.InfoContext(ctx, "email delivered to the log transport",
		"recipient", msg.Recipient, "subject", msg.Subject, "body", msg.Body)
	return nil
}
