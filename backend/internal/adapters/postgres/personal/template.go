package personal

import (
	"context"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/models"
)

type Templates struct{ db *postgres.DB }

func NewTemplates(db *postgres.DB) *Templates { return &Templates{db: db} }

func (r *Templates) List(ctx context.Context) ([]models.ChecklistTemplate, error) {
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT t.id, i.slot_no, i.title_key, i.due_offset_minutes
		FROM checklist_templates t
		JOIN checklist_template_items i ON i.template_id = t.id
		ORDER BY t.sort_order, t.id, i.slot_no`)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	items := make([]models.ChecklistTemplate, 0, 4)
	index := make(map[string]int, 4)
	for rows.Next() {
		var (
			id   string
			item models.ChecklistTemplateItem
		)
		if err := rows.Scan(&id, &item.SlotNo, &item.TitleKey, &item.DueOffsetMinutes); err != nil {
			return nil, mapError(err)
		}
		pos, ok := index[id]
		if !ok {
			items = append(items, models.ChecklistTemplate{
				ID:    id,
				Items: make([]models.ChecklistTemplateItem, 0, 8),
			})
			pos = len(items) - 1
			index[id] = pos
		}
		items[pos].Items = append(items[pos].Items, item)
	}
	return items, mapError(rows.Err())
}

func (r *Templates) Get(ctx context.Context, id string) (*models.ChecklistTemplate, error) {
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT i.slot_no, i.title_key, i.due_offset_minutes
		FROM checklist_templates t
		JOIN checklist_template_items i ON i.template_id = t.id
		WHERE t.id = $1
		ORDER BY i.slot_no`, id)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	template := models.ChecklistTemplate{
		ID:    id,
		Items: make([]models.ChecklistTemplateItem, 0, 8),
	}
	for rows.Next() {
		var item models.ChecklistTemplateItem
		if err := rows.Scan(&item.SlotNo, &item.TitleKey, &item.DueOffsetMinutes); err != nil {
			return nil, mapError(err)
		}
		template.Items = append(template.Items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, mapError(err)
	}
	if len(template.Items) == 0 {
		return nil, models.ErrNotFound
	}
	return &template, nil
}
