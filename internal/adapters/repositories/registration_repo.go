package repositories

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

// RegistrationRepository — доступ к регистрации хакатона.
type RegistrationRepository struct{ db *DB }

// NewRegistrationRepository создаёт репозиторий регистрации.
func NewRegistrationRepository(db *DB) *RegistrationRepository {
	return &RegistrationRepository{db: db}
}

const registrationColumns = `id, hackathon_id, url, deadline_at, hackathon_end_at, description,
	state, schedule_version, activation_version, notification_content_version, created_at, updated_at`

func scanRegistration(row pgx.Row) (*models.Registration, error) {
	var r models.Registration
	err := row.Scan(&r.ID, &r.HackathonID, &r.URL, &r.DeadlineAt, &r.HackathonEndAt, &r.Description,
		&r.State, &r.ScheduleVersion, &r.ActivationVersion, &r.NotificationContentVersion,
		&r.CreatedAt, &r.UpdatedAt)
	if err != nil {
		return nil, mapError(err)
	}
	return &r, nil
}

// Create сохраняет регистрацию. Копия окончания хакатона берётся из самой таблицы
// хакатонов, чтобы составной внешний ключ всегда был согласован.
func (r *RegistrationRepository) Create(ctx context.Context, hackathonID uuid.UUID, url string, deadline time.Time, description *string) (*models.Registration, error) {
	return scanRegistration(r.db.Q(ctx).QueryRow(ctx, `
		INSERT INTO registrations (hackathon_id, url, deadline_at, hackathon_end_at, description)
		SELECT $1, $2, $3, h.end_at, $4 FROM hackathons h WHERE h.id = $1
		RETURNING `+registrationColumns, hackathonID, url, deadline, description))
}

// GetByHackathon читает регистрацию хакатона.
func (r *RegistrationRepository) GetByHackathon(ctx context.Context, hackathonID uuid.UUID) (*models.Registration, error) {
	return scanRegistration(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+registrationColumns+` FROM registrations WHERE hackathon_id = $1`, hackathonID))
}

// GetByHackathonForUpdate читает регистрацию и блокирует строку до конца транзакции.
func (r *RegistrationRepository) GetByHackathonForUpdate(ctx context.Context, hackathonID uuid.UUID) (*models.Registration, error) {
	return scanRegistration(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+registrationColumns+` FROM registrations WHERE hackathon_id = $1 FOR UPDATE`, hackathonID))
}

// GetByID читает регистрацию по идентификатору.
func (r *RegistrationRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Registration, error) {
	return scanRegistration(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+registrationColumns+` FROM registrations WHERE id = $1`, id))
}

// Update изменяет поля регистрации и версии, затронутые изменением.
// Версии передаются явно: их пересчёт — решение сервисного слоя.
func (r *RegistrationRepository) Update(ctx context.Context, id uuid.UUID, url *string, deadline *time.Time,
	description *string, bumpSchedule, bumpContent bool) (*models.Registration, error) {
	return scanRegistration(r.db.Q(ctx).QueryRow(ctx, `
		UPDATE registrations SET
			url = COALESCE($2, url),
			deadline_at = COALESCE($3, deadline_at),
			description = COALESCE($4, description),
			schedule_version = schedule_version + CASE WHEN $5 THEN 1 ELSE 0 END,
			notification_content_version = notification_content_version + CASE WHEN $6 THEN 1 ELSE 0 END
		WHERE id = $1
		RETURNING `+registrationColumns, id, url, deadline, description, bumpSchedule, bumpContent))
}

// BumpScheduleVersion увеличивает версию расписания один раз на транзакцию.
func (r *RegistrationRepository) BumpScheduleVersion(ctx context.Context, id uuid.UUID) (*models.Registration, error) {
	return scanRegistration(r.db.Q(ctx).QueryRow(ctx, `
		UPDATE registrations SET schedule_version = schedule_version + 1 WHERE id = $1
		RETURNING `+registrationColumns, id))
}

// Activate включает регистрацию, увеличивая версии активации и расписания.
func (r *RegistrationRepository) Activate(ctx context.Context, id uuid.UUID) (*models.Registration, error) {
	return scanRegistration(r.db.Q(ctx).QueryRow(ctx, `
		UPDATE registrations SET
			state = 'ACTIVE',
			activation_version = activation_version + 1,
			schedule_version = schedule_version + 1
		WHERE id = $1 AND state = 'DISABLED'
		RETURNING `+registrationColumns, id))
}

// Disable выключает регистрацию.
func (r *RegistrationRepository) Disable(ctx context.Context, id uuid.UUID) (*models.Registration, error) {
	return scanRegistration(r.db.Q(ctx).QueryRow(ctx, `
		UPDATE registrations SET state = 'DISABLED'
		WHERE id = $1 AND state = 'ACTIVE'
		RETURNING `+registrationColumns, id))
}

// SyncHackathonEnd обновляет денормализованную копию окончания хакатона.
// Обычно она поддерживается каскадом; метод нужен процедурам починки данных.
func (r *RegistrationRepository) SyncHackathonEnd(ctx context.Context, hackathonID uuid.UUID) error {
	_, err := r.db.Q(ctx).Exec(ctx, `
		UPDATE registrations SET hackathon_end_at = h.end_at
		FROM hackathons h WHERE h.id = registrations.hackathon_id AND registrations.hackathon_id = $1`, hackathonID)
	return mapError(err)
}

// StatusRepository — доступ к статусам регистрации участников.
type StatusRepository struct{ db *DB }

// NewStatusRepository создаёт репозиторий статусов.
func NewStatusRepository(db *DB) *StatusRepository { return &StatusRepository{db: db} }

const statusColumns = `id, hackathon_id, registration_id, participant_id, status, todo_cycle,
	registered_at, last_change_source, last_changed_by_user_id, note, created_at, updated_at`

func scanStatus(row pgx.Row) (*models.RegistrationStatus, error) {
	var s models.RegistrationStatus
	err := row.Scan(&s.ID, &s.HackathonID, &s.RegistrationID, &s.ParticipantID, &s.Status, &s.TodoCycle,
		&s.RegisteredAt, &s.LastChangeSource, &s.LastChangedByUserID, &s.Note, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		return nil, mapError(err)
	}
	return &s, nil
}

// EnsureForParticipant создаёт статус TODO, если его ещё нет, и возвращает текущий.
func (r *StatusRepository) EnsureForParticipant(ctx context.Context, hackathonID, registrationID, participantID uuid.UUID) (*models.RegistrationStatus, bool, error) {
	row := r.db.Q(ctx).QueryRow(ctx, `
		INSERT INTO registration_statuses (hackathon_id, registration_id, participant_id, status, last_change_source)
		VALUES ($1, $2, $3, 'TODO', 'SYSTEM')
		ON CONFLICT (registration_id, participant_id) DO NOTHING
		RETURNING `+statusColumns, hackathonID, registrationID, participantID)

	status, err := scanStatus(row)
	if err == nil {
		return status, true, nil
	}
	if !errors.Is(err, models.ErrNotFound) {
		return nil, false, err
	}
	existing, err := r.GetByParticipant(ctx, registrationID, participantID)
	if err != nil {
		return nil, false, err
	}
	return existing, false, nil
}

// GetByID читает статус по идентификатору.
func (r *StatusRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.RegistrationStatus, error) {
	return scanStatus(r.db.Q(ctx).QueryRow(ctx, `SELECT `+statusColumns+` FROM registration_statuses WHERE id = $1`, id))
}

// GetByIDForUpdate читает статус и блокирует строку до конца транзакции.
func (r *StatusRepository) GetByIDForUpdate(ctx context.Context, id uuid.UUID) (*models.RegistrationStatus, error) {
	return scanStatus(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+statusColumns+` FROM registration_statuses WHERE id = $1 FOR UPDATE`, id))
}

// GetByParticipant читает статус участника в рамках регистрации.
func (r *StatusRepository) GetByParticipant(ctx context.Context, registrationID, participantID uuid.UUID) (*models.RegistrationStatus, error) {
	return scanStatus(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+statusColumns+` FROM registration_statuses
		 WHERE registration_id = $1 AND participant_id = $2`, registrationID, participantID))
}

// SetStatus переводит статус в новое значение. Вход в TODO увеличивает todo_cycle
// и очищает дату регистрации, выход из DONE тоже очищает её.
func (r *StatusRepository) SetStatus(ctx context.Context, id uuid.UUID, value models.RegistrationStatusValue,
	source models.ChangeSource, actor *uuid.UUID, note *string) (*models.RegistrationStatus, error) {
	return scanStatus(r.db.Q(ctx).QueryRow(ctx, `
		UPDATE registration_statuses SET
			status = $2,
			todo_cycle = todo_cycle + CASE WHEN $2 = 'TODO' AND status <> 'TODO' THEN 1 ELSE 0 END,
			registered_at = CASE WHEN $2 = 'DONE' THEN now() ELSE NULL END,
			last_change_source = $3,
			last_changed_by_user_id = $4,
			note = COALESCE($5, note)
		WHERE id = $1
		RETURNING `+statusColumns, id, value, source, actor, note))
}

// List возвращает страницу статусов хакатона с данными пользователя.
func (r *StatusRepository) List(ctx context.Context, hackathonID uuid.UUID, page models.Page) ([]models.RegistrationStatusResponse, int64, error) {
	var total int64
	if err := r.db.Q(ctx).QueryRow(ctx,
		`SELECT count(*) FROM registration_statuses WHERE hackathon_id = $1`, hackathonID).Scan(&total); err != nil {
		return nil, 0, mapError(err)
	}

	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT s.id, s.hackathon_id, s.registration_id, s.participant_id, s.status, s.todo_cycle,
		       s.registered_at, s.last_change_source, s.last_changed_by_user_id, s.note, s.updated_at,
		       u.id, u.display_name, u.email, u.is_active
		FROM registration_statuses s
		JOIN hackathon_participants p ON p.id = s.participant_id
		JOIN users u ON u.id = p.user_id
		WHERE s.hackathon_id = $1
		ORDER BY u.display_name
		LIMIT $2 OFFSET $3`, hackathonID, page.Limit(), page.Offset())
	if err != nil {
		return nil, 0, mapError(err)
	}
	defer rows.Close()

	items := make([]models.RegistrationStatusResponse, 0, page.Limit())
	for rows.Next() {
		var (
			item models.RegistrationStatusResponse
			user models.UserSummary
		)
		if err := rows.Scan(&item.ID, &item.HackathonID, &item.RegistrationID, &item.ParticipantID,
			&item.Status, &item.TodoCycle, &item.RegisteredAt, &item.LastChangeSource,
			&item.LastChangedByUserID, &item.Note, &item.UpdatedAt,
			&user.ID, &user.DisplayName, &user.Email, &user.IsActive); err != nil {
			return nil, 0, mapError(err)
		}
		item.User = &user
		items = append(items, item)
	}
	return items, total, mapError(rows.Err())
}

// RuleRepository — доступ к правилам напоминаний.
type RuleRepository struct{ db *DB }

// NewRuleRepository создаёт репозиторий правил.
func NewRuleRepository(db *DB) *RuleRepository { return &RuleRepository{db: db} }

const ruleColumns = `id, registration_id, offset_minutes, enabled, slot_no, channel_override,
	created_at, updated_at`

func scanRule(row pgx.Row) (*models.NotificationRule, error) {
	var r models.NotificationRule
	err := row.Scan(&r.ID, &r.RegistrationID, &r.OffsetMinutes, &r.Enabled, &r.SlotNo,
		&r.ChannelOverride, &r.CreatedAt, &r.UpdatedAt)
	if err != nil {
		return nil, mapError(err)
	}
	return &r, nil
}

// Create сохраняет правило напоминания.
func (r *RuleRepository) Create(ctx context.Context, rule *models.NotificationRule) (*models.NotificationRule, error) {
	return scanRule(r.db.Q(ctx).QueryRow(ctx, `
		INSERT INTO notification_rules (registration_id, offset_minutes, enabled, slot_no, channel_override)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING `+ruleColumns,
		rule.RegistrationID, rule.OffsetMinutes, rule.Enabled, rule.SlotNo, rule.ChannelOverride))
}

// GetByID читает правило по идентификатору.
func (r *RuleRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.NotificationRule, error) {
	return scanRule(r.db.Q(ctx).QueryRow(ctx, `SELECT `+ruleColumns+` FROM notification_rules WHERE id = $1`, id))
}

// Update изменяет правило.
func (r *RuleRepository) Update(ctx context.Context, id uuid.UUID, offset *int, enabled *bool,
	channel *models.Channel, clearChannel bool) (*models.NotificationRule, error) {
	return scanRule(r.db.Q(ctx).QueryRow(ctx, `
		UPDATE notification_rules SET
			offset_minutes = COALESCE($2, offset_minutes),
			enabled = COALESCE($3, enabled),
			channel_override = CASE WHEN $5 THEN NULL ELSE COALESCE($4, channel_override) END
		WHERE id = $1
		RETURNING `+ruleColumns, id, offset, enabled, channel, clearChannel))
}

// Disable выключает правило, сохраняя занятый слот и смещение.
func (r *RuleRepository) Disable(ctx context.Context, id uuid.UUID) error {
	tag, err := r.db.Q(ctx).Exec(ctx, `UPDATE notification_rules SET enabled = false WHERE id = $1`, id)
	if err != nil {
		return mapError(err)
	}
	if tag.RowsAffected() == 0 {
		return models.ErrNotFound
	}
	return nil
}

// ListByRegistration возвращает правила регистрации по возрастанию слота.
func (r *RuleRepository) ListByRegistration(ctx context.Context, registrationID uuid.UUID) ([]models.NotificationRule, error) {
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT `+ruleColumns+` FROM notification_rules WHERE registration_id = $1 ORDER BY slot_no`, registrationID)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	items := make([]models.NotificationRule, 0, 10)
	for rows.Next() {
		var rule models.NotificationRule
		if err := rows.Scan(&rule.ID, &rule.RegistrationID, &rule.OffsetMinutes, &rule.Enabled,
			&rule.SlotNo, &rule.ChannelOverride, &rule.CreatedAt, &rule.UpdatedAt); err != nil {
			return nil, mapError(err)
		}
		items = append(items, rule)
	}
	return items, mapError(rows.Err())
}

// NextFreeSlot подбирает наименьший свободный слот правила.
func (r *RuleRepository) NextFreeSlot(ctx context.Context, registrationID uuid.UUID, maxSlots int) (int, error) {
	var slot *int
	err := r.db.Q(ctx).QueryRow(ctx, `
		SELECT min(candidate) FROM generate_series(1, $2) AS candidate
		WHERE candidate NOT IN (SELECT slot_no FROM notification_rules WHERE registration_id = $1)`,
		registrationID, maxSlots).Scan(&slot)
	if err != nil {
		return 0, mapError(err)
	}
	if slot == nil {
		return 0, models.NewConflict("rule_limit_reached",
			"на регистрацию допускается не более "+itoa(maxSlots)+" правил")
	}
	return *slot, nil
}
