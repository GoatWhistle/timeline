package mail

import (
	"context"
	"strings"
	"testing"
	"time"
)

func TestLightUserThemeInlinesLightAndGatesDarkBehindMedia(t *testing.T) {
	sender := &recordingMailSender{}
	mailer := NewMailer(sender, nil, "https://timeline.test")
	mailer.SendVerification(context.Background(), "user@example.test", "John", "en", "light", "tok", time.Hour,
		TelegramRecipient{})
	html := sender.last(t).HTML

	if !strings.Contains(html, "prefers-color-scheme: dark") {
		t.Error("a light-themed letter must still offer a dark block behind @media")
	}
	if strings.Contains(html, "prefers-color-scheme: light") {
		t.Error("light is the default theme here, it must not also be gated behind @media")
	}
	if !strings.Contains(html, colorShellLight) {
		t.Error("the light palette is not inlined as the default")
	}
}

func TestSystemUserThemeBehavesLikeDark(t *testing.T) {
	sender := &recordingMailSender{}
	mailer := NewMailer(sender, nil, "https://timeline.test")
	mailer.SendVerification(context.Background(), "user@example.test", "John", "en", "system", "tok", time.Hour,
		TelegramRecipient{})
	html := sender.last(t).HTML

	if !strings.Contains(html, colorShellDark) {
		t.Error("system theme must default to dark, matching users.theme semantics")
	}
	if !strings.Contains(html, "prefers-color-scheme: light") {
		t.Error("system theme must still offer a light block behind @media")
	}
}

func TestNoUserThemeDefaultsToDark(t *testing.T) {
	sender := &recordingMailSender{}
	mailer := NewMailer(sender, nil, "https://timeline.test")
	mailer.SendInvite(context.Background(), "new@example.test", "Admin", "en", "tok", time.Hour)
	html := sender.last(t).HTML

	if !strings.Contains(html, colorShellDark) {
		t.Error("an invite has no user yet, it must default to dark")
	}
}

func TestLogoURLPointsAtTheThemedAsset(t *testing.T) {
	sender := &recordingMailSender{}
	mailer := NewMailer(sender, nil, "https://timeline.test")

	mailer.SendVerification(context.Background(), "user@example.test", "John", "en", "light", "tok", time.Hour,
		TelegramRecipient{})
	if !strings.Contains(sender.last(t).HTML, "https://timeline.test/mail/logo-light.png") {
		t.Error("light-themed letter does not link the light logo asset")
	}

	mailer.SendVerification(context.Background(), "user@example.test", "John", "en", "dark", "tok", time.Hour,
		TelegramRecipient{})
	if !strings.Contains(sender.last(t).HTML, "https://timeline.test/mail/logo-dark.png") {
		t.Error("dark-themed letter does not link the dark logo asset")
	}
}
