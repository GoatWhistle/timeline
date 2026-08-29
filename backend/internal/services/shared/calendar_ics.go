package shared

import (
	"strings"
	"time"

	"github.com/GoatWhistle/timeline/internal/models"
)

const (
	icsProductID = "-//Timeline//Timeline Calendar Feed//EN"
	icsFoldLimit = 75
	icsUIDDomain = "timeline"
)

func RenderCalendar(name string, entries []models.CalendarEntry, stamp time.Time) string {
	var b strings.Builder
	writeICSLine(&b, "BEGIN:VCALENDAR")
	writeICSLine(&b, "VERSION:2.0")
	writeICSLine(&b, "PRODID:"+icsProductID)
	writeICSLine(&b, "CALSCALE:GREGORIAN")
	writeICSLine(&b, "METHOD:PUBLISH")
	writeICSProperty(&b, "X-WR-CALNAME", name)
	for i := range entries {
		writeICSEvent(&b, &entries[i], stamp)
	}
	writeICSLine(&b, "END:VCALENDAR")
	return b.String()
}

func writeICSEvent(b *strings.Builder, entry *models.CalendarEntry, stamp time.Time) {
	writeICSLine(b, "BEGIN:VEVENT")
	writeICSLine(b, "UID:"+icsUID(entry))
	writeICSLine(b, "DTSTAMP:"+icsTime(stamp))
	writeICSLine(b, "DTSTART:"+icsTime(entry.StartAt))
	writeICSLine(b, "DTEND:"+icsTime(icsEnd(entry)))
	writeICSProperty(b, "SUMMARY", entry.Summary)
	if entry.Location != "" {
		writeICSProperty(b, "LOCATION", entry.Location)
	}
	writeICSLine(b, "TRANSP:TRANSPARENT")
	writeICSLine(b, "END:VEVENT")
}

func icsEnd(entry *models.CalendarEntry) time.Time {
	if entry.EndAt.After(entry.StartAt) {
		return entry.EndAt
	}
	return entry.StartAt.Add(time.Minute)
}

func icsUID(entry *models.CalendarEntry) string {
	id := entry.EventID.String()
	if entry.Kind == models.CalendarEntryStage {
		id = entry.StageID.String()
	}
	return strings.ToLower(string(entry.Kind)) + "-" + id + "@" + icsUIDDomain
}

func icsTime(t time.Time) string {
	return t.UTC().Format("20060102T150405Z")
}

func writeICSProperty(b *strings.Builder, name, value string) {
	writeICSLine(b, name+":"+escapeICSText(value))
}

func escapeICSText(value string) string {
	var out strings.Builder
	out.Grow(len(value))
	for _, r := range value {
		switch r {
		case '\\':
			out.WriteString(`\\`)
		case ';':
			out.WriteString(`\;`)
		case ',':
			out.WriteString(`\,`)
		case '\n':
			out.WriteString(`\n`)
		case '\r':
		default:
			out.WriteRune(r)
		}
	}
	return out.String()
}

func writeICSLine(b *strings.Builder, line string) {
	for _, chunk := range foldICSLine(line) {
		b.WriteString(chunk)
		b.WriteString("\r\n")
	}
}

func foldICSLine(line string) []string {
	if len(line) <= icsFoldLimit {
		return []string{line}
	}
	chunks := make([]string, 0, len(line)/icsFoldLimit+1)
	limit := icsFoldLimit
	for len(line) > limit {
		cut := limit
		for cut > 0 && !utf8Boundary(line[cut]) {
			cut--
		}
		if cut == 0 {
			cut = limit
		}
		chunks = append(chunks, line[:cut])
		line = " " + line[cut:]
		limit = icsFoldLimit
	}
	return append(chunks, line)
}

func utf8Boundary(b byte) bool { return b&0xC0 != 0x80 }
