package telegramlink_test

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
	"github.com/GoatWhistle/timeline/internal/services/telegramlink"
)

func TestRegistrationButtonMarksDoneAndAnswersTheCallback(t *testing.T) {
	eventID := uuid.New()
	status := &fakeStatus{eventID: eventID}
	answerer := &fakeAnswerer{}
	bot := newTestBot(uuid.New(), status, &fakeMute{}, &fakeSchedule{resp: &dto.ScheduleResponse{}},
		&fakeReplier{}, answerer)

	update := telegramlink.Update{CallbackQuery: &telegramlink.CallbackQuery{
		ID:      "cb-1",
		Data:    telegramlink.RegistrationDoneCallbackData("ev_abc123"),
		Message: chatMessage(42, ""),
	}}
	if err := bot.Handle(context.Background(), update); err != nil {
		t.Fatalf("handling: %v", err)
	}
	if status.markCalls != 1 {
		t.Fatalf("MarkDone calls = %d, want 1", status.markCalls)
	}
	if len(answerer.answered) != 1 || answerer.answered[0] != "cb-1" {
		t.Fatalf("callback was not answered: %+v", answerer.answered)
	}
}

func TestRegistrationButtonPressedTwiceStaysIdempotentAndAlwaysAnswers(t *testing.T) {
	status := &fakeStatus{eventID: uuid.New()}
	answerer := &fakeAnswerer{}
	bot := newTestBot(uuid.New(), status, &fakeMute{}, &fakeSchedule{resp: &dto.ScheduleResponse{}},
		&fakeReplier{}, answerer)

	update := telegramlink.Update{CallbackQuery: &telegramlink.CallbackQuery{
		ID:      "cb-1",
		Data:    telegramlink.RegistrationDoneCallbackData("ev_abc123"),
		Message: chatMessage(42, ""),
	}}
	if err := bot.Handle(context.Background(), update); err != nil {
		t.Fatalf("first press: %v", err)
	}
	update.CallbackQuery.ID = "cb-2"
	if err := bot.Handle(context.Background(), update); err != nil {
		t.Fatalf("second press: %v", err)
	}
	if status.markCalls != 2 {
		t.Fatalf("MarkDone should be called on every press (idempotent downstream), got %d", status.markCalls)
	}
	if len(answerer.answered) != 2 {
		t.Fatalf("both presses must be answered, got %+v", answerer.answered)
	}
}

func TestCallbackFromUnlinkedChatIsAnsweredWithFailure(t *testing.T) {
	status := &fakeStatus{eventID: uuid.New()}
	answerer := &fakeAnswerer{}
	users := &fakeUsers{byChat: map[string]*models.User{}}
	bot := telegramlink.NewBot(fakeCompleter{}, users, &fakeMute{}, &fakeSchedule{resp: &dto.ScheduleResponse{}},
		status, &fakeReplier{}, answerer)

	update := telegramlink.Update{CallbackQuery: &telegramlink.CallbackQuery{
		ID:      "cb-1",
		Data:    telegramlink.RegistrationDoneCallbackData("ev_abc123"),
		Message: chatMessage(42, ""),
	}}
	if err := bot.Handle(context.Background(), update); err != nil {
		t.Fatalf("handling: %v", err)
	}
	if status.markCalls != 0 {
		t.Fatalf("MarkDone must not be called for an unresolved chat, got %d", status.markCalls)
	}
	if len(answerer.answered) != 1 {
		t.Fatalf("the callback must still be answered, got %+v", answerer.answered)
	}
}

func TestUnrelatedCallbackDataIsIgnoredButStillAnswered(t *testing.T) {
	status := &fakeStatus{eventID: uuid.New()}
	answerer := &fakeAnswerer{}
	bot := newTestBot(uuid.New(), status, &fakeMute{}, &fakeSchedule{resp: &dto.ScheduleResponse{}},
		&fakeReplier{}, answerer)

	update := telegramlink.Update{CallbackQuery: &telegramlink.CallbackQuery{
		ID: "cb-1", Data: "unrelated:data", Message: chatMessage(42, ""),
	}}
	if err := bot.Handle(context.Background(), update); err != nil {
		t.Fatalf("handling: %v", err)
	}
	if status.markCalls != 0 {
		t.Fatalf("MarkDone must not run for unrelated callback data")
	}
	if len(answerer.answered) != 1 {
		t.Fatalf("the callback must be answered so it stops spinning, got %+v", answerer.answered)
	}
}

func TestFailedEventResolutionAnswersWithFailureNotSuccess(t *testing.T) {
	status := &fakeStatus{resolveErr: errors.New("not found")}
	answerer := &fakeAnswerer{}
	bot := newTestBot(uuid.New(), status, &fakeMute{}, &fakeSchedule{resp: &dto.ScheduleResponse{}},
		&fakeReplier{}, answerer)

	update := telegramlink.Update{CallbackQuery: &telegramlink.CallbackQuery{
		ID:      "cb-1",
		Data:    telegramlink.RegistrationDoneCallbackData("ev_missing"),
		Message: chatMessage(42, ""),
	}}
	if err := bot.Handle(context.Background(), update); err != nil {
		t.Fatalf("handling: %v", err)
	}
	if status.markCalls != 0 {
		t.Fatalf("MarkDone must not run when the event cannot be resolved")
	}
	if len(answerer.answered) != 1 {
		t.Fatalf("the callback must still be answered, got %+v", answerer.answered)
	}
}
