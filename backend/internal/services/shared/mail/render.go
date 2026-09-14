package mail

import (
	"bytes"
	_ "embed"
	"html/template"
	"strings"

	"github.com/GoatWhistle/timeline/internal/locale"
)

//go:embed template.html
var layoutSource string

var layout = template.Must(template.New("mail").Parse(layoutSource))

type letter struct {
	Lang           string
	Theme          string
	OppositeTheme  string
	Palette        palette
	Opposite       palette
	LogoURL        string
	Subject        string
	Preheader      string
	Heading        string
	Greeting       string
	Intro          string
	Action         string
	Link           string
	Expiry         string
	Attribution    string
	Fallback       string
	Aside          string
	Footer         string
	Automatic      string
	UnsubscribeURL string
	WhyReceived    string
}

func compose(lang, userTheme, publicURL, key, name, link, ttl string) letter {
	args := []string{"name", name, "link", link, "ttl", ttl}
	theme := resolveTheme(userTheme)
	opposite := oppositeTheme(theme)
	l := letter{
		Lang:           lang,
		Theme:          theme,
		OppositeTheme:  opposite,
		Palette:        paletteFor(theme),
		Opposite:       paletteFor(opposite),
		LogoURL:        publicURL + "/mail/logo-" + theme + ".png",
		Subject:        locale.Message(lang, key+".subject", args...),
		Heading:        locale.Message(lang, key+".heading", args...),
		Greeting:       locale.Message(lang, key+".greeting", args...),
		Intro:          locale.Message(lang, key+".intro", args...),
		Action:         locale.Message(lang, key+".action", args...),
		Aside:          locale.Message(lang, key+".aside", args...),
		Link:           link,
		Expiry:         expiryText(lang, key, args),
		Fallback:       locale.Message(lang, "email.fallback", args...),
		Footer:         locale.Message(lang, "email.footer", args...),
		Automatic:      locale.Message(lang, "email.footer.automatic", args...),
		UnsubscribeURL: publicURL + "/catalog?settings=notifications",
		WhyReceived:    locale.Message(lang, "email.why_received", args...),
	}
	l.Preheader = l.Intro
	return l
}

func expiryText(lang, key string, args []string) string {
	specific := key + ".expiry"
	if text := locale.Message(lang, specific, args...); text != specific {
		return text
	}
	return locale.Message(lang, "email.expiry", args...)
}

func (l letter) Paragraphs() [][]string {
	normalised := strings.ReplaceAll(l.Intro, "\r\n", "\n")
	out := make([][]string, 0, 4)
	for _, block := range strings.Split(normalised, "\n\n") {
		lines := make([]string, 0, 3)
		for _, line := range strings.Split(block, "\n") {
			if trimmed := strings.TrimSpace(line); trimmed != "" {
				lines = append(lines, trimmed)
			}
		}
		if len(lines) > 0 {
			out = append(out, lines)
		}
	}
	return out
}

func (l letter) html() (string, error) {
	var buf bytes.Buffer
	if err := layout.ExecuteTemplate(&buf, "layout", l); err != nil {
		return "", err
	}
	return buf.String(), nil
}

func (l letter) text() string {
	var b strings.Builder
	b.WriteString(l.Heading)
	b.WriteString("\n\n")
	b.WriteString(l.Greeting)
	b.WriteString("\n\n")
	b.WriteString(l.Intro)
	b.WriteString("\n\n")
	b.WriteString(l.Action)
	b.WriteString(":\n")
	b.WriteString(l.Link)
	b.WriteString("\n\n")
	b.WriteString(l.Expiry)
	b.WriteString("\n")
	if l.Attribution != "" {
		b.WriteString(l.Attribution)
		b.WriteString("\n")
	}
	b.WriteString("\n")
	b.WriteString(l.Aside)
	b.WriteString("\n\n--\n")
	b.WriteString(l.Footer)
	b.WriteString("\n")
	b.WriteString(l.Automatic)
	b.WriteString("\n")
	b.WriteString(l.WhyReceived)
	b.WriteString(": ")
	b.WriteString(l.UnsubscribeURL)
	b.WriteString("\n")
	return b.String()
}
