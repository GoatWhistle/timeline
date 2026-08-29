package shared

import (
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
)

var (
	icsStamp = time.Date(2026, 3, 1, 9, 30, 0, 0, time.UTC)
	icsEvent = uuid.MustParse("7f2c1a90-1111-4b2c-8d3e-000000000001")
	icsStage = uuid.MustParse("7f2c1a90-2222-4b2c-8d3e-000000000002")
)

func sampleEntries() []models.CalendarEntry {
	start := time.Date(2026, 4, 10, 8, 0, 0, 0, time.UTC)
	return []models.CalendarEntry{
		{
			Kind: models.CalendarEntryEvent, EventID: icsEvent,
			Summary: `Spring Hack; "the \big one", winter edition` + "\nsecond line",
			StartAt: start, EndAt: start.Add(48 * time.Hour),
			Location: "Main hall, Belgrade",
		},
		{
			Kind: models.CalendarEntryStage, EventID: icsEvent, StageID: icsStage,
			Summary: "Spring Hack: Opening", StartAt: start, EndAt: start.Add(time.Hour),
		},
		{
			Kind: models.CalendarEntryRegistration, EventID: icsEvent,
			Summary: "Spring Hack - registration deadline",
			StartAt: start.Add(-72 * time.Hour), EndAt: start.Add(-72 * time.Hour),
		},
	}
}

func TestRenderedCalendarUsesCRLFAndFoldsAtSeventyFiveOctets(t *testing.T) {
	body := RenderCalendar("Timeline", sampleEntries(), icsStamp)

	if strings.Contains(strings.ReplaceAll(body, "\r\n", ""), "\n") {
		t.Fatal("the document contains a bare LF outside a CRLF pair")
	}
	if !strings.HasSuffix(body, "END:VCALENDAR\r\n") {
		t.Fatalf("the document does not end with a terminated END:VCALENDAR: %q",
			body[max(0, len(body)-40):])
	}

	raw := strings.Split(strings.TrimSuffix(body, "\r\n"), "\r\n")
	for i, line := range raw {
		if len(line) > 75 {
			t.Fatalf("physical line %d is %d octets long, over the 75-octet limit: %q",
				i+1, len(line), line)
		}
		if i > 0 && len(line) > 0 && line[0] == ' ' {
			continue
		}
		if !strings.Contains(line, ":") {
			t.Fatalf("physical line %d is neither a continuation nor a property: %q", i+1, line)
		}
	}

	long := []models.CalendarEntry{{
		Kind: models.CalendarEntryEvent, EventID: icsEvent,
		Summary: strings.Repeat("long summary ", 30),
		StartAt: icsStamp, EndAt: icsStamp.Add(time.Hour),
	}}
	folded := RenderCalendar("Timeline", long, icsStamp)
	if !strings.Contains(folded, "\r\n ") {
		t.Fatal("a summary far over 75 octets produced no folded continuation line")
	}
	if got := propertyOf(t, folded, "SUMMARY"); got != strings.Repeat("long summary ", 30) {
		t.Fatalf("unfolding the long summary produced %q", got)
	}
}

func TestEscapedTextSurvivesUnfoldingAndUnescaping(t *testing.T) {
	body := RenderCalendar("Timeline", sampleEntries(), icsStamp)

	summary := propertyOf(t, body, "SUMMARY")
	if want := `Spring Hack; "the \big one", winter edition` + "\nsecond line"; summary != want {
		t.Fatalf("the round trip produced %q, expected %q", summary, want)
	}

	rawSummary := rawPropertyOf(t, body, "SUMMARY")
	if strings.ContainsAny(rawSummary, "\r\n") {
		t.Fatalf("the encoded summary carries a literal line break: %q", rawSummary)
	}
	for i := 0; i < len(rawSummary); i++ {
		if rawSummary[i] != ';' && rawSummary[i] != ',' {
			continue
		}
		if i == 0 || rawSummary[i-1] != '\\' {
			t.Fatalf("the encoded summary carries an unescaped %q at offset %d: %q",
				rawSummary[i], i, rawSummary)
		}
	}
	if !strings.Contains(rawSummary, `\\big`) {
		t.Fatalf("the backslash in the summary was not doubled: %q", rawSummary)
	}
	if !strings.Contains(rawSummary, `\n`) {
		t.Fatalf("the newline in the summary was not encoded: %q", rawSummary)
	}
}

func TestEveryEventCarriesAStableUIDAndConsistentTimes(t *testing.T) {
	entries := sampleEntries()
	first := parseICS(t, RenderCalendar("Timeline", entries, icsStamp))
	second := parseICS(t, RenderCalendar("Timeline", entries, icsStamp.Add(time.Hour)))

	if len(first) != len(entries) {
		t.Fatalf("the document holds %d events, expected %d", len(first), len(entries))
	}

	uids := make(map[string]bool, len(first))
	for i, ev := range first {
		uid := ev["UID"]
		if uid == "" {
			t.Fatalf("event %d has no UID", i)
		}
		if uids[uid] {
			t.Fatalf("the UID %q is used by two events in one document", uid)
		}
		uids[uid] = true
		if second[i]["UID"] != uid {
			t.Fatalf("the UID of event %d changed between renders: %q then %q",
				i, uid, second[i]["UID"])
		}
		if ev["DTSTAMP"] != "20260301T093000Z" {
			t.Fatalf("event %d carries DTSTAMP %q instead of the render stamp", i, ev["DTSTAMP"])
		}
		if second[i]["DTSTAMP"] != "20260301T103000Z" {
			t.Fatalf("event %d did not take the new render stamp: %q", i, second[i]["DTSTAMP"])
		}
		start, end := icsParse(t, ev["DTSTART"]), icsParse(t, ev["DTEND"])
		if !end.After(start) {
			t.Fatalf("event %d ends at %s, not after its start %s", i, end, start)
		}
	}

	if first[0]["UID"] == first[1]["UID"] {
		t.Fatal("the event and its stage share one UID")
	}
	if want := "event-" + icsEvent.String() + "@timeline"; first[0]["UID"] != want {
		t.Fatalf("the event UID is %q, expected %q", first[0]["UID"], want)
	}
	if want := "stage-" + icsStage.String() + "@timeline"; first[1]["UID"] != want {
		t.Fatalf("the stage UID is %q, expected %q", first[1]["UID"], want)
	}

	if first[0]["DTSTART"] != "20260410T080000Z" || first[0]["DTEND"] != "20260412T080000Z" {
		t.Fatalf("the event spans %s..%s, expected the UTC bounds it was given",
			first[0]["DTSTART"], first[0]["DTEND"])
	}
	if first[2]["DTSTART"] != first[2]["DTEND"] &&
		icsParse(t, first[2]["DTEND"]).Sub(icsParse(t, first[2]["DTSTART"])) != time.Minute {
		t.Fatalf("the zero-length deadline was not given the documented minute: %s..%s",
			first[2]["DTSTART"], first[2]["DTEND"])
	}
}

func TestTimesFromAnotherZoneAreWrittenAsTheirUTCInstant(t *testing.T) {
	zone, err := time.LoadLocation("Asia/Tokyo")
	if err != nil {
		t.Skipf("the zone database is unavailable: %v", err)
	}
	start := time.Date(2026, 4, 10, 17, 0, 0, 0, zone)
	entries := []models.CalendarEntry{{
		Kind: models.CalendarEntryEvent, EventID: icsEvent, Summary: "Evening in Tokyo",
		StartAt: start, EndAt: start.Add(2 * time.Hour),
	}}

	events := parseICS(t, RenderCalendar("Timeline", entries, icsStamp.In(zone)))
	if len(events) != 1 {
		t.Fatalf("the document holds %d events, expected 1", len(events))
	}
	if got := events[0]["DTSTART"]; got != "20260410T080000Z" {
		t.Fatalf("DTSTART is %q; 17:00 in Asia/Tokyo is 08:00Z, so the local "+
			"wall clock was stamped with a Z it does not have", got)
	}
	if got := events[0]["DTEND"]; got != "20260410T100000Z" {
		t.Fatalf("DTEND is %q, expected 20260410T100000Z", got)
	}
	if got := events[0]["DTSTAMP"]; got != "20260301T093000Z" {
		t.Fatalf("DTSTAMP is %q, expected the render stamp in UTC", got)
	}
}

func TestCalendarEnvelopeCarriesTheRequiredProperties(t *testing.T) {
	body := RenderCalendar("Timeline", nil, icsStamp)
	for _, required := range []string{
		"BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:" + icsProductID,
		"CALSCALE:GREGORIAN", "METHOD:PUBLISH", "END:VCALENDAR",
	} {
		if !strings.Contains(body, required+"\r\n") {
			t.Fatalf("the envelope lacks %q: %q", required, body)
		}
	}
	if strings.Contains(body, "BEGIN:VEVENT") {
		t.Fatalf("an empty schedule produced events: %q", body)
	}
}

func icsParse(t *testing.T, value string) time.Time {
	t.Helper()
	parsed, err := time.Parse("20060102T150405Z", value)
	if err != nil {
		t.Fatalf("parsing the timestamp %q: %v", value, err)
	}
	return parsed
}
