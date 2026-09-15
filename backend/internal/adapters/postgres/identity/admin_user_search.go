package identity

import (
	"context"
	"strconv"
	"strings"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/locale"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

const adminUserColumns = `display_id, first_name, middle_name, last_name, nickname, email,
	is_active, is_admin, avatar_url, telegram_username, locale, timezone, bio,
	email_verified_at, created_at, updated_at`

var adminUserSortColumns = map[models.UserSortField][]string{
	models.UserSortName:    {"lower(last_name)", "lower(first_name)"},
	models.UserSortEmail:   {"lower(email)"},
	models.UserSortCreated: {"created_at"},
}

func adminUserFilterSQL(filter models.UserFilter) (string, []any) {
	conds := []string{`deleted_at IS NULL`}
	args := make([]any, 0, 4)

	if trimmed := strings.ToLower(strings.TrimSpace(filter.Query)); trimmed != "" {
		args = append(args, postgres.LikeContains(trimmed))
		n := "$" + strconv.Itoa(len(args))
		conds = append(conds, `(lower(first_name) LIKE `+n+` OR lower(last_name) LIKE `+n+
			` OR lower(coalesce(nickname, '')) LIKE `+n+` OR lower(email) LIKE `+n+
			` OR lower(coalesce(telegram_username, '')) LIKE `+n+`)`)
	}
	if filter.Active != nil {
		args = append(args, *filter.Active)
		conds = append(conds, `is_active = $`+strconv.Itoa(len(args)))
	}
	if filter.Admin != nil {
		args = append(args, *filter.Admin)
		conds = append(conds, `is_admin = $`+strconv.Itoa(len(args)))
	}
	if filter.Telegram != nil {
		if *filter.Telegram {
			conds = append(conds, `telegram_username IS NOT NULL`)
		} else {
			conds = append(conds, `telegram_username IS NULL`)
		}
	}
	return "WHERE " + strings.Join(conds, " AND "), args
}

func adminUserOrderSQL(filter models.UserFilter) string {
	columns, ok := adminUserSortColumns[filter.Sort]
	if !ok {
		columns = adminUserSortColumns[models.UserSortName]
	}
	direction := "ASC"
	if filter.Direction == models.CatalogSortDesc {
		direction = "DESC"
	}
	parts := make([]string, 0, len(columns)+1)
	for _, column := range columns {
		parts = append(parts, column+" "+direction)
	}
	return strings.Join(append(parts, "lower(email) ASC"), ", ")
}

func (r *Users) SearchForAdmin(ctx context.Context, filter models.UserFilter,
	page models.Page) ([]dto.AdminUserSummary, int64, error) {
	where, args := adminUserFilterSQL(filter)

	var total int64
	if err := r.db.Q(ctx).QueryRow(ctx,
		`SELECT count(*) FROM users `+where, args...).Scan(&total); err != nil {
		return nil, 0, mapError(err)
	}

	args = append(args, page.Limit(), page.Offset())
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT `+adminUserColumns+` FROM users `+where+`
		ORDER BY `+adminUserOrderSQL(filter)+`
		LIMIT $`+strconv.Itoa(len(args)-1)+` OFFSET $`+strconv.Itoa(len(args)), args...)
	if err != nil {
		return nil, 0, mapError(err)
	}
	defer rows.Close()

	items := make([]dto.AdminUserSummary, 0, page.Limit())
	for rows.Next() {
		var s dto.AdminUserSummary
		if err := rows.Scan(&s.ID, &s.FirstName, &s.MiddleName, &s.LastName, &s.Nickname,
			&s.Email, &s.IsActive, &s.IsAdmin, &s.AvatarURL, &s.TelegramUsername,
			&s.Locale, &s.Timezone, &s.Bio, &s.EmailVerifiedAt, &s.CreatedAt,
			&s.UpdatedAt); err != nil {
			return nil, 0, mapError(err)
		}
		s.Fill(locale.Default)
		items = append(items, s)
	}
	return items, total, mapError(rows.Err())
}
