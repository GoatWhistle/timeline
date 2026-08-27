package email

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"log/slog"
	"mime"
	"net"
	"net/smtp"
	"net/textproto"
	"strings"
	"time"

	"github.com/kaifarikman/hackathon-os-backend/internal/config"
	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

type Sender interface {
	Send(ctx context.Context, msg models.OutboundMessage) error
}

func New(cfg config.Email) Sender {
	if cfg.Driver == "smtp" {
		return &smtpSender{cfg: cfg}
	}
	return &logSender{from: cfg.From}
}

type logSender struct{ from string }

func (s *logSender) Send(ctx context.Context, msg models.OutboundMessage) error {
	slog.InfoContext(ctx, "email not sent: log driver active",
		"from", s.from, "to", msg.Recipient, "subject", msg.Subject,
		"idempotency_key", msg.IdempotencyKey)
	return nil
}

type smtpSender struct{ cfg config.Email }

func (s *smtpSender) Send(ctx context.Context, msg models.OutboundMessage) error {
	if !validAddress(msg.Recipient) {
		return models.NewPermanentDeliveryError("invalid recipient address", nil)
	}

	addr := net.JoinHostPort(s.cfg.Host, fmt.Sprint(s.cfg.Port))
	dialer := &net.Dialer{Timeout: s.cfg.Timeout}
	conn, err := dialer.DialContext(ctx, "tcp", addr)
	if err != nil {
		return models.NewTemporaryDeliveryError("failed to connect to the SMTP server", err)
	}
	defer conn.Close()
	if deadline, ok := ctx.Deadline(); ok {
		_ = conn.SetDeadline(deadline)
	} else {
		_ = conn.SetDeadline(time.Now().Add(s.cfg.Timeout))
	}

	client, err := smtp.NewClient(conn, s.cfg.Host)
	if err != nil {
		return models.NewTemporaryDeliveryError("failed to start the SMTP session", err)
	}
	defer client.Quit()

	if s.cfg.StartTLS {
		if ok, _ := client.Extension("STARTTLS"); ok {
			if err := client.StartTLS(&tls.Config{ServerName: s.cfg.Host, MinVersion: tls.VersionTLS12}); err != nil {
				return models.NewTemporaryDeliveryError("failed to establish TLS", err)
			}
		}
	}
	if s.cfg.Username != "" {
		auth := smtp.PlainAuth("", s.cfg.Username, s.cfg.Password, s.cfg.Host)
		if err := client.Auth(auth); err != nil {
			return classify(err, "SMTP authentication rejected")
		}
	}
	if err := client.Mail(s.cfg.From); err != nil {
		return classify(err, "sender rejected")
	}
	if err := client.Rcpt(msg.Recipient); err != nil {
		return classify(err, "recipient rejected")
	}
	writer, err := client.Data()
	if err != nil {
		return classify(err, "server rejected the data transfer")
	}
	if _, err := writer.Write([]byte(s.compose(msg))); err != nil {
		return models.NewTemporaryDeliveryError("failed to write the message", err)
	}
	if err := writer.Close(); err != nil {
		return classify(err, "server rejected the message")
	}
	return nil
}

func (s *smtpSender) compose(msg models.OutboundMessage) string {
	var b strings.Builder
	fmt.Fprintf(&b, "From: %s <%s>\r\n", mime.QEncoding.Encode("utf-8", s.cfg.FromName), s.cfg.From)
	fmt.Fprintf(&b, "To: %s\r\n", msg.Recipient)
	fmt.Fprintf(&b, "Subject: %s\r\n", mime.QEncoding.Encode("utf-8", msg.Subject))
	if msg.IdempotencyKey != "" {
		fmt.Fprintf(&b, "Message-ID: <%s@event-tracker>\r\n", msg.IdempotencyKey)
	}
	b.WriteString("MIME-Version: 1.0\r\n")
	b.WriteString("Content-Type: text/plain; charset=UTF-8\r\n")
	b.WriteString("Content-Transfer-Encoding: 8bit\r\n\r\n")
	b.WriteString(msg.Body)
	b.WriteString("\r\n")
	return b.String()
}

func classify(err error, reason string) error {
	var protoErr *textproto.Error
	if errors.As(err, &protoErr) && protoErr.Code >= 500 && protoErr.Code < 600 {
		return models.NewPermanentDeliveryError(reason, err)
	}
	return models.NewTemporaryDeliveryError(reason, err)
}

func validAddress(addr string) bool {
	at := strings.LastIndex(addr, "@")
	if at <= 0 || at == len(addr)-1 {
		return false
	}
	return !strings.ContainsAny(addr, " \r\n")
}
