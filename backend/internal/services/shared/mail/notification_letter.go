package mail

import "github.com/GoatWhistle/timeline/internal/locale"

type NotificationEmail struct {
	Lang            string
	Theme           string
	PublicURL       string
	Subject         string
	Heading         string
	Body            string
	RegistrationURL string
}

func RenderNotificationEmail(n NotificationEmail) (subject, html, unsubscribeURL string, err error) {
	theme := resolveTheme(n.Theme)
	opposite := oppositeTheme(theme)
	l := letter{
		Lang:           n.Lang,
		Theme:          theme,
		OppositeTheme:  opposite,
		Palette:        paletteFor(theme),
		Opposite:       paletteFor(opposite),
		LogoURL:        n.PublicURL + "/mail/logo-" + theme + ".png",
		Subject:        n.Subject,
		Heading:        n.Heading,
		Intro:          n.Body,
		Action:         locale.Message(n.Lang, "notification.telegram.open"),
		Link:           n.RegistrationURL,
		Fallback:       locale.Message(n.Lang, "email.fallback"),
		Footer:         locale.Message(n.Lang, "email.footer"),
		Automatic:      locale.Message(n.Lang, "email.footer.automatic"),
		UnsubscribeURL: n.PublicURL + "/catalog?settings=notifications",
		WhyReceived:    locale.Message(n.Lang, "email.why_received"),
	}
	l.Preheader = l.Heading
	body, err := l.html()
	return l.Subject, body, l.UnsubscribeURL, err
}
