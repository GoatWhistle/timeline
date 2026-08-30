package validation

import (
	"strings"
	"testing"
)

func TestValidateTextStripsControlCharacters(t *testing.T) {
	cases := []struct {
		name  string
		value string
		want  string
	}{
		{"carriage return and newline become a newline", "Hack\r\nBEGIN:VEVENT", "Hack\nBEGIN:VEVENT"},
		{"lone carriage return is dropped", "Hack\rInjected", "HackInjected"},
		{"bell and other C0 codes are dropped", "Ctl\x01\x07\x0bchars", "Ctlchars"},
		{"a null byte is dropped", "null\x00byte", "nullbyte"},
		{"delete is dropped", "del\x7fete", "delete"},
		{"C1 codes are dropped", "c\u0085o\u009fne", "cone"},
		{"unicode line separators are dropped", "a\u2028b\u2029c", "abc"},
		{"a tab survives", "col\tumn", "col\tumn"},
		{"an ordinary newline survives", "line\nbreak", "line\nbreak"},
		{"ordinary text is untouched", "Winter Hack 2027", "Winter Hack 2027"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := ValidateText("title", tc.value, 1, 200)
			if err != nil {
				t.Fatalf("expected the value to be accepted, got %v", err)
			}
			if got != tc.want {
				t.Fatalf("expected %q, got %q", tc.want, got)
			}
		})
	}
}

func TestValidateTextRejectsValueThatIsOnlyControlCharacters(t *testing.T) {
	if _, err := ValidateText("title", "\x00\x01\r\x7f", 1, 200); err == nil {
		t.Fatal("expected a value made only of control characters to be rejected")
	}
}

func TestValidateTextCountsLengthAfterStripping(t *testing.T) {
	value := strings.Repeat("\x00", 500) + "ok"
	got, err := ValidateText("title", value, 1, 10)
	if err != nil {
		t.Fatalf("expected control characters not to count towards the limit, got %v", err)
	}
	if got != "ok" {
		t.Fatalf("expected %q, got %q", "ok", got)
	}
}
