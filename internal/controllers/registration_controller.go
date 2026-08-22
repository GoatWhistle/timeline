package controllers

import (
	"net/http"

	"github.com/google/uuid"

	"github.com/kaifarikman/hackathon-os-backend/internal/controllers/httpx"
	"github.com/kaifarikman/hackathon-os-backend/internal/controllers/middleware"
	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

// RegistrationController обслуживает регистрацию хакатона, статусы участников
// и правила напоминаний.
type RegistrationController struct {
	registrations RegistrationService
	statuses      StatusService
	rules         RuleService
	pageDef       int
	pageMax       int
}

// NewRegistrationController создаёт контроллер регистрации.
func NewRegistrationController(reg RegistrationService, st StatusService, rules RuleService, pageDef, pageMax int) *RegistrationController {
	return &RegistrationController{registrations: reg, statuses: st, rules: rules, pageDef: pageDef, pageMax: pageMax}
}

// Get godoc
//
//	@Summary		Регистрация хакатона
//	@Tags			registration
//	@Produce		json
//	@Security		CookieAuth
//	@Param			id	path		string	true	"Идентификатор хакатона"	format(uuid)
//	@Success		200	{object}	models.RegistrationResponse
//	@Failure		403	{object}	models.ErrorResponse
//	@Failure		404	{object}	models.ErrorResponse
//	@Router			/admin/hackathons/{id}/registration [get]
func (c *RegistrationController) Get(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	reg, err := c.registrations.Get(r.Context(), middleware.ActorFrom(r), id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, registrationResponse(reg))
}

// Create godoc
//
//	@Summary		Создание регистрации
//	@Description	Создание активной регистрации создаёт недостающие статусы TODO всем назначенным
//	@Description	участникам. Первичные уведомления создаются только для опубликованного неархивного
//	@Description	хакатона; иначе они откладываются до публикации. Дедлайн обязан удовлетворять
//	@Description	условию deadline_at <= hackathon.end_at.
//	@Tags			registration
//	@Accept			json
//	@Produce		json
//	@Security		CookieAuth
//	@Param			id		path		string							true	"Идентификатор хакатона"	format(uuid)
//	@Param			request	body		models.CreateRegistrationRequest	true	"Ссылка и дедлайн"
//	@Success		201		{object}	models.RegistrationResponse
//	@Failure		400		{object}	models.ErrorResponse
//	@Failure		403		{object}	models.ErrorResponse
//	@Failure		404		{object}	models.ErrorResponse
//	@Failure		409		{object}	models.ErrorResponse	"регистрация уже существует или дедлайн выходит за end_at"
//	@Router			/admin/hackathons/{id}/registration [post]
func (c *RegistrationController) Create(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req models.CreateRegistrationRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	reg, err := c.registrations.Create(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, registrationResponse(reg))
}

// Update godoc
//
//	@Summary		Изменение регистрации
//	@Description	Изменение ссылки увеличивает notification_content_version, изменение дедлайна —
//	@Description	schedule_version. В обоих случаях ожидающие уведомления отменяются, а актуальные
//	@Description	создаются согласованием с новым логическим ключом.
//	@Tags			registration
//	@Accept			json
//	@Produce		json
//	@Security		CookieAuth
//	@Param			id		path		string							true	"Идентификатор хакатона"	format(uuid)
//	@Param			request	body		models.UpdateRegistrationRequest	true	"Изменяемые поля"
//	@Success		200		{object}	models.RegistrationResponse
//	@Failure		400		{object}	models.ErrorResponse
//	@Failure		403		{object}	models.ErrorResponse
//	@Failure		404		{object}	models.ErrorResponse
//	@Failure		409		{object}	models.ErrorResponse
//	@Router			/admin/hackathons/{id}/registration [patch]
func (c *RegistrationController) Update(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req models.UpdateRegistrationRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	reg, err := c.registrations.Update(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, registrationResponse(reg))
}

// Enable godoc
//
//	@Summary		Включение регистрации
//	@Description	Увеличивает activation_version и schedule_version, создаёт недостающие статусы;
//	@Description	участники в TODO снова получают первичное уведомление.
//	@Tags			registration
//	@Produce		json
//	@Security		CookieAuth
//	@Param			id	path		string	true	"Идентификатор хакатона"	format(uuid)
//	@Success		200	{object}	models.RegistrationResponse
//	@Failure		403	{object}	models.ErrorResponse
//	@Failure		404	{object}	models.ErrorResponse
//	@Failure		409	{object}	models.ErrorResponse	"регистрация уже активна"
//	@Router			/admin/hackathons/{id}/registration/enable [post]
func (c *RegistrationController) Enable(w http.ResponseWriter, r *http.Request) {
	c.setState(w, r, models.RegistrationActive)
}

// Disable godoc
//
//	@Summary		Выключение регистрации
//	@Description	Ожидающие уведомления отменяются, статусы сохраняются, но перестают быть actionable.
//	@Tags			registration
//	@Produce		json
//	@Security		CookieAuth
//	@Param			id	path		string	true	"Идентификатор хакатона"	format(uuid)
//	@Success		200	{object}	models.RegistrationResponse
//	@Failure		403	{object}	models.ErrorResponse
//	@Failure		404	{object}	models.ErrorResponse
//	@Failure		409	{object}	models.ErrorResponse	"регистрация уже выключена"
//	@Router			/admin/hackathons/{id}/registration/disable [post]
func (c *RegistrationController) Disable(w http.ResponseWriter, r *http.Request) {
	c.setState(w, r, models.RegistrationDisabled)
}

func (c *RegistrationController) setState(w http.ResponseWriter, r *http.Request, state models.RegistrationState) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	reg, err := c.registrations.SetState(r.Context(), middleware.ActorFrom(r), id, state)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, registrationResponse(reg))
}

// ListStatuses godoc
//
//	@Summary		Статусы регистрации участников
//	@Tags			registration
//	@Produce		json
//	@Security		CookieAuth
//	@Param			id			path		string	true	"Идентификатор хакатона"	format(uuid)
//	@Param			page		query		int		false	"Номер страницы"			default(1)
//	@Param			page_size	query		int		false	"Размер страницы"			default(50)
//	@Success		200			{object}	models.RegistrationStatusPage
//	@Failure		403			{object}	models.ErrorResponse
//	@Failure		404			{object}	models.ErrorResponse
//	@Router			/admin/hackathons/{id}/registration-statuses [get]
func (c *RegistrationController) ListStatuses(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	page, err := httpx.ParsePage(r, c.pageDef, c.pageMax)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	items, total, err := c.statuses.List(r.Context(), middleware.ActorFrom(r), id, page)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, models.RegistrationStatusPage{Items: items, Meta: httpx.Meta(page, total)})
}

// MarkDone godoc
//
//	@Summary		Отметка о выполненной регистрации
//	@Description	Самоотчёт участника: перевод собственного статуса TODO в DONE. Доступен при активной
//	@Description	регистрации, назначенном участии и неархивном хакатоне. Система не проверяет внешний сайт.
//	@Tags			registration
//	@Produce		json
//	@Security		CookieAuth
//	@Param			id	path		string	true	"Идентификатор хакатона"	format(uuid)
//	@Success		200	{object}	models.RegistrationStatusResponse
//	@Failure		401	{object}	models.ErrorResponse
//	@Failure		403	{object}	models.ErrorResponse
//	@Failure		404	{object}	models.ErrorResponse
//	@Failure		409	{object}	models.ErrorResponse	"недопустимый переход состояния"
//	@Router			/hackathons/{id}/registration/done [post]
func (c *RegistrationController) MarkDone(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	st, err := c.statuses.MarkDone(r.Context(), middleware.ActorFrom(r), id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, st)
}

// AdminChangeStatus godoc
//
//	@Summary		Административный переход статуса
//	@Description	Допустимые переходы: TODO → DONE, DONE → TODO, TODO/DONE → NOT_REQUIRED,
//	@Description	NOT_REQUIRED → TODO. Вход в TODO увеличивает todo_cycle и очищает registered_at.
//	@Tags			registration
//	@Accept			json
//	@Produce		json
//	@Security		CookieAuth
//	@Param			id		path		string							true	"Идентификатор статуса"	format(uuid)
//	@Param			request	body		models.AdminChangeStatusRequest	true	"Новый статус"
//	@Success		200		{object}	models.RegistrationStatusResponse
//	@Failure		400		{object}	models.ErrorResponse
//	@Failure		403		{object}	models.ErrorResponse
//	@Failure		404		{object}	models.ErrorResponse
//	@Failure		409		{object}	models.ErrorResponse
//	@Router			/admin/registration-statuses/{id} [patch]
func (c *RegistrationController) AdminChangeStatus(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req models.AdminChangeStatusRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	st, err := c.statuses.AdminChange(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, st)
}

// BatchSetStatus godoc
//
//	@Summary		Массовая установка статуса
//	@Description	Допускаются значения TODO и NOT_REQUIRED. Результат возвращается по каждому участнику.
//	@Tags			registration
//	@Accept			json
//	@Produce		json
//	@Security		CookieAuth
//	@Param			id		path		string							true	"Идентификатор хакатона"	format(uuid)
//	@Param			request	body		models.BatchSetStatusRequest	true	"Участники и целевой статус"
//	@Success		200		{object}	models.BatchResult
//	@Failure		400		{object}	models.ErrorResponse
//	@Failure		403		{object}	models.ErrorResponse
//	@Failure		404		{object}	models.ErrorResponse
//	@Router			/admin/hackathons/{id}/registration-statuses/batch-set [post]
func (c *RegistrationController) BatchSetStatus(w http.ResponseWriter, r *http.Request) {
	id, req, ok := c.batchInput(w, r)
	if !ok {
		return
	}
	res, err := c.statuses.BatchSet(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, res)
}

// BatchSetStatusPreview godoc
//
//	@Summary		Предпросмотр массовой установки статуса
//	@Description	Возвращает количество изменяемых и пропускаемых записей без изменения данных.
//	@Tags			registration
//	@Accept			json
//	@Produce		json
//	@Security		CookieAuth
//	@Param			id		path		string							true	"Идентификатор хакатона"	format(uuid)
//	@Param			request	body		models.BatchSetStatusRequest	true	"Участники и целевой статус"
//	@Success		200		{object}	models.PreviewResponse
//	@Failure		400		{object}	models.ErrorResponse
//	@Failure		403		{object}	models.ErrorResponse
//	@Failure		404		{object}	models.ErrorResponse
//	@Router			/admin/hackathons/{id}/registration-statuses/batch-set/preview [post]
func (c *RegistrationController) BatchSetStatusPreview(w http.ResponseWriter, r *http.Request) {
	id, req, ok := c.batchInput(w, r)
	if !ok {
		return
	}
	res, err := c.statuses.BatchSetPreview(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, res)
}

func (c *RegistrationController) batchInput(w http.ResponseWriter, r *http.Request) (id uuid.UUID, req models.BatchSetStatusRequest, ok bool) {
	parsed, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return id, req, false
	}
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return id, req, false
	}
	return parsed, req, true
}

// ListRules godoc
//
//	@Summary		Правила напоминаний
//	@Tags			rules
//	@Produce		json
//	@Security		CookieAuth
//	@Param			id	path		string	true	"Идентификатор хакатона"	format(uuid)
//	@Success		200	{array}		models.NotificationRuleResponse
//	@Failure		403	{object}	models.ErrorResponse
//	@Failure		404	{object}	models.ErrorResponse
//	@Router			/admin/hackathons/{id}/registration/rules [get]
func (c *RegistrationController) ListRules(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	items, err := c.rules.List(r.Context(), middleware.ActorFrom(r), id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	out := make([]models.NotificationRuleResponse, 0, len(items))
	for i := range items {
		out = append(out, ruleResponse(&items[i]))
	}
	httpx.JSON(w, http.StatusOK, out)
}

// CreateRule godoc
//
//	@Summary		Создание правила напоминания
//	@Description	Знак offset_minutes задаёт тип: положительное значение — напоминание до дедлайна,
//	@Description	ноль — в момент дедлайна, отрицательное — уведомление о просрочке.
//	@Description	На регистрацию допускается не более 10 правил.
//	@Tags			rules
//	@Accept			json
//	@Produce		json
//	@Security		CookieAuth
//	@Param			id		path		string					true	"Идентификатор хакатона"	format(uuid)
//	@Param			request	body		models.CreateRuleRequest	true	"Параметры правила"
//	@Success		201		{object}	models.NotificationRuleResponse
//	@Failure		400		{object}	models.ErrorResponse
//	@Failure		403		{object}	models.ErrorResponse
//	@Failure		404		{object}	models.ErrorResponse
//	@Failure		409		{object}	models.ErrorResponse	"правило с таким смещением уже есть или исчерпан лимит слотов"
//	@Router			/admin/hackathons/{id}/registration/rules [post]
func (c *RegistrationController) CreateRule(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req models.CreateRuleRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	rule, err := c.rules.Create(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, ruleResponse(rule))
}

// UpdateRule godoc
//
//	@Summary		Изменение правила напоминания
//	@Description	Изменение полей расписания увеличивает schedule_version один раз на транзакцию
//	@Description	и запускает согласование уведомлений.
//	@Tags			rules
//	@Accept			json
//	@Produce		json
//	@Security		CookieAuth
//	@Param			id		path		string					true	"Идентификатор правила"	format(uuid)
//	@Param			request	body		models.UpdateRuleRequest	true	"Изменяемые поля"
//	@Success		200		{object}	models.NotificationRuleResponse
//	@Failure		400		{object}	models.ErrorResponse
//	@Failure		403		{object}	models.ErrorResponse
//	@Failure		404		{object}	models.ErrorResponse
//	@Failure		409		{object}	models.ErrorResponse
//	@Router			/admin/registration-rules/{id} [patch]
func (c *RegistrationController) UpdateRule(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req models.UpdateRuleRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	rule, err := c.rules.Update(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, ruleResponse(rule))
}

// DisableRule godoc
//
//	@Summary		Выключение правила напоминания
//	@Description	Правило переводится в enabled=false; строка сохраняется, чтобы занятый слот
//	@Description	и смещение оставались зафиксированными.
//	@Tags			rules
//	@Produce		json
//	@Security		CookieAuth
//	@Param			id	path	string	true	"Идентификатор правила"	format(uuid)
//	@Success		204	"правило выключено"
//	@Failure		403	{object}	models.ErrorResponse
//	@Failure		404	{object}	models.ErrorResponse
//	@Router			/admin/registration-rules/{id} [delete]
func (c *RegistrationController) DisableRule(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	if err := c.rules.Disable(r.Context(), middleware.ActorFrom(r), id); err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.NoContent(w)
}
