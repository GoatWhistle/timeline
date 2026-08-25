package repositories

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

// SchedulerRepository — выборки планировщика согласования уведомлений.
type SchedulerRepository struct{ db *DB }

// NewSchedulerRepository создаёт репозиторий планировщика.
func NewSchedulerRepository(db *DB) *SchedulerRepository { return &SchedulerRepository{db: db} }

// Условие отбора одинаково для планировщика и для финальной проверки worker:
// опубликованный неархивный хакатон, активная регистрация, назначенный участник,
// статус TODO и активный получатель (раздел 9.4 ТЗ).
const reconcileWhere = `
	h.published_at IS NOT NULL
	AND h.archived_at IS NULL
	AND r.state = 'ACTIVE'
	AND p.participation_status = 'ASSIGNED'
	AND s.status = 'TODO'
	AND u.is_active
	AND u.deleted_at IS NULL`

const reconcileSelect = `
	SELECT h.id, h.title, h.end_at,
	       r.id, r.url, r.deadline_at, r.schedule_version, r.activation_version, r.notification_content_version,
	       p.id, p.assignment_version,
	       s.id, s.todo_cycle,
	       u.id, u.telegram_chat_id IS NOT NULL, u.email_verified_at IS NOT NULL, u.preferred_channel
	FROM registration_statuses s
	JOIN registrations r ON r.id = s.registration_id
	JOIN hackathons h ON h.id = s.hackathon_id
	JOIN hackathon_participants p ON p.id = s.participant_id
	JOIN users u ON u.id = p.user_id`

// Candidates возвращает страницу кандидатов согласования, отсортированную
// по идентификатору статуса: планировщик обходит их пакетами.
func (r *SchedulerRepository) Candidates(ctx context.Context, after uuid.UUID, limit int) ([]models.ReconcileCandidate, error) {
	rows, err := r.db.Q(ctx).Query(ctx, reconcileSelect+`
		WHERE`+reconcileWhere+`
		  AND ($1::uuid IS NULL OR s.id > $1)
		ORDER BY s.id
		LIMIT $2`, nullUUID(after), limit)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	items := make([]models.ReconcileCandidate, 0, limit)
	for rows.Next() {
		var c models.ReconcileCandidate
		if err := rows.Scan(&c.HackathonID, &c.HackathonTitle, &c.HackathonEndAt,
			&c.RegistrationID, &c.RegistrationURL, &c.DeadlineAt, &c.ScheduleVersion,
			&c.ActivationVersion, &c.ContentVersion,
			&c.ParticipantID, &c.AssignmentVersion,
			&c.StatusID, &c.TodoCycle,
			&c.RecipientID, &c.RecipientChannels.TelegramLinked, &c.RecipientChannels.EmailVerified,
			&c.RecipientChannels.PreferredChannel); err != nil {
			return nil, mapError(err)
		}
		items = append(items, c)
	}
	return items, mapError(rows.Err())
}

// CandidateByStatus повторно отбирает одного кандидата по идентификатору статуса.
// Используется worker перед вызовом провайдера: неактуальная запись отменяется.
func (r *SchedulerRepository) CandidateByStatus(ctx context.Context, statusID uuid.UUID) (*models.ReconcileCandidate, error) {
	var c models.ReconcileCandidate
	err := r.db.Q(ctx).QueryRow(ctx, reconcileSelect+`
		WHERE`+reconcileWhere+` AND s.id = $1`, statusID).
		Scan(&c.HackathonID, &c.HackathonTitle, &c.HackathonEndAt,
			&c.RegistrationID, &c.RegistrationURL, &c.DeadlineAt, &c.ScheduleVersion,
			&c.ActivationVersion, &c.ContentVersion,
			&c.ParticipantID, &c.AssignmentVersion,
			&c.StatusID, &c.TodoCycle,
			&c.RecipientID, &c.RecipientChannels.TelegramLinked, &c.RecipientChannels.EmailVerified,
			&c.RecipientChannels.PreferredChannel)
	if err != nil {
		return nil, mapError(err)
	}
	return &c, nil
}

// EnabledRules возвращает включённые правила указанных регистраций.
func (r *SchedulerRepository) EnabledRules(ctx context.Context, registrationIDs []uuid.UUID) (map[uuid.UUID][]models.NotificationRule, error) {
	result := make(map[uuid.UUID][]models.NotificationRule, len(registrationIDs))
	if len(registrationIDs) == 0 {
		return result, nil
	}
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT `+ruleColumns+` FROM notification_rules
		WHERE registration_id = ANY($1) AND enabled
		ORDER BY slot_no`, registrationIDs)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	for rows.Next() {
		var rule models.NotificationRule
		if err := rows.Scan(&rule.ID, &rule.RegistrationID, &rule.OffsetMinutes, &rule.Enabled,
			&rule.SlotNo, &rule.ChannelOverride, &rule.CreatedAt, &rule.UpdatedAt); err != nil {
			return nil, mapError(err)
		}
		result[rule.RegistrationID] = append(result[rule.RegistrationID], rule)
	}
	return result, mapError(rows.Err())
}

// Heartbeat — отметка времени последнего запуска фонового процесса.
type Heartbeat struct {
	Scheduler *time.Time
	Worker    *time.Time
}

// TouchHeartbeat сохраняет отметку последнего запуска процесса в служебной таблице.
func (r *SchedulerRepository) TouchHeartbeat(ctx context.Context, process string, at time.Time) error {
	_, err := r.db.Q(ctx).Exec(ctx, `
		INSERT INTO worker_heartbeats (process, last_run_at) VALUES ($1, $2)
		ON CONFLICT (process) DO UPDATE SET last_run_at = EXCLUDED.last_run_at`, process, at)
	return mapError(err)
}

// Heartbeats читает отметки фоновых процессов.
func (r *SchedulerRepository) Heartbeats(ctx context.Context) (*Heartbeat, error) {
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
