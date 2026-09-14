package mail

import (
	"testing"
)

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
