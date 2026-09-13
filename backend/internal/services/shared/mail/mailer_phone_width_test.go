package mail

import (
	"regexp"
	"strings"
	"testing"
)

var contentMaxWidth = regexp.MustCompile(`max-width:\s*(\d+)px`)

var mediaThreshold = regexp.MustCompile(`@media[^{]*\([^)]*\)`)

func TestEveryLetterFitsAPhoneWidth(t *testing.T) {
	for name, mail := range sendAll(t, "en") {
		if !strings.Contains(mail.html, "tl-frame") {
			t.Errorf("%s: the outer frame carries no class a narrow screen can shrink", name)
		}
		content := mediaThreshold.ReplaceAllString(mail.html, "")
		for _, match := range contentMaxWidth.FindAllStringSubmatch(content, -1) {
			if match[1] != "100" {
				t.Errorf("%s: a max-width of %spx keeps the letter wider than a phone", name, match[1])
			}
		}
	}
}

func TestNarrowScreensCollapseTheFrameToTheViewport(t *testing.T) {
	for name, mail := range sendAll(t, "en") {
		media := strings.Index(mail.html, "@media only screen and (max-width:620px)")
		if media < 0 {
			t.Fatalf("%s: no narrow-screen rules at all", name)
		}
		block := mail.html[media:]
		if end := strings.Index(block, "@media (prefers-color-scheme"); end > 0 {
			block = block[:end]
		}
		if !strings.Contains(block, ".tl-frame") {
			t.Errorf("%s: the narrow-screen rules never shrink the frame", name)
		}
		if !strings.Contains(block, "width:100% !important") {
			t.Errorf("%s: the frame is not collapsed to the viewport width", name)
		}
	}
}
