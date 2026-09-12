package notification

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/participation"
	"github.com/GoatWhistle/timeline/internal/models"
)

type Scheduler struct{ db *postgres.DB }

func NewScheduler(db *postgres.DB) *Scheduler { return &Scheduler{db: db} }

const reconcileWhere = `
	h.published_at IS NOT NULL
	AND h.archived_at IS NULL
	AND r.state = 'ACTIVE'
	AND p.participation_status = 'ASSIGNED'
	AND s.status = 'TODO'
	AND u.is_active
	AND u.deleted_at IS NULL`

const reconcileSelect = `
	SELECT h.id, h.display_id, h.title, h.end_at,
	       r.id, r.url, r.deadline_at, r.schedule_version, r.activation_version, r.notification_content_version,
	       p.id, p.assignment_version,
	       s.id, s.todo_cycle,
	       u.id, u.locale, u.timezone, u.telegram_chat_id IS NOT NULL, u.email_verified_at IS NOT NULL,
	       u.notification_channels,
	       COALESCE((SELECT array_agg(np.occasion || ':' || np.channel)
	                 FROM notification_preferences np
	                 WHERE np.user_id = u.id AND NOT np.enabled), '{}')
	FROM registration_statuses s
	JOIN registrations r ON r.id = s.registration_id
	JOIN events h ON h.id = s.event_id
	JOIN event_participants p ON p.id = s.participant_id
	JOIN users u ON u.id = p.user_id`

func (r *Scheduler) Candidates(ctx context.Context, after uuid.UUID, limit int) ([]models.ReconcileCandidate, error) {
	rows, err := r.db.Q(ctx).Query(ctx, reconcileSelect+`
		WHERE`+reconcileWhere+`
		  AND ($1::uuid IS NULL OR s.id > $1)
		ORDER BY s.id
		LIMIT $2`, postgres.NullUUID(after), limit)
	if err != nil {
		return nil, mapError(err)
	}
	return scanCandidates(rows, limit)
}

func (r *Scheduler) CandidatesForEvent(ctx context.Context, eventID, after uuid.UUID, limit int,
) ([]models.ReconcileCandidate, error) {
	rows, err := r.db.Q(ctx).Query(ctx, reconcileSelect+`
		WHERE`+reconcileWhere+`
		  AND s.event_id = $1
		  AND ($2::uuid IS NULL OR s.id > $2)
		ORDER BY s.id
		LIMIT $3`, eventID, postgres.NullUUID(after), limit)
	if err != nil {
		return nil, mapError(err)
	}
	return scanCandidates(rows, limit)
}

func scanCandidates(rows pgx.Rows, limit int) ([]models.ReconcileCandidate, error) {
	defer rows.Close()

	items := make([]models.ReconcileCandidate, 0, limit)
	for rows.Next() {
		c, err := scanCandidate(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, *c)
	}
	return items, mapError(rows.Err())
}

func scanCandidate(row pgx.Row) (*models.ReconcileCandidate, error) {
	var (
		c        models.ReconcileCandidate
		channels []string
		muted    []string
	)
	if err := row.Scan(&c.EventID, &c.EventDisplayID, &c.EventTitle, &c.EventEndAt,
		&c.RegistrationID, &c.RegistrationURL, &c.DeadlineAt, &c.ScheduleVersion,
		&c.ActivationVersion, &c.ContentVersion,
		&c.ParticipantID, &c.AssignmentVersion,
		&c.StatusID, &c.TodoCycle,
		&c.RecipientID, &c.RecipientLocale, &c.RecipientTimezone,
		&c.RecipientChannels.TelegramLinked, &c.RecipientChannels.EmailVerified,
		&channels, &muted); err != nil {
		return nil, mapError(err)
	}
	c.RecipientChannels.Selected = toChannelSet(channels)
	c.RecipientChannels.Preferences = mutedPreferences(muted)
	return &c, nil
}

func toChannelSet(values []string) models.ChannelSet {
	out := make(models.ChannelSet, 0, len(values))
	for _, v := range values {
		out = append(out, models.Channel(v))
	}
	return out
}

func mutedPreferences(tokens []string) models.NotificationPreferences {
	out := make(models.NotificationPreferences, len(tokens))
	for _, token := range tokens {
		occasion, channel, ok := splitPreferenceToken(token)
		if !ok {
			continue
		}
		out[occasion] = append(out[occasion], channel)
	}
	return out
}

func splitPreferenceToken(token string) (models.NotificationOccasion, models.Channel, bool) {
	for i := len(token) - 1; i >= 0; i-- {
		if token[i] == ':' {
			return models.NotificationOccasion(token[:i]), models.Channel(token[i+1:]), true
		}
	}
	return "", "", false
}

func (r *Scheduler) CandidateByStatus(ctx context.Context, statusID uuid.UUID) (*models.ReconcileCandidate, error) {
	return scanCandidate(r.db.Q(ctx).QueryRow(ctx, reconcileSelect+`
		WHERE`+reconcileWhere+` AND s.id = $1`, statusID))
}

func (r *Scheduler) EnabledRules(ctx context.Context, registrationIDs []uuid.UUID) (map[uuid.UUID][]models.NotificationRule, error) {
	result := make(map[uuid.UUID][]models.NotificationRule, len(registrationIDs))
	if len(registrationIDs) == 0 {
		return result, nil
	}
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT `+participation.RuleColumns+` FROM notification_rules
		WHERE registration_id = ANY($1) AND enabled
		ORDER BY slot_no`, registrationIDs)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	for rows.Next() {
		rule, err := participation.ScanRule(rows)
		if err != nil {
			return nil, err
		}
		result[rule.RegistrationID] = append(result[rule.RegistrationID], *rule)
	}
	return result, mapError(rows.Err())
}

type Heartbeat struct {
	Scheduler *time.Time
	Worker    *time.Time
}

func (r *Scheduler) TouchHeartbeat(ctx context.Context, process string, at time.Time) error {
	_, err := r.db.Q(ctx).Exec(ctx, `
		INSERT INTO worker_heartbeats (process, last_run_at) VALUES ($1, $2)
		ON CONFLICT (process) DO UPDATE SET last_run_at = EXCLUDED.last_run_at`, process, at)
	return mapError(err)
}

func (r *Scheduler) Heartbeats(ctx context.Context) (*Heartbeat, error) {
	rows, err := r.db.Q(ctx).Query(ctx, `SELECT process, last_run_at FROM worker_heartbeats`)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	hb := &Heartbeat{}
	for rows.Next() {
		var (
			process string
			at      time.Time
		)
		if err := rows.Scan(&process, &at); err != nil {
			return nil, mapError(err)
		}
		value := at
		switch process {
		case "scheduler":
			hb.Scheduler = &value
		case "worker":
			hb.Worker = &value
		}
	}
	return hb, mapError(rows.Err())
}
