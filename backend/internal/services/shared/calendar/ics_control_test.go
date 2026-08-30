package calendar

import (
	"strings"
	"testing"
)

func TestEscapeICSTextDropsControlCharacters(t *testing.T) {
	cases := []struct {
		name  string
		value string
		want  string
	}{
		{"null byte", "null\x00byte", "nullbyte"},
		{"bell", "be\x07ll", "bell"},
		{"vertical tab", "ver\x0btical", "vertical"},
		{"form feed", "form\x0cfeed", "formfeed"},
		{"delete", "del\x7fete", "delete"},
		{"tab survives", "col\tumn", "col\tumn"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := escapeICSText(tc.value)
			if got != tc.want {
				t.Fatalf("expected %q, got %q", tc.want, got)
			}
		})
	}
}

func TestEscapeICSTextStillEscapesStructuralCharacters(t *testing.T) {
	got := escapeICSText("a,b;c\\d\ne")
	want := `a\,b\;c\\d\ne`
	if got != want {
		t.Fatalf("expected %q, got %q", want, got)
	}
}

func TestRenderedCalendarCarriesNoRawControlCharacters(t *testing.T) {
	entries := sampleEntries()
	entries[0].Summary = "Hack\x00\x07 title\x0b"
	entries[0].Location = "Hall\x01 one"

	body := RenderCalendar("Timeline", entries, icsStamp)

	for _, r := range body {
		if r == '\r' || r == '\n' || r == '\t' {
			continue
		}
		if r < 0x20 || r == 0x7f {
			t.Fatalf("a raw control character %U reached the calendar body", r)
		}
	}
	if !strings.Contains(body, "SUMMARY:Hack title") {
		t.Fatalf("expected the stripped summary in the body, got:\n%s", body)
	}
}
