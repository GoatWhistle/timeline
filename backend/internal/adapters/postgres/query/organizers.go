package query

import (
	"context"
	"strings"
)

const organizerVisible = `e.organizer IS NOT NULL AND btrim(e.organizer) <> ''`

const organizerPublished = `e.published_at IS NOT NULL AND e.archived_at IS NULL`

func (r *Catalog) Organizers(ctx context.Context, admin bool, search string,
	limit int) ([]string, error) {
	conds := []string{organizerVisible}
	if !admin {
		conds = append(conds, organizerPublished)
	}

	args := make([]any, 0, 2)
	if trimmed := strings.TrimSpace(search); trimmed != "" {
		args = append(args, "%"+strings.ToLower(trimmed)+"%")
		conds = append(conds, `lower(e.organizer) LIKE $`+itoa(len(args)))
	}
	args = append(args, limit)

	rows, err := r.db.Q(ctx).Query(ctx, `SELECT DISTINCT btrim(e.organizer) AS name
		FROM events e
		WHERE `+strings.Join(conds, " AND ")+`
		ORDER BY name
		LIMIT $`+itoa(len(args)), args...)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	out := make([]string, 0, limit)
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return nil, mapError(err)
		}
		out = append(out, name)
	}
	if err := rows.Err(); err != nil {
		return nil, mapError(err)
	}
	return out, nil
}
