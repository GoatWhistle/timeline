package telegramlink

import (
	"context"
	"log/slog"
	"strconv"
	"strings"
	"time"

	"github.com/GoatWhistle/timeline/internal/locale"
	"github.com/GoatWhistle/timeline/internal/models"
)

type command string

const (
	cmdStart  command = "start"
	cmdStatus command = "status"
	cmdMute   command = "mute"
	cmdUnmute command = "unmute"
	cmdHelp   command = "help"
)

const scheduleHorizon = 90 * 24 * time.Hour

const (
	keyStatusEmpty = "notification.telegram.status.empty"
	keyStatusLine  = "notification.telegram.status.line"
	keyMuted       = "notification.telegram.muted"
	keyUnmuted     = "notification.telegram.unmuted"
	keyNotLinked   = "notification.telegram.not_linked"
)

func parseCommand(message *Message) (command, bool) {
	if message == nil || message.Text == nil || message.Chat.Type != "private" {
		return "", false
	}
	parts := strings.Fields(*message.Text)
	if len(parts) == 0 {
		return "", false
	}
	name := strings.TrimPrefix(strings.SplitN(parts[0], "@", 2)[0], "/")
	switch name {
	case "start":
		return cmdStart, true
	case "status":
		return cmdStatus, true
	case "mute":
		return cmdMute, true
	case "unmute":
		return cmdUnmute, true
	case "help":
		return cmdHelp, true
	}
	return "", false
}

func (b *Bot) resolveActor(ctx context.Context, message *Message) (models.Actor, bool) {
	user, err := b.users.GetByTelegramChatID(ctx, strconv.FormatInt(message.Chat.ID, 10))
	if err != nil {
		reply(ctx, b.replier, message, keyNotLinked)
		return models.Actor{}, false
	}
	return models.Actor{UserID: user.ID}, true
}

func (b *Bot) handleStatus(ctx context.Context, message *Message) error {
	actor, ok := b.resolveActor(ctx, message)
	if !ok {
		return nil
	}
	lang := messageLang(message)
	now := time.Now().UTC()
	resp, err := b.schedule.MySchedule(ctx, actor, models.ScheduleFilter{
		From: now, To: now.Add(scheduleHorizon),
	})
	if err != nil {
		return err
	}
	lines := make([]string, 0, len(resp.Rows))
	for _, row := range resp.Rows {
		if row.RegistrationDeadline == nil {
			continue
		}
		lines = append(lines, locale.Message(lang, keyStatusLine,
			"title", row.Title, "deadline", row.RegistrationDeadline.Format("02.01.2006 15:04")))
	}
	body := locale.Message(lang, keyStatusEmpty)
	if len(lines) > 0 {
		body = strings.Join(lines, "\n")
	}
	send(ctx, b.replier, message, body)
	return nil
}

func (b *Bot) handleMute(ctx context.Context, message *Message, muted bool) error {
	actor, ok := b.resolveActor(ctx, message)
	if !ok {
		return nil
	}
	var err error
	if muted {
		err = b.mute.MuteTelegram(ctx, actor)
	} else {
		err = b.mute.UnmuteTelegram(ctx, actor)
	}
	if err != nil {
		return err
	}
	key := keyUnmuted
	if muted {
		key = keyMuted
	}
	reply(ctx, b.replier, message, key)
	return nil
}

func messageLang(message *Message) string {
	if message == nil || message.From == nil {
		return ""
	}
	lang, _, _ := strings.Cut(message.From.LanguageCode, "-")
	return lang
}

func send(ctx context.Context, replier Replier, message *Message, body string) {
	if replier == nil || message == nil || message.Chat.ID <= 0 || message.Chat.Type != "private" {
		return
	}
	err := replier.Send(ctx, models.OutboundMessage{
		Recipient: strconv.FormatInt(message.Chat.ID, 10),
		Body:      body,
	})
	if err != nil {
		slog.WarnContext(ctx, "could not answer in Telegram", "error", err)
	}
}
