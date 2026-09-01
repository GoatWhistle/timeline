package httpx

import "strings"

const redactedSegment = "[redacted]"

var secretSegments = map[string]bool{
	"calendar":  true,
	"team-join": true,
}

func ScrubPath(path string) string {
	parts := strings.Split(path, "/")
	for i := 0; i < len(parts)-1; i++ {
		if secretSegments[parts[i]] && parts[i+1] != "" {
			parts[i+1] = redactedSegment
		}
	}
	return strings.Join(parts, "/")
}
