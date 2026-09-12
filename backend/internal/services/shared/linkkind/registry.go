package linkkind

import (
	"net/url"
	"strings"
)

type entry struct {
	id      string
	domains []string
}

var registry = []entry{
	{"github", []string{"github.com", "github.io", "gist.github.com"}},
	{"gitlab", []string{"gitlab.com", "gitlab.io"}},
	{"bitbucket", []string{"bitbucket.org"}},
	{"gitea", []string{"gitea.com", "gitea.io"}},
	{"sourcehut", []string{"sr.ht"}},
	{"telegram", []string{"t.me", "telegram.me", "telegram.org"}},
	{"discord", []string{"discord.com", "discord.gg", "discordapp.com"}},
	{"linkedin", []string{"linkedin.com", "lnkd.in"}},
	{"x", []string{"x.com", "twitter.com", "t.co"}},
	{"mastodon", []string{"mastodon.social", "mastodon.online", "mstdn.social"}},
	{"bluesky", []string{"bsky.app", "bsky.social"}},
	{"youtube", []string{"youtube.com", "youtu.be"}},
	{"twitch", []string{"twitch.tv"}},
	{"instagram", []string{"instagram.com"}},
	{"facebook", []string{"facebook.com", "fb.com"}},
	{"threads", []string{"threads.net", "threads.com"}},
	{"reddit", []string{"reddit.com", "redd.it"}},
	{"medium", []string{"medium.com"}},
	{"vk", []string{"vk.com", "vk.ru"}},
	{"stackOverflow", []string{"stackoverflow.com", "stackexchange.com"}},
	{"leetcode", []string{"leetcode.com"}},
	{"codeforces", []string{"codeforces.com"}},
	{"figma", []string{"figma.com"}},
	{"behance", []string{"behance.net"}},
	{"dribbble", []string{"dribbble.com"}},
	{"notion", []string{"notion.so", "notion.site"}},
	{"npm", []string{"npmjs.com"}},
	{"vimeo", []string{"vimeo.com"}},
	{"soundcloud", []string{"soundcloud.com"}},
	{"spotify", []string{"spotify.com"}},
	{"boosty", []string{"boosty.to"}},
	{"patreon", []string{"patreon.com"}},
	{"tiktok", []string{"tiktok.com"}},
	{"hackerone", []string{"hackerone.com"}},
	{"kaggle", []string{"kaggle.com"}},
	{"huggingface", []string{"huggingface.co", "hf.co"}},
	{"devpost", []string{"devpost.com"}},
	{"dockerHub", []string{"hub.docker.com", "docker.com"}},
	{"pypi", []string{"pypi.org"}},
	{"cratesIo", []string{"crates.io"}},
	{"goDev", []string{"pkg.go.dev", "golang.org", "go.dev"}},
	{"codepen", []string{"codepen.io"}},
	{"devTo", []string{"dev.to"}},
	{"hashnode", []string{"hashnode.com", "hashnode.dev"}},
	{"habr", []string{"habr.com"}},
	{"stepik", []string{"stepik.org"}},
	{"coursera", []string{"coursera.org"}},
	{"artstation", []string{"artstation.com"}},
	{"itch", []string{"itch.io"}},
	{"steam", []string{"steamcommunity.com", "steampowered.com"}},
	{"googleScholar", []string{"scholar.google.com"}},
	{"orcid", []string{"orcid.org"}},
	{"researchGate", []string{"researchgate.net"}},
	{"substack", []string{"substack.com"}},
	{"goodreads", []string{"goodreads.com"}},
	{"lastfm", []string{"last.fm"}},
	{"pinterest", []string{"pinterest.com", "pin.it"}},
	{"whatsapp", []string{"whatsapp.com", "wa.me"}},
	{"signal", []string{"signal.org", "signal.me"}},
	{"matrix", []string{"matrix.org", "matrix.to"}},
	{"keybase", []string{"keybase.io"}},
	{"codewars", []string{"codewars.com"}},
	{"hackerrank", []string{"hackerrank.com"}},
	{"kickstarter", []string{"kickstarter.com"}},
	{"ycombinator", []string{"news.ycombinator.com", "ycombinator.com"}},
	{"producthunt", []string{"producthunt.com"}},
}

var byDomain = buildIndex()

func buildIndex() map[string]string {
	out := make(map[string]string)
	for _, e := range registry {
		for _, d := range e.domains {
			out[d] = e.id
		}
	}
	return out
}

const Website = "website"

func Detect(hostname string) string {
	labels := splitLabels(hostname)
	for i := 0; i < len(labels)-1; i++ {
		candidate := joinLabels(labels[i:])
		if id, ok := byDomain[candidate]; ok {
			return id
		}
	}
	if id, ok := byDomain[hostname]; ok {
		return id
	}
	return Website
}

func splitLabels(host string) []string {
	var labels []string
	start := 0
	for i := 0; i < len(host); i++ {
		if host[i] == '.' {
			labels = append(labels, host[start:i])
			start = i + 1
		}
	}
	labels = append(labels, host[start:])
	return labels
}

func joinLabels(labels []string) string {
	out := labels[0]
	for _, l := range labels[1:] {
		out += "." + l
	}
	return out
}

func DetectFromURL(raw string) string {
	parsed, err := url.Parse(raw)
	if err != nil || parsed.Hostname() == "" {
		return Website
	}
	host := strings.ToLower(parsed.Hostname())
	host = strings.TrimSuffix(host, ".")
	return Detect(host)
}
