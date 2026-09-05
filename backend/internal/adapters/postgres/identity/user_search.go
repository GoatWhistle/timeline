package identity

import (
	"context"
	"strings"

	"github.com/GoatWhistle/timeline/internal/locale"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

func (r *Users) Search(ctx context.Context, query string, page models.Page) ([]dto.UserSummary, int64, error) {
	pattern := "%" + strings.ToLower(strings.TrimSpace(query)) + "%"
	var total int64
	err := r.db.Q(ctx).QueryRow(ctx, `
		SELECT count(*) FROM users
		WHERE deleted_at IS NULL AND ($1 = '%%' OR lower(first_name) LIKE $1
			OR lower(last_name) LIKE $1 OR lower(nickname) LIKE $1 OR email LIKE $1)`,
		pattern).Scan(&total)
	if err != nil {
		return nil, 0, mapError(err)
	}

	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT display_id, first_name, middle_name, last_name, nickname, email, is_active FROM users
		WHERE deleted_at IS NULL AND ($1 = '%%' OR lower(first_name) LIKE $1
			OR lower(last_name) LIKE $1 OR lower(nickname) LIKE $1 OR email LIKE $1)
		ORDER BY lower(last_name), lower(first_name), email
		LIMIT $2 OFFSET $3`, pattern, page.Limit(), page.Offset())
	if err != nil {
		return nil, 0, mapError(err)
	}
	defer rows.Close()

	items := make([]dto.UserSummary, 0, page.Limit())
	for rows.Next() {
		var s dto.UserSummary
		if err := rows.Scan(&s.ID, &s.FirstName, &s.MiddleName, &s.LastName,
			&s.Nickname, &s.Email, &s.IsActive); err != nil {
			return nil, 0, mapError(err)
		}
		s.Fill(locale.Default)
		items = append(items, s)
	}
	return items, total, mapError(rows.Err())
}
