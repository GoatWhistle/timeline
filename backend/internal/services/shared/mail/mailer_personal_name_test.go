package mail

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/locale"
)

func TestOnlyTheInviteNamesAPersonAndItNeverRepeatsTheSameWord(t *testing.T) {
	sender := &recordingMailSender{}
	mailer := NewMailer(sender, nil, "https://timeline.test")

	mailer.SendInvite(context.Background(), "new@example.test", "Administrator Administrator", "en",
		"tok", time.Hour)
	invite := sender.last(t)
	if strings.Contains(invite.Body, "Administrator Administrator") {
		t.Error("the invite still repeats a degenerate name back at the reader")
	}
	if !strings.Contains(invite.Body, "Administrator") {
		t.Error("the invite dropped the inviting person entirely")
	}
	if strings.Contains(invite.Subject, "Administrator") {
		t.Errorf("the invite is written from a person rather than from the product: %q", invite.Subject)
	}

	mailer.SendInvite(context.Background(), "new@example.test", "", "en", "tok", time.Hour)
	anonymous := sender.last(t)
	if strings.Contains(anonymous.Body, locale.Message("en", "email.invite.attribution")) {
		t.Error("an invite with no inviting name still prints the attribution line")
	}
}

func TestPersonalNameCollapsesARepeatedNameAndKeepsARealOne(t *testing.T) {
	cases := map[string]string{
		"Administrator Administrator": "Administrator",
		"administrator ADMINISTRATOR": "administrator",
		"Maria Ivanova":               "Maria Ivanova",
		"Maria Petrovna Ivanova":      "Maria Petrovna Ivanova",
		"  Maria   Ivanova  ":         "Maria Ivanova",
		"Administrator":               "Administrator",
		"":                            "",
		"   ":                         "",
	}
	for in, want := range cases {
		if got := PersonalName(in); got != want {
			t.Errorf("PersonalName(%q) = %q, want %q", in, got, want)
		}
	}
}
