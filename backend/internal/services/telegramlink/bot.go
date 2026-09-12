package telegramlink

import (
	"context"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

type UserFinder interface {
	GetByTelegramChatID(ctx context.Context, chatID string) (*models.User, error)
}

type MuteToggler interface {
	MuteTelegram(ctx context.Context, actor models.Actor) error
	UnmuteTelegram(ctx context.Context, actor models.Actor) error
}

type ScheduleLister interface {
	MySchedule(ctx context.Context, actor models.Actor, filter models.ScheduleFilter) (*dto.ScheduleResponse, error)
}

type StatusMarker interface {
	ResolveEventDisplayID(ctx context.Context, displayID string) (uuid.UUID, error)
	MarkDone(ctx context.Context, actor models.Actor, eventID uuid.UUID) (*dto.RegistrationStatusResponse, error)
}

type CallbackAnswerer interface {
	AnswerCallbackQuery(ctx context.Context, callbackQueryID, text string) error
}

type Bot struct {
	completer Completer
	users     UserFinder
	mute      MuteToggler
	schedule  ScheduleLister
	status    StatusMarker
	replier   Replier
	answerer  CallbackAnswerer
}

func NewBot(completer Completer, users UserFinder, mute MuteToggler, schedule ScheduleLister,
	status StatusMarker, replier Replier, answerer CallbackAnswerer) *Bot {
	return &Bot{
		completer: completer, users: users, mute: mute, schedule: schedule, status: status,
		replier: replier, answerer: answerer,
	}
}
