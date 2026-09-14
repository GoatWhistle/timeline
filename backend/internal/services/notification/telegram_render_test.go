package notification

import (
	"strings"
	"testing"

	"github.com/GoatWhistle/timeline/internal/models"
)

func TestRenderTelegramTextEscapesTheEventTitle(t *testing.T) {
	text := renderTelegramText("en", models.NotificationRequired,
		"<script>alert(1)</script> & Co", "01.01.2026 12:00", "UTC")
	if strings.Contains(text, "<script>") {
		t.Fatalf("unescaped HTML reached the telegram text: %q", text)
	}
	if !strings.Contains(text, "&lt;script&gt;") || !strings.Contains(text, "&amp; Co") {
		t.Fatalf("expected escaped HTML entities, got %q", text)
	}
}

func TestRenderTelegramTextHasBoldHeadingAndDeadlineLine(t *testing.T) {
	text := renderTelegramText("en", models.NotificationDeadlineReminder, "Demo Day", "01.01.2026 12:00", "UTC")
	if !strings.HasPrefix(text, "<b>") {
		t.Fatalf("expected a bold heading first, got %q", text)
	}
	if !strings.Contains(text, "Demo Day") {
		t.Fatalf("expected the event title, got %q", text)
	}
	if !strings.Contains(text, "Deadline: 01.01.2026 12:00 (UTC)") {
		t.Fatalf("expected the deadline line, got %q", text)
	}
}

func TestEventURLBuildsFromPublicURLAndDisplayID(t *testing.T) {
	url := eventURL("https://timeline.example", "ev_abc123")
	if url != "https://timeline.example/events/ev_abc123" {
		t.Fatalf("unexpected event url: %q", url)
	}
	if eventURL("https://timeline.example", "") != "" {
		t.Fatalf("expected an empty url without a display id")
	}
}
