package mail

const (
	colorLogoLight = "#ac4600"
	colorLogoDark  = "#f4a34b"

	colorAccentLight = "#ac4600"
	colorAccentDark  = "#f4a34b"

	colorShellLight = "#faf7f3"
	colorShellDark  = "#08090a"

	colorCardLight   = "#ffffff"
	colorCardDark    = "#121314"
	colorBorderLight = "#d1cbc3"
	colorBorderDark  = "#383b3f"

	colorHeadingLight = "#1e1a14"
	colorHeadingDark  = "#ffffff"

	colorTextLight = "#2e2921"
	colorTextDark  = "#d0d6e0"

	colorMutedLight = "#665f56"
	colorMutedDark  = "#8a8f98"

	colorRuleLight = "#e9e2da"
	colorRuleDark  = "#383b3f"

	colorAsideLight = "#faf7f3"
	colorAsideDark  = "#1b1c1d"

	colorButtonTextLight = "#ffffff"
	colorButtonTextDark  = "#08090a"
)

type palette struct {
	Shell      string
	Card       string
	Border     string
	Heading    string
	Text       string
	Muted      string
	Rule       string
	Aside      string
	Accent     string
	ButtonText string
	Logo       string
}

func paletteFor(theme string) palette {
	if theme == "dark" {
		return palette{
			Shell: colorShellDark, Card: colorCardDark, Border: colorBorderDark,
			Heading: colorHeadingDark, Text: colorTextDark, Muted: colorMutedDark,
			Rule: colorRuleDark, Aside: colorAsideDark, Accent: colorAccentDark,
			ButtonText: colorButtonTextDark, Logo: colorLogoDark,
		}
	}
	return palette{
		Shell: colorShellLight, Card: colorCardLight, Border: colorBorderLight,
		Heading: colorHeadingLight, Text: colorTextLight, Muted: colorMutedLight,
		Rule: colorRuleLight, Aside: colorAsideLight, Accent: colorAccentLight,
		ButtonText: colorButtonTextLight, Logo: colorLogoLight,
	}
}

func resolveTheme(userTheme string) string {
	switch userTheme {
	case "light":
		return "light"
	default:
		return "dark"
	}
}

func oppositeTheme(theme string) string {
	if theme == "dark" {
		return "light"
	}
	return "dark"
}
