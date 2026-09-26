package query

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

type Catalog struct{ db *postgres.DB }

func NewCatalog(db *postgres.DB) *Catalog { return &Catalog{db: db} }

const catalogColumns = `e.id, e.display_id, e.title, e.description, e.organizer, e.website_url,
	e.kind, e.format, e.origin, e.country_code, e.city,
	e.prize_pool, e.prize_currency, e.team_size_min, e.team_size_max, e.start_at, e.end_at,
	e.color_slot, e.cover_manual_url, e.cover_auto_url, (p.id IS NOT NULL) AS joined,
	p.team_role, r.url, r.deadline_at, r.state,
	s.display_id, s.status, s.todo_cycle, s.registered_at`

const catalogFrom = `FROM events e
	LEFT JOIN event_participants p
		ON p.event_id = e.id AND p.user_id = $1 AND p.participation_status = 'ASSIGNED'
	LEFT JOIN registrations r ON r.event_id = e.id
	LEFT JOIN registration_statuses s ON s.participant_id = p.id`

func (r *Catalog) List(ctx context.Context, viewer uuid.UUID, filter dto.CatalogFilter,
	page models.Page, now time.Time) ([]dto.CatalogEvent, int64, error) {
	where, args := catalogFilterSQL(viewer, filter, now)

	var total int64
	if err := r.db.Q(ctx).QueryRow(ctx, `SELECT count(*) `+catalogFrom+` `+where, args...).Scan(&total); err != nil {
		return nil, 0, mapError(err)
	}

	args = append(args, page.Limit(), page.Offset())
	rows, err := r.db.Q(ctx).Query(ctx, `SELECT `+catalogColumns+` `+catalogFrom+` `+where+`
		ORDER BY `+catalogOrderSQL(filter.Sort)+`
		LIMIT $`+itoa(len(args)-1)+` OFFSET $`+itoa(len(args)), args...)
	if err != nil {
		return nil, 0, mapError(err)
	}
	defer rows.Close()

	items := make([]dto.CatalogEvent, 0, page.Limit())
	events := make([]models.Event, 0, page.Limit())
	ids := make([]uuid.UUID, 0, page.Limit())
	for rows.Next() {
		var c dto.CatalogEvent
		var rawID uuid.UUID
		var slot *int
		var manualCover, autoCover *string
		var reg catalogRegistration
		if err := rows.Scan(&rawID, &c.ID, &c.Title, &c.Description, &c.Organizer, &c.WebsiteURL,
			&c.Kind, &c.Format, &c.Origin, &c.CountryCode, &c.City,
			&c.PrizePool, &c.PrizeCurrency, &c.TeamSizeMin, &c.TeamSizeMax,
			&c.StartAt, &c.EndAt, &slot, &manualCover, &autoCover, &c.Joined,
			&c.TeamRole, &reg.url, &reg.deadline, &reg.state,
			&reg.statusID, &reg.status, &reg.todoCycle, &reg.registeredAt); err != nil {
			return nil, 0, mapError(err)
		}
		reg.applyTo(&c)
		c.Color = (&models.Event{Origin: c.Origin, ColorSlot: slot}).Color()
		c.CoverURL = (&models.Event{CoverManualURL: manualCover, CoverAutoURL: autoCover}).EffectiveCoverURL()
		c.State = catalogState(c.StartAt, c.EndAt, now)
		c.OfflineStages = []dto.CatalogPlace{}
		items = append(items, c)
		events = append(events, models.Event{Format: c.Format, CountryCode: c.CountryCode, City: c.City})
		ids = append(ids, rawID)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, mapError(err)
	}
	if err := r.attachPlaces(ctx, items, events, ids); err != nil {
		return nil, 0, err
	}
	if err := AttachTrackSummaries(ctx, r.db.Q(ctx), items, ids); err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

type catalogRegistration struct {
	url          *string
	deadline     *time.Time
	state        *models.RegistrationState
	statusID     *string
	status       *models.RegistrationStatusValue
	todoCycle    *int
	registeredAt *time.Time
}

func (g catalogRegistration) applyTo(c *dto.CatalogEvent) {
	if g.state != nil && *g.state == models.RegistrationActive {
		c.RegistrationURL = g.url
		c.RegistrationDeadline = g.deadline
	}
	if g.statusID != nil && g.status != nil && g.todoCycle != nil {
		c.RegistrationStatus = &dto.RegistrationStatusShort{
			ID: *g.statusID, Status: *g.status, TodoCycle: *g.todoCycle, RegisteredAt: g.registeredAt,
		}
	}
}

func (r *Catalog) attachPlaces(ctx context.Context, items []dto.CatalogEvent,
	events []models.Event, ids []uuid.UUID) error {
	if len(ids) == 0 {
		return nil
	}
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT event_id, id, display_id, name, type, start_at, end_at,
		       format, country_code, city, venue, online_url
		FROM stages WHERE event_id = ANY($1)
		ORDER BY sort_order, start_at`, ids)
	if err != nil {
		return mapError(err)
	}
	defer rows.Close()

	byEvent := make(map[uuid.UUID][]models.Stage, len(ids))
	for rows.Next() {
		var stage models.Stage
		if err := rows.Scan(&stage.EventID, &stage.ID, &stage.DisplayID, &stage.Name, &stage.Type,
			&stage.StartAt, &stage.EndAt, &stage.Format, &stage.CountryCode,
			&stage.City, &stage.Venue, &stage.OnlineURL); err != nil {
			return mapError(err)
		}
		byEvent[stage.EventID] = append(byEvent[stage.EventID], stage)
	}
	if err := rows.Err(); err != nil {
		return mapError(err)
	}

	for i := range items {
		stages := byEvent[ids[i]]
		items[i].EffectiveFormat = models.DeriveEventFormat(&events[i], stages)
		for _, stage := range models.OfflineStages(&events[i], stages) {
			items[i].OfflineStages = append(items[i].OfflineStages, dto.CatalogPlace{
				ID: stage.DisplayID, Name: stage.Name, Type: stage.Type,
				StartAt: stage.StartAt, EndAt: stage.EndAt,
				Place: stage.ResolvePlace(&events[i]),
			})
		}
	}
	return nil
}

var catalogSortColumns = map[models.CatalogSortField]string{
	models.CatalogSortStartAt:  "e.start_at",
	models.CatalogSortEndAt:    "e.end_at",
	models.CatalogSortTitle:    "lower(e.title)",
	models.CatalogSortDuration: "(e.end_at - e.start_at)",
	models.CatalogSortPrize:    "e.prize_pool",
	models.CatalogSortTeamMin:  "e.team_size_min",
	models.CatalogSortTeamMax:  "e.team_size_max",
	models.CatalogSortTracks:   "(SELECT count(*) FROM event_tracks et WHERE et.event_id = e.id)",
}

func catalogOrderSQL(sort models.CatalogSort) string {
	column, ok := catalogSortColumns[sort.Field]
	if !ok {
		column = catalogSortColumns[models.DefaultCatalogSort.Field]
	}
	direction := "ASC"
	if sort.Direction == models.CatalogSortDesc {
		direction = "DESC"
	}
	if sort.Field.Nullable() {
		direction += " NULLS LAST"
	}
	if sort.Field == models.CatalogSortTitle {
		return column + " " + direction + ", e.start_at ASC"
	}
	return column + " " + direction + ", lower(e.title) ASC"
}

func catalogState(start, end, now time.Time) models.EventState {
	switch {
	case now.Before(start):
		return models.EventUpcoming
	case now.After(end):
		return models.EventFinished
	default:
		return models.EventActive
	}
}
