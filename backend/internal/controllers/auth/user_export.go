package auth

import (
	"encoding/csv"
	"net/http"
	"strconv"
	"time"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

const (
	userExportFilename = "users.csv"
	userExportPageSize = 500
)

var userExportHeader = []string{
	"id", "display_name", "first_name", "last_name", "email", "nickname", "telegram_username",
	"is_admin", "is_active", "email_verified_at", "locale", "timezone", "created_at",
}

// @Summary		Export the user directory as CSV
// @Description	Restricted to administrators. Every account the user search returns under the same
// @Description	filters and the same sort, written as CSV instead of paginated JSON. Rows are written
// @Description	page by page as they are read.
// @Description
// @Description	Credentials, tokens and the Telegram chat identifier are never exported.
// @Tags			users
// @Produce		text/csv
// @Security		CookieAuth
// @Param			query		query		string	false	"Search string"
// @Param			active		query		bool	false	"Only active or only deactivated accounts"
// @Param			admin		query		bool	false	"Only administrators or only ordinary accounts"
// @Param			telegram	query		bool	false	"Only accounts with or without a Telegram handle"
// @Param			sort		query		string	false	"Sort field"		Enums(name,email,created_at)
// @Param			order		query		string	false	"Sort direction"	Enums(asc,desc)
// @Success		200			{string}	string	"CSV payload"
// @Failure		400			{object}	dto.ErrorResponse
// @Failure		401			{object}	dto.ErrorResponse
// @Failure		403			{object}	dto.ErrorResponse
// @Router			/admin/users/export [get]
func (c *UserController) Export(w http.ResponseWriter, r *http.Request) {
	filter, err := parseUserFilter(r)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	actor := middleware.ActorFrom(r)
	items, total, err := c.svc.SearchForAdmin(r.Context(), actor, filter,
		models.Page{Number: 1, Size: userExportPageSize})
	if err != nil {
		httpx.Error(w, r, err)
		return
	}

	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="`+userExportFilename+`"`)
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Cache-Control", "no-store")

	writer := csv.NewWriter(w)
	if err := writer.Write(userExportHeader); err != nil {
		httpx.LogStreamFailure(r, "user export failed", err)
		return
	}
	written := 0
	for page := 1; ; page++ {
		for i := range items {
			if err := writer.Write(userExportRow(&items[i])); err != nil {
				httpx.LogStreamFailure(r, "user export failed", err)
				return
			}
		}
		written += len(items)
		writer.Flush()
		if f, ok := w.(http.Flusher); ok {
			f.Flush()
		}
		if len(items) < userExportPageSize || int64(written) >= total {
			break
		}
		items, _, err = c.svc.SearchForAdmin(r.Context(), actor, filter,
			models.Page{Number: page + 1, Size: userExportPageSize})
		if err != nil {
			httpx.LogStreamFailure(r, "user export failed", err)
			return
		}
	}
	writer.Flush()
}

func userExportRow(item *dto.AdminUserSummary) []string {
	verified := ""
	if item.EmailVerifiedAt != nil {
		verified = item.EmailVerifiedAt.UTC().Format(time.RFC3339)
	}
	return []string{
		item.ID,
		item.DisplayName,
		item.FirstName,
		item.LastName,
		item.Email,
		optionalText(item.Nickname),
		optionalText(item.TelegramUsername),
		strconv.FormatBool(item.IsAdmin),
		strconv.FormatBool(item.IsActive),
		verified,
		item.Locale,
		item.Timezone,
		item.CreatedAt.UTC().Format(time.RFC3339),
	}
}

func optionalText(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}
