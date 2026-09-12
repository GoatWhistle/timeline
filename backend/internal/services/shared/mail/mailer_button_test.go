package mail

import (
	"strings"
	"testing"
)

func TestTheActionButtonIsCenteredForOutlook(t *testing.T) {
	for _, lang := range []string{"ru", "en"} {
		for name, got := range sendAll(t, lang) {
			marker := `<td class="tl-pad tl-btn" align="center"`
			idx := strings.Index(got.html, marker)
			if idx < 0 {
				t.Fatalf("%s/%s: the button cell is not centered with align=\"center\"", lang, name)
			}
			rest := got.html[idx:]
			end := strings.Index(rest, "</td>")
			if end < 0 {
				t.Fatalf("%s/%s: could not find the end of the button cell", lang, name)
			}
			if !strings.Contains(rest[:end], `style="margin:0 auto;"`) {
				t.Errorf("%s/%s: the button's wrapper table is not centered with margin:0 auto, "+
					"Outlook ignores align alone on nested tables", lang, name)
			}
		}
	}
}
