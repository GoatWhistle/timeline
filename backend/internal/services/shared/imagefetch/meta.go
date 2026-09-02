package imagefetch

import (
	"html"
	"regexp"
	"strings"
)

var (
	metaTagRe  = regexp.MustCompile(`(?is)<meta\b[^>]*>`)
	linkTagRe  = regexp.MustCompile(`(?is)<link\b[^>]*>`)
	attrRe     = regexp.MustCompile(`(?is)([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+)`)
	bodyStart  = regexp.MustCompile(`(?is)<body\b`)
	coverProps = []string{
		"og:image:secure_url",
		"og:image:url",
		"og:image",
		"twitter:image:src",
		"twitter:image",
	}
)

func CoverCandidates(page string) []string {
	head := page
	if loc := bodyStart.FindStringIndex(page); loc != nil {
		head = page[:loc[0]]
	}

	found := map[string]string{}
	for _, tag := range metaTagRe.FindAllString(head, -1) {
		attrs := tagAttributes(tag)
		name := attrs["property"]
		if name == "" {
			name = attrs["name"]
		}
		content := strings.TrimSpace(attrs["content"])
		if name == "" || content == "" {
			continue
		}
		key := strings.ToLower(name)
		if _, seen := found[key]; !seen {
			found[key] = content
		}
	}

	candidates := make([]string, 0, len(coverProps)+1)
	for _, prop := range coverProps {
		if value, ok := found[prop]; ok {
			candidates = append(candidates, value)
		}
	}
	if icon := appleTouchIcon(head); icon != "" {
		candidates = append(candidates, icon)
	}
	return candidates
}

func appleTouchIcon(head string) string {
	for _, tag := range linkTagRe.FindAllString(head, -1) {
		attrs := tagAttributes(tag)
		rel := strings.ToLower(strings.TrimSpace(attrs["rel"]))
		href := strings.TrimSpace(attrs["href"])
		if href == "" {
			continue
		}
		if rel == "apple-touch-icon" || rel == "apple-touch-icon-precomposed" {
			return href
		}
	}
	return ""
}

func tagAttributes(tag string) map[string]string {
	attrs := map[string]string{}
	for _, match := range attrRe.FindAllStringSubmatch(tag, -1) {
		key := strings.ToLower(match[1])
		value := match[2]
		if len(value) >= 2 {
			switch value[0] {
			case '"', '\'':
				value = value[1 : len(value)-1]
			}
		}
		if _, seen := attrs[key]; !seen {
			attrs[key] = html.UnescapeString(value)
		}
	}
	return attrs
}
