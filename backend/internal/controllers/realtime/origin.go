package realtime

import (
	"net/http"
	"net/url"
	"strings"
)

func OriginAllowed(r *http.Request, allowed []string) bool {
	origin := strings.TrimSpace(r.Header.Get("Origin"))
	if origin == "" {
		return false
	}
	parsed, err := url.Parse(origin)
	if err != nil || parsed.Host == "" {
		return false
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return false
	}
	normalised := parsed.Scheme + "://" + parsed.Host
	for _, candidate := range allowed {
		trimmed := strings.TrimSpace(strings.TrimSuffix(candidate, "/"))
		if trimmed != "" && strings.EqualFold(trimmed, normalised) {
			return true
		}
	}
	return sameHost(r, parsed)
}

func sameHost(r *http.Request, origin *url.URL) bool {
	if r.Host == "" {
		return false
	}
	return strings.EqualFold(origin.Host, r.Host)
}

func originPatterns(allowed []string, host string) []string {
	patterns := make([]string, 0, len(allowed)+1)
	if host != "" {
		patterns = append(patterns, host)
	}
	for _, candidate := range allowed {
		trimmed := strings.TrimSpace(strings.TrimSuffix(candidate, "/"))
		if trimmed == "" || trimmed == "*" {
			continue
		}
		if parsed, err := url.Parse(trimmed); err == nil && parsed.Host != "" {
			patterns = append(patterns, parsed.Host)
		}
	}
	return patterns
}
