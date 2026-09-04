package auth

import (
	"testing"

	"github.com/GoatWhistle/timeline/internal/models"
)

func TestProfileChangeIsNotRecordedWhenNothingChanged(t *testing.T) {
	user := &models.User{
		FirstName: "Ivan",
		LastName:  "Petrov",
		Nickname:  ptr("ivan"),
		Locale:    "en",
		Timezone:  "Europe/Moscow",
	}

	if profileChanged(profileSnapshot(user), profileSnapshot(user)) {
		t.Fatalf("a profile that did not change was reported as changed; " +
			"every sign-in would then land in the audit journal as a profile change")
	}
}

func TestProfileChangeIsRecordedWhenAFieldDiffers(t *testing.T) {
	before := &models.User{FirstName: "Ivan", LastName: "Petrov", Nickname: ptr("ivan"), Locale: "en"}
	after := &models.User{FirstName: "Ivan", LastName: "Petrov", Nickname: ptr("ivan"), Locale: "ru"}

	if !profileChanged(profileSnapshot(before), profileSnapshot(after)) {
		t.Fatalf("a changed locale was not reported as a change; the journal would lose a real edit")
	}
}

func TestProfileChangeSeesEveryFieldOfTheSnapshot(t *testing.T) {
	base := &models.User{FirstName: "Ivan", LastName: "Petrov", Nickname: ptr("ivan")}

	cases := map[string]*models.User{
		"first name": {FirstName: "Oleg", LastName: "Petrov", Nickname: ptr("ivan")},
		"last name":  {FirstName: "Ivan", LastName: "Sidorov", Nickname: ptr("ivan")},
		"nickname":   {FirstName: "Ivan", LastName: "Petrov", Nickname: ptr("oleg")},
		"timezone":   {FirstName: "Ivan", LastName: "Petrov", Nickname: ptr("ivan"), Timezone: "UTC"},
	}

	for name, changed := range cases {
		if !profileChanged(profileSnapshot(base), profileSnapshot(changed)) {
			t.Fatalf("a changed %s was not reported as a change", name)
		}
	}
}
