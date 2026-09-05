package telegramlink

import (
	"context"
	"errors"
	"reflect"
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/models"
)

type fakeSource struct {
	prepare func(context.Context) error
	poll    func(context.Context, int64) ([]Update, error)
}

func (f fakeSource) DeleteWebhook(ctx context.Context) error { return f.prepare(ctx) }
func (f fakeSource) Updates(ctx context.Context, offset int64) ([]Update, error) {
	return f.poll(ctx, offset)
}

type completeFunc func(context.Context, string, string, *string) error

func (f completeFunc) CompleteTelegramLink(ctx context.Context, token, chat string, name *string) error {
	return f(ctx, token, chat, name)
}

func linkUpdate(id int64, text string) Update {
	return Update{ID: id, Message: &Message{Text: &text, Chat: Chat{ID: 42, Type: "private"}}}
}

func TestPollingAcknowledgesOnlyCommittedUpdates(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var offsets []int64
	var tokens []string
	attempts := 0
	prepared := false
	source := fakeSource{
		prepare: func(context.Context) error { prepared = true; return nil },
		poll: func(_ context.Context, offset int64) ([]Update, error) {
			if !prepared {
				t.Fatal("polled before deleting the webhook")
			}
			offsets = append(offsets, offset)
			if offset == 12 {
				cancel()
				return nil, context.Canceled
			}
			return []Update{linkUpdate(10, "/start first"), linkUpdate(11, "/start second")}, nil
		},
	}
	complete := completeFunc(func(_ context.Context, token, chat string, _ *string) error {
		if chat != "42" {
			t.Fatalf("wrong chat: %s", chat)
		}
		tokens = append(tokens, token)
		if token == "second" {
			attempts++
			if attempts == 1 {
				return errors.New("database unavailable")
			}
		}
		return nil
	})
	Run(ctx, source, complete)
	if !reflect.DeepEqual(offsets, []int64{0, 11, 12}) {
		t.Fatalf("lost or repeated updates: offsets=%v", offsets)
	}
	if !reflect.DeepEqual(tokens, []string{"first", "second", "second"}) {
		t.Fatalf("unexpected processing: %v", tokens)
	}
}

func TestPollingRetriesNetworkAndPreparationErrors(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	preparations, polls := 0, 0
	source := fakeSource{
		prepare: func(context.Context) error {
			preparations++
			if preparations == 1 {
				return errors.New("connection timeout")
			}
			return nil
		},
		poll: func(_ context.Context, offset int64) ([]Update, error) {
			polls++
			if preparations < 2 || offset != 0 {
				t.Fatal("acknowledged updates after a network failure")
			}
			if polls == 1 {
				return nil, errors.New("connection reset")
			}
			cancel()
			return nil, context.Canceled
		},
	}
	Run(ctx, source, completeFunc(func(context.Context, string, string, *string) error { t.Fatal("unexpected linking"); return nil }))
	if preparations != 2 || polls != 2 {
		t.Fatalf("did not recover: preparations=%d polls=%d", preparations, polls)
	}
}

func TestPollingStopsDuringRetryBackoff(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	started := time.Now()
	RunWithRetry(ctx, "test", func(context.Context) error { cancel(); return errors.New("offline") }, false)
	if time.Since(started) > time.Second {
		t.Fatal("shutdown waited for retry")
	}
}

func TestExpiredOrConsumedLinkDoesNotBlockQueue(t *testing.T) {
	for _, err := range []error{models.ErrNotFound, models.ErrConflict} {
		if got := Handle(context.Background(), completeFunc(func(context.Context, string, string, *string) error {
			return err
		}), linkUpdate(1, "/start expired")); got != nil {
			t.Fatal(got)
		}
	}
}

func TestOnlyPrivateStartCommandsCanLink(t *testing.T) {
	for _, tc := range []struct {
		text, chatType string
		accepted       bool
	}{
		{"/start token", "private", true}, {"/start@timeline_bot token", "private", true},
		{"/start", "private", false}, {"/start a b", "private", false},
		{"hello /start token", "private", false}, {"/start token", "group", false},
		{"/start token", "supergroup", false}, {"/start token", "", false},
	} {
		update := linkUpdate(1, tc.text)
		update.Message.Chat.Type = tc.chatType
		_, ok := StartToken(update.Message)
		if ok != tc.accepted {
			t.Errorf("text=%q chat=%q accepted=%v", tc.text, tc.chatType, ok)
		}
	}
}
