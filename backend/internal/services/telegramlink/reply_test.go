package telegramlink_test

import (
	"context"
	"strings"
	"testing"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/services/telegramlink"
)

type recordingReplier struct{ sent []models.OutboundMessage }

func (r *recordingReplier) Send(_ context.Context, msg models.OutboundMessage) error {
	r.sent = append(r.sent, msg)
	return nil
}

type stubCompleter struct{ err error }

func (s stubCompleter) CompleteTelegramLink(context.Context, string, string, *string) error {
	return s.err
}

func update(text, lang string) telegramlink.Update {
	return telegramlink.Update{ID: 1, Message: &telegramlink.Message{
		Text: &text,
		Chat: telegramlink.Chat{ID: 42, Type: "private"},
		From: &telegramlink.Sender{LanguageCode: lang},
	}}
}

func TestBotAnswersAfterLinking(t *testing.T) {
	replier := &recordingReplier{}
	if err := telegramlink.HandleWithReply(
		context.Background(), stubCompleter{}, replier, update("/start token", "en")); err != nil {
		t.Fatalf("handling: %v", err)
	}
	if len(replier.sent) != 1 {
		t.Fatalf("expected one answer, got %d", len(replier.sent))
	}
	if !strings.Contains(replier.sent[0].Body, "linked") {
		t.Fatalf("the answer does not confirm the link: %q", replier.sent[0].Body)
	}
}

func TestBotAnswersAPlainStartInsteadOfStayingSilent(t *testing.T) {
	replier := &recordingReplier{}
	if err := telegramlink.HandleWithReply(
		context.Background(), stubCompleter{}, replier, update("/start", "en")); err != nil {
		t.Fatalf("handling: %v", err)
	}
	if len(replier.sent) != 1 {
		t.Fatalf("a bare /start left the person with no answer")
	}
}

func TestBotAnswersInTheLanguageTelegramReports(t *testing.T) {
	replier := &recordingReplier{}
	if err := telegramlink.HandleWithReply(
		context.Background(), stubCompleter{}, replier, update("/start token", "en-GB")); err != nil {
		t.Fatalf("handling: %v", err)
	}
	body := replier.sent[0].Body
	if !strings.Contains(body, "linked") {
		t.Fatalf("a regional code like en-GB was not understood, the answer was %q", body)
	}
}

func TestBotSaysNothingInAGroupChat(t *testing.T) {
	replier := &recordingReplier{}
	text := "/start"
	group := telegramlink.Update{ID: 1, Message: &telegramlink.Message{
		Text: &text,
		Chat: telegramlink.Chat{ID: 42, Type: "group"},
	}}
	if err := telegramlink.HandleWithReply(
		context.Background(), stubCompleter{}, replier, group); err != nil {
		t.Fatalf("handling: %v", err)
	}
	if len(replier.sent) != 0 {
		t.Fatalf("the bot spoke in a group chat")
	}
}
