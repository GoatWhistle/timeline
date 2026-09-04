package dto_test

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

var trackSummaryLiteral = regexp.MustCompile(`(?s)EventTrackSummary\{[^}]*TrackNo:`)

func TestTrackSummaryIsBuiltInOnePlace(t *testing.T) {
	root := filepath.Join("..", "..", "..", "internal")
	canonical := filepath.Join("..", "..", "..", "internal", "models", "dto", "event.go")

	var offenders []string
	err := filepath.WalkDir(root, func(path string, entry os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if entry.IsDir() || !strings.HasSuffix(path, ".go") || strings.HasSuffix(path, "_test.go") {
			return nil
		}
		if filepath.Clean(path) == filepath.Clean(canonical) {
			return nil
		}
		body, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		if trackSummaryLiteral.Match(body) {
			offenders = append(offenders, path)
		}
		return nil
	})
	if err != nil {
		t.Fatalf("walking the backend sources: %v", err)
	}
	if len(offenders) > 0 {
		t.Fatalf("a track is mapped to EventTrackSummary outside dto.TrackSummaries in:\n  %s\n"+
			"four copies of this mapping already drifted apart once; build it through "+
			"dto.TrackSummaries so a new field cannot reach one response and miss another",
			strings.Join(offenders, "\n  "))
	}
}
