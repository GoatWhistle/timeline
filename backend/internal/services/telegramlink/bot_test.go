package telegramlink_test

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
	"github.com/GoatWhistle/timeline/internal/services/telegramlink"
)

func mustTime(t *testing.T, value string) time.Time {
	t.Helper()
	parsed, err := time.Parse(time.RFC3339, value)
	if err != nil {
		t.Fatalf("parsing time: %v", err)
	}
	return parsed
}

type fakeUsers struct {
	byChat map[string]*models.User
}

func (f *fakeUsers) GetByTelegramChatID(_ context.Context, chatID string) (*models.User, error) {
	if u, ok := f.byChat[chatID]; ok {
		return u, nil
	}
	return nil, models.ErrNotFound
}

type fakeMute struct{ muted, unmuted int }

func (f *fakeMute) MuteTelegram(context.Context, models.Actor) error   { f.muted++; return nil }
func (f *fakeMute) UnmuteTelegram(context.Context, models.Actor) error { f.unmuted++; return nil }

type fakeSchedule struct{ resp *dto.ScheduleResponse }

func (f *fakeSchedule) MySchedule(context.Context, models.Actor, models.ScheduleFilter,
) (*dto.ScheduleResponse, error) {
	return f.resp, nil
}

type fakeStatus struct {
	eventID    uuid.UUID
	resolveErr error
	markCalls  int
}

func (f *fakeStatus) ResolveEventDisplayID(context.Context, string) (uuid.UUID, error) {
	return f.eventID, f.resolveErr
}

func (f *fakeStatus) MarkDone(context.Context, models.Actor, uuid.UUID,
) (*dto.RegistrationStatusResponse, error) {
	f.markCalls++
	return &dto.RegistrationStatusResponse{Status: models.StatusDONE}, nil
}

type fakeReplier struct{ sent []models.OutboundMessage }

func (f *fakeReplier) Send(_ context.Context, msg models.OutboundMessage) error {
	f.sent = append(f.sent, msg)
	return nil
}

type fakeAnswerer struct{ answered []string }

func (f *fakeAnswerer) AnswerCallbackQuery(_ context.Context, callbackQueryID, _ string) error {
	f.answered = append(f.answered, callbackQueryID)
	return nil
}

type fakeCompleter struct{}

func (fakeCompleter) CompleteTelegramLink(context.Context, string, string, *string) error { return nil }

func chatMessage(chatID int64, text string) *telegramlink.Message {
	return &telegramlink.Message{Text: &text, Chat: telegramlink.Chat{ID: chatID, Type: "private"}}
}

func newTestBot(userID uuid.UUID, status *fakeStatus, mute *fakeMute,
	schedule *fakeSchedule, replier *fakeReplier, answerer *fakeAnswerer) *telegramlink.Bot {
	users := &fakeUsers{byChat: map[string]*models.User{
		"42": {ID: userID},
	}}
	return telegramlink.NewBot(fakeCompleter{}, users, mute, schedule, status, replier, answerer)
}

func TestStatusListsUpcomingDeadlines(t *testing.T) {
	deadline := mustTime(t, "2026-10-01T12:00:00Z")
	schedule := &fakeSchedule{resp: &dto.ScheduleResponse{Rows: []dto.ScheduleRow{
		{Title: "Demo Day", RegistrationDeadline: &deadline},
	}}}
	replier := &fakeReplier{}
	bot := newTestBot(uuid.New(), &fakeStatus{}, &fakeMute{}, schedule, replier, &fakeAnswerer{})

	if err := bot.Handle(context.Background(), telegramlink.Update{
		Message: chatMessage(42, "/status"),
	}); err != nil {
		t.Fatalf("handling: %v", err)
	}
	if len(replier.sent) != 1 || !strings.Contains(replier.sent[0].Body, "Demo Day") {
		t.Fatalf("status reply = %+v", replier.sent)
	}
}

func TestStatusRepliesEmptyWhenNoDeadlines(t *testing.T) {
	schedule := &fakeSchedule{resp: &dto.ScheduleResponse{}}
	replier := &fakeReplier{}
	bot := newTestBot(uuid.New(), &fakeStatus{}, &fakeMute{}, schedule, replier, &fakeAnswerer{})

	if err := bot.Handle(context.Background(), telegramlink.Update{
		Message: chatMessage(42, "/status"),
	}); err != nil {
		t.Fatalf("handling: %v", err)
	}
	if len(replier.sent) != 1 {
		t.Fatalf("expected one reply, got %d", len(replier.sent))
	}
}

func TestMuteAndUnmuteToggleNotifications(t *testing.T) {
	mute := &fakeMute{}
	replier := &fakeReplier{}
	bot := newTestBot(uuid.New(), &fakeStatus{}, mute, &fakeSchedule{resp: &dto.ScheduleResponse{}},
		replier, &fakeAnswerer{})

	if err := bot.Handle(context.Background(), telegramlink.Update{Message: chatMessage(42, "/mute")}); err != nil {
		t.Fatalf("mute: %v", err)
	}
	if err := bot.Handle(context.Background(), telegramlink.Update{Message: chatMessage(42, "/unmute")}); err != nil {
		t.Fatalf("unmute: %v", err)
	}
	if mute.muted != 1 || mute.unmuted != 1 {
		t.Fatalf("mute=%d unmute=%d", mute.muted, mute.unmuted)
	}
	if len(replier.sent) != 2 {
		t.Fatalf("expected two replies, got %d", len(replier.sent))
	}
}

func TestHelpListsCommands(t *testing.T) {
	replier := &fakeReplier{}
	bot := newTestBot(uuid.New(), &fakeStatus{}, &fakeMute{}, &fakeSchedule{resp: &dto.ScheduleResponse{}},
		replier, &fakeAnswerer{})

	if err := bot.Handle(context.Background(), telegramlink.Update{Message: chatMessage(42, "/help")}); err != nil {
		t.Fatalf("help: %v", err)
	}
	if len(replier.sent) != 1 || !strings.Contains(replier.sent[0].Body, "/status") {
		t.Fatalf("help reply = %+v", replier.sent)
	}
}

func TestUnlinkedChatIsToldToLinkFirst(t *testing.T) {
	replier := &fakeReplier{}
	users := &fakeUsers{byChat: map[string]*models.User{}}
	bot := telegramlink.NewBot(fakeCompleter{}, users, &fakeMute{}, &fakeSchedule{resp: &dto.ScheduleResponse{}},
		&fakeStatus{}, replier, &fakeAnswerer{})

	if err := bot.Handle(context.Background(), telegramlink.Update{Message: chatMessage(99, "/status")}); err != nil {
		t.Fatalf("handling: %v", err)
	}
	if len(replier.sent) != 1 {
		t.Fatalf("expected a not-linked reply, got %+v", replier.sent)
	}
}
