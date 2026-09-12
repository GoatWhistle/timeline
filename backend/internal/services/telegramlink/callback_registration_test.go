package telegramlink_test

import (
	"context"
	"errors"
	"strings"
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

func TestRegistrationButtonEditsTheMessageInsteadOfLeavingItLive(t *testing.T) {
	status := &fakeStatus{eventID: uuid.New()}
	editor := &fakeEditor{}
	bot := newTestBot(uuid.New(), status, &fakeMute{}, &fakeSchedule{resp: &dto.ScheduleResponse{}},
		&fakeReplier{}, &fakeAnswerer{}).WithEditor(editor)

	update := telegramlink.Update{CallbackQuery: &telegramlink.CallbackQuery{
		ID:      "cb-1",
		Data:    telegramlink.RegistrationDoneCallbackData("ev_abc123"),
		Message: chatMessageWithID(42, 99, "Deadline: 01.01.2026"),
	}}
	if err := bot.Handle(context.Background(), update); err != nil {
		t.Fatalf("handling: %v", err)
	}
	if len(editor.edits) != 1 {
		t.Fatalf("expected exactly one edit, got %+v", editor.edits)
	}
	edit := editor.edits[0]
	if edit.chatID != "42" || edit.messageID != 99 {
		t.Fatalf("edit sent to wrong message: %+v", edit)
	}
	if !strings.Contains(edit.text, "Deadline: 01.01.2026") {
		t.Fatalf("edit dropped the original text: %q", edit.text)
	}
	if !strings.Contains(edit.text, "Marked: registration completed.") {
		t.Fatalf("edit is missing the confirmation note: %q", edit.text)
	}
}

func TestRegistrationButtonEscapesHTMLInTheOriginalMessage(t *testing.T) {
	status := &fakeStatus{eventID: uuid.New()}
	editor := &fakeEditor{}
	bot := newTestBot(uuid.New(), status, &fakeMute{}, &fakeSchedule{resp: &dto.ScheduleResponse{}},
		&fakeReplier{}, &fakeAnswerer{}).WithEditor(editor)

	update := telegramlink.Update{CallbackQuery: &telegramlink.CallbackQuery{
		ID:      "cb-1",
		Data:    telegramlink.RegistrationDoneCallbackData("ev_abc123"),
		Message: chatMessageWithID(42, 99, "<script>alert(1)</script> & Co"),
	}}
	if err := bot.Handle(context.Background(), update); err != nil {
		t.Fatalf("handling: %v", err)
	}
	if len(editor.edits) != 1 {
		t.Fatalf("expected exactly one edit, got %+v", editor.edits)
	}
	text := editor.edits[0].text
	if strings.Contains(text, "<script>") {
		t.Fatalf("unescaped HTML reached the Telegram edit request: %q", text)
	}
	if !strings.Contains(text, "&lt;script&gt;") || !strings.Contains(text, "&amp; Co") {
		t.Fatalf("expected escaped HTML entities, got %q", text)
	}
}

func TestFailedMarkDoneStillEditsTheMessageWithAFailureNote(t *testing.T) {
	status := &fakeStatus{eventID: uuid.New(), resolveErr: errors.New("not found")}
	editor := &fakeEditor{}
	bot := newTestBot(uuid.New(), status, &fakeMute{}, &fakeSchedule{resp: &dto.ScheduleResponse{}},
		&fakeReplier{}, &fakeAnswerer{}).WithEditor(editor)

	update := telegramlink.Update{CallbackQuery: &telegramlink.CallbackQuery{
		ID:      "cb-1",
		Data:    telegramlink.RegistrationDoneCallbackData("ev_missing"),
		Message: chatMessageWithID(42, 99, "Deadline: 01.01.2026"),
	}}
	if err := bot.Handle(context.Background(), update); err != nil {
		t.Fatalf("handling: %v", err)
	}
	if len(editor.edits) != 1 {
		t.Fatalf("expected exactly one edit, got %+v", editor.edits)
	}
	if !strings.Contains(editor.edits[0].text, "Could not mark the registration") {
		t.Fatalf("edit is missing the failure note: %q", editor.edits[0].text)
	}
}

func TestNoEditorConfiguredLeavesButtonHandlingUnaffected(t *testing.T) {
	status := &fakeStatus{eventID: uuid.New()}
	answerer := &fakeAnswerer{}
	bot := newTestBot(uuid.New(), status, &fakeMute{}, &fakeSchedule{resp: &dto.ScheduleResponse{}},
		&fakeReplier{}, answerer)

	update := telegramlink.Update{CallbackQuery: &telegramlink.CallbackQuery{
		ID:      "cb-1",
		Data:    telegramlink.RegistrationDoneCallbackData("ev_abc123"),
		Message: chatMessageWithID(42, 99, "Deadline: 01.01.2026"),
	}}
	if err := bot.Handle(context.Background(), update); err != nil {
		t.Fatalf("handling without an editor should not fail: %v", err)
	}
	if status.markCalls != 1 || len(answerer.answered) != 1 {
		t.Fatalf("callback handling regressed without an editor: marks=%d answers=%d",
			status.markCalls, len(answerer.answered))
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
