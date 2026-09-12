package email

import (
	"context"
	"crypto/rand"
	"crypto/tls"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"mime"
	"net"
	"net/smtp"
	"net/textproto"
	"strings"
	"time"

	"github.com/GoatWhistle/timeline/internal/config"
	"github.com/GoatWhistle/timeline/internal/models"
)

type Sender interface {
	Send(ctx context.Context, msg models.OutboundMessage) error
}

func New(cfg config.Email) Sender {
	if cfg.Host == "" {
		dev := cfg.Env == "dev"
		slog.Warn("SMTP_HOST is empty: mail is written to the log instead of being sent",
			"env", cfg.Env, "links_logged", dev)
		return &logSender{dev: dev}
	}
	return &smtpSender{cfg: cfg}
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
	defer func() {
		if err := client.Quit(); err != nil {
			slog.WarnContext(ctx, "SMTP session did not close cleanly", "error", err)
		}
	}()

	if err := s.negotiate(client); err != nil {
		return err
	}
	return s.transmit(client, msg)
}

func (s *smtpSender) negotiate(client *smtp.Client) error {
	if s.cfg.StartTLS {
		if ok, _ := client.Extension("STARTTLS"); ok {
			if err := client.StartTLS(&tls.Config{ServerName: s.cfg.Host, MinVersion: tls.VersionTLS12}); err != nil {
				return models.NewTemporaryDeliveryError("failed to establish TLS", err)
			}
		}
	}
	if s.cfg.Username == "" {
		return nil
	}
	auth := smtp.PlainAuth("", s.cfg.Username, s.cfg.Password, s.cfg.Host)
	if err := client.Auth(auth); err != nil {
		return classify(err, "SMTP authentication rejected")
	}
	return nil
}

func (s *smtpSender) transmit(client *smtp.Client, msg models.OutboundMessage) error {
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
	fmt.Fprintf(&b, "Date: %s\r\n", time.Now().Format(time.RFC1123Z))
	fmt.Fprintf(&b, "Message-ID: <%s@%s>\r\n", s.messageID(msg), senderDomain(s.cfg.From))
	b.WriteString("MIME-Version: 1.0\r\n")
	if msg.HTML == "" {
		b.WriteString("Content-Type: text/plain; charset=UTF-8\r\n")
		b.WriteString("Content-Transfer-Encoding: 8bit\r\n\r\n")
		b.WriteString(msg.Body)
		b.WriteString("\r\n")
		return b.String()
	}
	boundary := alternativeBoundary()
	fmt.Fprintf(&b, "Content-Type: multipart/alternative; boundary=%q\r\n\r\n", boundary)
	writePart(&b, boundary, "text/plain; charset=UTF-8", msg.Body)
	writePart(&b, boundary, "text/html; charset=UTF-8", msg.HTML)
	fmt.Fprintf(&b, "--%s--\r\n", boundary)
	return b.String()
}

func writePart(b *strings.Builder, boundary, contentType, content string) {
	fmt.Fprintf(b, "--%s\r\n", boundary)
	fmt.Fprintf(b, "Content-Type: %s\r\n", contentType)
	b.WriteString("Content-Transfer-Encoding: 8bit\r\n\r\n")
	b.WriteString(strings.ReplaceAll(strings.ReplaceAll(content, "\r\n", "\n"), "\n", "\r\n"))
	b.WriteString("\r\n")
}

func (s *smtpSender) messageID(msg models.OutboundMessage) string {
	if msg.IdempotencyKey != "" {
		return msg.IdempotencyKey
	}
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return fmt.Sprint(time.Now().UnixNano())
	}
	return hex.EncodeToString(buf)
}

func senderDomain(from string) string {
	at := strings.LastIndex(from, "@")
	if at < 0 || at == len(from)-1 {
		return "localhost"
	}
	return from[at+1:]
}

func alternativeBoundary() string {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "tl-boundary-fallback-separator"
	}
	return "tl-" + hex.EncodeToString(buf)
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
