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
	Lang        string
	Subject     string
	Preheader   string
	Heading     string
	Greeting    string
	Intro       string
	Action      string
	Link        string
	Expiry      string
	Attribution string
	Fallback    string
	Aside       string
	Footer      string
	Automatic   string
}

func compose(lang, key, name, link, ttl string) letter {
	args := []string{"name", name, "link", link, "ttl", ttl}
	l := letter{
		Lang:      lang,
		Subject:   locale.Message(lang, key+".subject", args...),
		Heading:   locale.Message(lang, key+".heading", args...),
		Greeting:  locale.Message(lang, key+".greeting", args...),
		Intro:     locale.Message(lang, key+".intro", args...),
		Action:    locale.Message(lang, key+".action", args...),
		Aside:     locale.Message(lang, key+".aside", args...),
		Link:      link,
		Expiry:    locale.Message(lang, "email.expiry", args...),
		Fallback:  locale.Message(lang, "email.fallback", args...),
		Footer:    locale.Message(lang, "email.footer", args...),
		Automatic: locale.Message(lang, "email.footer.automatic", args...),
	}
	l.Preheader = l.Intro
	if key == inviteKey && name != "" {
		l.Attribution = locale.Message(lang, key+".attribution", args...)
	}
	return l
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
	return b.String()
}
