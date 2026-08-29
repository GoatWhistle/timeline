package httpx

import "strings"

const (
	calendarSegment = "calendar"
	redactedSegment = "[redacted]"
)

func ScrubPath(path string) string {
	parts := strings.Split(path, "/")
	for i := 0; i < len(parts)-1; i++ {
		if parts[i] == calendarSegment && parts[i+1] != "" {
			parts[i+1] = redactedSegment
		}
	}
	return strings.Join(parts, "/")
}
