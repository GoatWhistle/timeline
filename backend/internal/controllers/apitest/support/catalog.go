//go:build integration

package support

import (
	"net/http"
	"testing"
)

type CatalogItem struct {
	ID                   string  `json:"id"`
	Title                string  `json:"title"`
	Kind                 string  `json:"kind"`
	Format               string  `json:"format"`
	Origin               string  `json:"origin"`
	EffectiveFormat      string  `json:"effective_format"`
	State                string  `json:"state"`
	Joined               bool    `json:"joined"`
	TeamRole             *string `json:"team_role"`
	RegistrationURL      *string `json:"registration_url"`
	RegistrationDeadline *string `json:"registration_deadline"`
	RegistrationStatus   *struct {
		ID     string `json:"id"`
		Status string `json:"status"`
	} `json:"registration_status"`
	OfflineStages []struct {
		Name  string `json:"name"`
		Place struct {
			Format    string  `json:"format"`
			City      *string `json:"city"`
			Inherited bool    `json:"inherited"`
		} `json:"place"`
	} `json:"offline_stages"`
}

func Catalog(t *testing.T, c *Client, query string) []CatalogItem {
	t.Helper()
	path := "/catalog"
	if query != "" {
		path += "?" + query
	}
	resp := c.Get(path)
	RequireStatus(t, resp, http.StatusOK, "reading the catalog "+query)
	var body struct {
		Items []CatalogItem `json:"items"`
	}
	resp.Decode(t, &body)
	return body.Items
}

func SetEventTaxonomy(t *testing.T, c *Client, id string, patch map[string]any) {
	t.Helper()
	RequireStatus(t, c.Patch("/admin/events/"+id, patch),
		http.StatusOK, "patching event "+id)
}
