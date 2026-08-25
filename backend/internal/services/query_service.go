package services

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"

	"github.com/kaifarikman/hackathon-os-backend/internal/adapters/repositories"
	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

// QueryService обслуживает read-модели пользовательских и административных
// экранов (раздел 11 ТЗ). Изменений данных здесь нет: сервис собирает
// представление из репозиториев и отсекает поля, недоступные роли.
type QueryService struct {
	queries       *repositories.QueryRepository
	hackathons    *repositories.HackathonRepository
	stages        *repositories.StageRepository
	participants  *repositories.ParticipantRepository
	registrations *repositories.RegistrationRepository
	statuses      *repositories.StatusRepository
	now           func() time.Time
}

// NewQueryService создаёт сервис read-моделей.
func NewQueryService(queries *repositories.QueryRepository, hackathons *repositories.HackathonRepository,
	stages *repositories.StageRepository, participants *repositories.ParticipantRepository,
	registrations *repositories.RegistrationRepository, statuses *repositories.StatusRepository) *QueryService {
	return &QueryService{
		queries: queries, hackathons: hackathons, stages: stages, participants: participants,
		registrations: registrations, statuses: statuses,
		now: func() time.Time { return time.Now().UTC() },
	}
}

// MyHackathons возвращает страницу списка «Мои хакатоны»: опубликованные
// неархивные хакатоны с назначенным участием. Архивные доступны фильтром.
func (s *QueryService) MyHackathons(ctx context.Context, actor models.Actor, filter models.MyHackathonFilter,
	page models.Page) ([]models.MyHackathonItem, int64, error) {
	if actor.IsSystem() {
		return nil, 0, models.NewUnauthorized("требуется аутентификация")
	}
	return s.queries.MyHackathons(ctx, actor.UserID, filter, page, s.now())
}

// HackathonCard собирает карточку назначенного хакатона. Административные
// заметки участнику не отдаются, поэтому хакатон презентуется как непривилегированный.
func (s *QueryService) HackathonCard(ctx context.Context, actor models.Actor,
	hackathonID uuid.UUID) (*models.HackathonCard, error) {
	if actor.IsSystem() {
		return nil, models.NewUnauthorized("требуется аутентификация")
	}
	now := s.now()

	hackathon, err := s.hackathons.GetByID(ctx, hackathonID)
	if err != nil {
		return nil, err
	}
	if !hackathon.Published() {
		return nil, models.NewNotFound("хакатон не найден")
	}

	participant, err := s.participants.GetByHackathonUser(ctx, hackathonID, actor.UserID)
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			return nil, models.NewNotFound("вы не назначены на этот хакатон")
		}
		return nil, err
	}
	if !participant.Assigned() {
		return nil, models.NewNotFound("вы не назначены на этот хакатон")
	}

	stages, err := s.stages.ListByHackathon(ctx, hackathonID)
	if err != nil {
		return nil, err
	}
	nextStage, err := s.queries.NextStage(ctx, hackathonID, now)
	if err != nil {
		return nil, err
	}

	card := &models.HackathonCard{
		Hackathon: hackathonView(hackathon, now),
		TeamRole:  participant.TeamRole,
		Stages:    make([]models.StageResponse, 0, len(stages)),
		NextStage: nextStage,
	}
	for i := range stages {
		card.Stages = append(card.Stages, stageView(&stages[i]))
	}

	registration, err := s.registrations.GetByHackathon(ctx, hackathonID)
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			return card, nil
		}
		return nil, err
	}
	card.Registration = &models.RegistrationPublic{
		URL:         registration.URL,
		DeadlineAt:  registration.DeadlineAt,
		Description: registration.Description,
		State:       registration.State,
	}

	status, err := s.statuses.GetByParticipant(ctx, registration.ID, participant.ID)
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			return card, nil
		}
		return nil, err
	}
	card.RegistrationStatus = &models.RegistrationStatusShort{
		ID:           status.ID,
		Status:       status.Status,
		TodoCycle:    status.TodoCycle,
		RegisteredAt: status.RegisteredAt,
		Note:         status.Note,
	}
	// Самоотчёт доступен, пока хакатон не архивирован, регистрация включена,
	// а собственный статус остаётся TODO (раздел 8 ТЗ).
	card.CanMarkDone = !hackathon.Archived() && registration.Active() && status.Status == models.StatusTODO
	return card, nil
}

// MyTimeline возвращает временную шкалу пользователя: только назначенные
// опубликованные неархивные хакатоны.
func (s *QueryService) MyTimeline(ctx context.Context, actor models.Actor,
	filter models.TimelineFilter) (*models.TimelineResponse, error) {
	if actor.IsSystem() {
		return nil, models.NewUnauthorized("требуется аутентификация")
	}
	userID := actor.UserID
	rows, err := s.queries.TimelineRows(ctx, filter, &userID, s.now())
	if err != nil {
		return nil, err
	}
	return &models.TimelineResponse{
		Range: models.TimeRange{From: filter.From, To: filter.To},
		Rows:  rows,
	}, nil
}

// AdminTimeline возвращает административную временную шкалу по всем хакатонам.
func (s *QueryService) AdminTimeline(ctx context.Context, actor models.Actor,
	filter models.TimelineFilter) (*models.TimelineResponse, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("операция доступна только администратору")
	}
	rows, err := s.queries.TimelineRows(ctx, filter, nil, s.now())
	if err != nil {
		return nil, err
	}
	return &models.TimelineResponse{
		Range: models.TimeRange{From: filter.From, To: filter.To},
		Rows:  rows,
	}, nil
}

// Upcoming возвращает ближайшие дедлайны регистрации в пределах окна.
func (s *QueryService) Upcoming(ctx context.Context, actor models.Actor, within time.Duration,
	page models.Page) ([]models.DeadlineItem, int64, error) {
	if !actor.IsAdmin {
		return nil, 0, models.NewForbidden("операция доступна только администратору")
	}
	return s.queries.Deadlines(ctx, false, within, page, s.now())
}

// Overdue возвращает просроченные регистрации незавершённых хакатонов.
func (s *QueryService) Overdue(ctx context.Context, actor models.Actor,
	page models.Page) ([]models.DeadlineItem, int64, error) {
	if !actor.IsAdmin {
		return nil, 0, models.NewForbidden("операция доступна только администратору")
	}
	return s.queries.Deadlines(ctx, true, 0, page, s.now())
}

// hackathonView переводит хакатон в ответ участника: административные
// заметки в карточку не попадают.
func hackathonView(h *models.Hackathon, now time.Time) models.HackathonResponse {
	return models.HackathonResponse{
		ID:          h.ID,
		Title:       h.Title,
		Description: h.Description,
		Organizer:   h.Organizer,
		WebsiteURL:  h.WebsiteURL,
		StartAt:     h.StartAt,
		EndAt:       h.EndAt,
		State:       h.State(now),
		PublishedAt: h.PublishedAt,
		ArchivedAt:  h.ArchivedAt,
		CreatedAt:   h.CreatedAt,
		UpdatedAt:   h.UpdatedAt,
	}
}

// stageView переводит этап в ответ API.
func stageView(s *models.Stage) models.StageResponse {
	return models.StageResponse{
		ID:          s.ID,
		HackathonID: s.HackathonID,
		Name:        s.Name,
		Type:        s.Type,
		StartAt:     s.StartAt,
		EndAt:       s.EndAt,
		Description: s.Description,
		URL:         s.URL,
		SortOrder:   s.SortOrder,
		CreatedAt:   s.CreatedAt,
		UpdatedAt:   s.UpdatedAt,
	}
}
