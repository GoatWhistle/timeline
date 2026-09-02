//go:build integration

package catalogtest_test

import (
	"net/http"
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

type formatView struct {
	Format          string `json:"format"`
	EffectiveFormat string `json:"effective_format"`
}

func readFormat(t *testing.T, c *support.Client, path string) formatView {
	t.Helper()
	resp := c.Get(path)
	support.RequireStatus(t, resp, http.StatusOK, "reading "+path)
	var view formatView
	resp.Decode(t, &view)
	return view
}

func TestEventDetailDerivesFormatFromStagesForEveryReader(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	start := time.Now().UTC().Add(24 * time.Hour).Truncate(time.Second)

	id := f.AdminClient.CreateEvent(t, "Online with an offline final", start)
	f.AdminClient.Publish(t, id)
	support.RequireStatus(t, f.AdminClient.Post("/admin/events/"+id+"/stages",
		map[string]any{
			"name":         "Final",
			"type":         "DEMO",
			"start_at":     start.Add(24 * time.Hour).Format(time.RFC3339),
			"end_at":       start.Add(30 * time.Hour).Format(time.RFC3339),
			"format":       "OFFLINE",
			"country_code": "RU",
			"city":         "Kazan",
		}), http.StatusCreated, "creating an offline final")

	reader := s.Session(t, f.Outsider)
	fromCatalog := support.Catalog(t, reader, "page_size=100")
	var catalogItem *support.CatalogItem
	for i := range fromCatalog {
		if fromCatalog[i].ID == id {
			catalogItem = &fromCatalog[i]
		}
	}
	if catalogItem == nil {
		t.Fatalf("the published event is missing from the catalog")
	}
	if catalogItem.EffectiveFormat != "HYBRID" {
		t.Fatalf("the catalog derived %q instead of HYBRID", catalogItem.EffectiveFormat)
	}

	detail := readFormat(t, f.AdminClient, "/admin/events/"+id)
	if detail.Format != "ONLINE" {
		t.Fatalf("the declared format of the admin detail changed to %q", detail.Format)
	}
	if detail.EffectiveFormat != "HYBRID" {
		t.Fatalf("the admin event detail derived %q instead of HYBRID: an offline stage "+
			"is visible in the catalog but not on the screen the administrator edits",
			detail.EffectiveFormat)
	}
}
