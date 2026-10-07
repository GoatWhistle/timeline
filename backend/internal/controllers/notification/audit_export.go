package notification

import (
	"encoding/csv"
	"encoding/json"
	"net/http"
	"time"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

const (
	auditExportFilename = "audit.csv"
	auditExportPageSize = 500
)

var auditExportHeader = []string{
	"created_at", "actor_user_id", "actor_email", "action", "entity_type", "entity_id", "changes",
}

// @Summary		Export the audit log as CSV
// @Description	Restricted to administrators. Every entry the audit log returns under the same filters,
// @Description	the same search and the same sort, written as CSV instead of paginated JSON. Rows are
// @Description	written page by page as they are read.
// @Description
// @Description	The actor is the external display identifier, empty for system entries. The changes
// @Description	column carries the before and after payloads as one compact JSON object.
// @Tags			audit
// @Produce		text/csv
// @Security		CookieAuth
// @Param			actor_user_id	query		string	false	"Filter by actor"	example(us_3k7d8gb9be)
// @Param			action			query		string	false	"Filter by action"
// @Param			entity_type		query		string	false	"Filter by entity type"
// @Param			entity_id		query		string	false	"Filter by entity identifier"	format(uuid)
// @Param			from			query		string	false	"Start of the period, RFC3339"
// @Param			to				query		string	false	"End of the period, RFC3339"
// @Param			search			query		string	false	"Search by actor email, action and entity type"
// @Param			sort			query		string	false	"Sort field"		Enums(created_at,actor,action,entity_type)	default(created_at)
// @Param			order			query		string	false	"Sort direction"	Enums(asc,desc)								default(desc)
// @Success		200				{string}	string	"CSV payload"
// @Failure		400				{object}	dto.ErrorResponse
// @Failure		401				{object}	dto.ErrorResponse
// @Failure		403				{object}	dto.ErrorResponse
// @Router			/admin/audit/export [get]
func (c *AuditController) Export(w http.ResponseWriter, r *http.Request) {
	filter, err := parseAuditFilter(r)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	actor := middleware.ActorFrom(r)
	items, total, err := c.svc.List(r.Context(), actor, filter,
		models.Page{Number: 1, Size: auditExportPageSize})
	if err != nil {
		httpx.Error(w, r, err)
		return
	}

	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="`+auditExportFilename+`"`)
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Cache-Control", "no-store")

	writer := csv.NewWriter(w)
	if err := writer.Write(auditExportHeader); err != nil {
		httpx.LogStreamFailure(r, "audit export failed", err)
		return
	}
	written := 0
	for page := 1; ; page++ {
		for i := range items {
			row, err := auditExportRow(&items[i])
			if err == nil {
				err = writer.Write(row)
			}
			if err != nil {
				httpx.LogStreamFailure(r, "audit export failed", err)
				return
			}
		}
		written += len(items)
		writer.Flush()
		flush(w)
		if len(items) < auditExportPageSize || int64(written) >= total {
			break
		}
		items, _, err = c.svc.List(r.Context(), actor, filter,
			models.Page{Number: page + 1, Size: auditExportPageSize})
		if err != nil {
			httpx.LogStreamFailure(r, "audit export failed", err)
			return
		}
	}
	writer.Flush()
}

type auditChanges struct {
	Before any `json:"before,omitempty"`
	After  any `json:"after,omitempty"`
}

func auditExportRow(item *dto.AuditResponse) ([]string, error) {
	changes := ""
	if item.Before != nil || item.After != nil {
		payload, err := json.Marshal(auditChanges{Before: item.Before, After: item.After})
		if err != nil {
			return nil, err
		}
		changes = string(payload)
	}
	entityID := ""
	if item.EntityID != nil {
		entityID = item.EntityID.String()
	}
	return []string{
		item.CreatedAt.UTC().Format(time.RFC3339),
		optional(item.ActorUserID),
		optional(item.ActorEmail),
		string(item.Action),
		string(item.EntityType),
		entityID,
		changes,
	}, nil
}

func optional(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func flush(w http.ResponseWriter) {
	if f, ok := w.(http.Flusher); ok {
		f.Flush()
	}
}
