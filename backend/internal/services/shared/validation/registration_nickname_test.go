package validation

import (
	"testing"
)

func TestRegistrationNicknameAcceptsAWellFormedValue(t *testing.T) {
	cases := []string{"abc", "jsmith", "j-smith", "a_b", "a1b2c3", "Ivan_Petrov-42"}
	for _, value := range cases {
		t.Run(value, func(t *testing.T) {
			got, err := RegistrationNickname(&value)
			if err != nil {
				t.Fatalf("expected %q to be accepted, got %v", value, err)
			}
			if got == nil || *got != value {
				t.Fatalf("expected %q to survive validation, got %v", value, got)
			}
		})
	}
}

func TestRegistrationNicknameRefusesTheSameShapesTheClientRefuses(t *testing.T) {
	long := ""
	for range 40 {
		long += "a"
	}
	cases := []struct {
		name  string
		value string
	}{
		{"too short", "ab"},
		{"too long", long},
		{"a leading hyphen", "-ivan"},
		{"a trailing hyphen", "ivan-"},
		{"a leading underscore", "_ivan"},
		{"a trailing underscore", "ivan_"},
		{"a space", "ivan petrov"},
		{"a dot", "ivan.petrov"},
		{"an at sign", "ivan@petrov"},
		{"non-latin letters", "\u0438\u0432\u0430\u043d"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			value := tc.value
			if _, err := RegistrationNickname(&value); err == nil {
				t.Fatalf("expected %q to be refused by the server", tc.value)
			}
		})
	}
}

func TestRegistrationNicknameRefusesAReservedRoute(t *testing.T) {
	for _, value := range []string{"admin", "settings", "Login", " api "} {
		t.Run(value, func(t *testing.T) {
			candidate := value
			if _, err := RegistrationNickname(&candidate); err == nil {
				t.Fatalf("expected the reserved nickname %q to be refused", value)
			}
		})
	}
}

func TestRegistrationNicknameTreatsAnAbsentValueAsNoChoice(t *testing.T) {
	got, err := RegistrationNickname(nil)
	if err != nil {
		t.Fatalf("expected an absent nickname to be accepted, got %v", err)
	}
	if got != nil {
		t.Fatalf("expected an absent nickname to stay absent, got %v", *got)
	}
}

func TestRegistrationNicknameTreatsBlankAsNoChoice(t *testing.T) {
	for _, value := range []string{"", "   "} {
		blank := value
		got, err := RegistrationNickname(&blank)
		if err != nil {
			t.Fatalf("expected a blank nickname to be accepted, got %v", err)
		}
		if got != nil {
			t.Fatalf("expected a blank nickname to stay absent, got %v", *got)
		}
	}
}

func TestRegistrationNicknameTrimsSurroundingSpace(t *testing.T) {
	value := "  jsmith  "
	got, err := RegistrationNickname(&value)
	if err != nil {
		t.Fatalf("expected the padded nickname to be accepted, got %v", err)
	}
	if got == nil || *got != "jsmith" {
		t.Fatalf("expected the nickname to be trimmed, got %v", got)
	}
}
