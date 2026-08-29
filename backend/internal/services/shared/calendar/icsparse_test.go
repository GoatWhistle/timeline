package calendar

import (
	"strings"
	"testing"
)

func unfoldICS(t *testing.T, body string) []string {
	t.Helper()
	if !strings.HasSuffix(body, "\r\n") {
		t.Fatalf("the document does not end with CRLF: %q", body[max(0, len(body)-20):])
	}
	physical := strings.Split(strings.TrimSuffix(body, "\r\n"), "\r\n")
	logical := make([]string, 0, len(physical))
	for _, line := range physical {
		if strings.HasPrefix(line, " ") || strings.HasPrefix(line, "\t") {
			if len(logical) == 0 {
				t.Fatalf("the document opens with a continuation line: %q", line)
			}
			logical[len(logical)-1] += line[1:]
			continue
		}
		logical = append(logical, line)
	}
	return logical
}

func unescapeICS(value string) string {
	var out strings.Builder
	out.Grow(len(value))
	for i := 0; i < len(value); i++ {
		if value[i] != '\\' || i+1 >= len(value) {
			out.WriteByte(value[i])
			continue
		}
		i++
		switch value[i] {
		case 'n', 'N':
			out.WriteByte('\n')
		default:
			out.WriteByte(value[i])
		}
	}
	return out.String()
}

func parseICS(t *testing.T, body string) []map[string]string {
	t.Helper()
	events := make([]map[string]string, 0, 4)
	var current map[string]string
	for _, line := range unfoldICS(t, body) {
		name, value, ok := strings.Cut(line, ":")
		if !ok {
			t.Fatalf("the line %q is not a property", line)
		}
		switch {
		case line == "BEGIN:VEVENT":
			if current != nil {
				t.Fatal("a VEVENT opens inside another VEVENT")
			}
			current = make(map[string]string, 8)
		case line == "END:VEVENT":
			if current == nil {
				t.Fatal("a VEVENT closes without opening")
			}
			events = append(events, current)
			current = nil
		case current != nil:
			if name, _, _ = strings.Cut(name, ";"); current[name] != "" {
				t.Fatalf("the property %q appears twice in one VEVENT", name)
			}
			current[name] = unescapeICS(value)
		}
	}
	if current != nil {
		t.Fatal("the document ends with an unclosed VEVENT")
	}
	return events
}

func rawPropertyOf(t *testing.T, body, name string) string {
	t.Helper()
	for _, line := range unfoldICS(t, body) {
		if got, value, ok := strings.Cut(line, ":"); ok && got == name {
			return value
		}
	}
	t.Fatalf("the document carries no %s property", name)
	return ""
}

func propertyOf(t *testing.T, body, name string) string {
	t.Helper()
	return unescapeICS(rawPropertyOf(t, body, name))
}
