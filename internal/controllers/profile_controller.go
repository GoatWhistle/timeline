package controllers

import (
	"net/http"

	"github.com/kaifarikman/hackathon-os-backend/internal/controllers/httpx"
	"github.com/kaifarikman/hackathon-os-backend/internal/controllers/middleware"
	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

// ProfileController обслуживает собственный профиль пользователя.
type ProfileController struct {
	svc     ProfileService
	cookies CookieOptions
}

// NewProfileController создаёт контроллер профиля.
func NewProfileController(svc ProfileService, cookies CookieOptions) *ProfileController {
	return &ProfileController{svc: svc, cookies: cookies}
}

// Get godoc
//
//	@Summary	Собственный профиль
//	@Tags		profile
//	@Produce	json
//	@Security	CookieAuth
//	@Success	200	{object}	models.MeResponse
//	@Failure	401	{object}	models.ErrorResponse
//	@Router		/me [get]
func (c *ProfileController) Get(w http.ResponseWriter, r *http.Request) {
	user, err := c.svc.Get(r.Context(), middleware.ActorFrom(r).UserID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, meResponse(user))
}

// Update godoc
//
//	@Summary		Изменение собственного профиля
//	@Description	Флаг администратора, chat_id Telegram и пароль этим endpoint не изменяются.
//	@Tags			profile
//	@Accept			json
//	@Produce		json
//	@Security		CookieAuth
//	@Param			request	body		models.UpdateProfileRequest	true	"Изменяемые поля"
//	@Success		200		{object}	models.MeResponse
//	@Failure		400		{object}	models.ErrorResponse
//	@Failure		401		{object}	models.ErrorResponse
//	@Router			/me [patch]
func (c *ProfileController) Update(w http.ResponseWriter, r *http.Request) {
	var req models.UpdateProfileRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	user, err := c.svc.Update(r.Context(), middleware.ActorFrom(r), req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, meResponse(user))
}

// TelegramLink godoc
//
//	@Summary		Ссылка привязки Telegram
//	@Description	Возвращает одноразовый deep-link, связанный с текущим пользователем.
//	@Description	Идентификатор чата устанавливается только этим потоком.
//	@Tags			profile
//	@Produce		json
//	@Security		CookieAuth
//	@Success		200	{object}	models.TelegramLinkResponse
//	@Failure		401	{object}	models.ErrorResponse
//	@Router			/me/telegram/link [post]
func (c *ProfileController) TelegramLink(w http.ResponseWriter, r *http.Request) {
	link, expires, err := c.svc.StartTelegramLink(r.Context(), middleware.ActorFrom(r))
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, models.TelegramLinkResponse{DeepLink: link, ExpiresAt: expires})
}

// TelegramUnlink godoc
//
//	@Summary	Отвязка Telegram
//	@Tags		profile
//	@Produce	json
//	@Security	CookieAuth
//	@Success	200	{object}	models.MessageResponse
//	@Failure	401	{object}	models.ErrorResponse
//	@Router		/me/telegram [delete]
func (c *ProfileController) TelegramUnlink(w http.ResponseWriter, r *http.Request) {
	if err := c.svc.UnlinkTelegram(r.Context(), middleware.ActorFrom(r)); err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, models.MessageResponse{Message: "привязка Telegram удалена"})
}

// ChangeEmail godoc
//
//	@Summary		Запрос смены email
//	@Description	Новый адрес сохраняется как pending_email и становится основным только после подтверждения.
//	@Tags			profile
//	@Accept			json
//	@Produce		json
//	@Security		CookieAuth
//	@Param			request	body		models.ChangeEmailRequest	true	"Новый адрес и текущий пароль"
//	@Success		202		{object}	models.MessageResponse
//	@Failure		400		{object}	models.ErrorResponse
//	@Failure		401		{object}	models.ErrorResponse
//	@Failure		409		{object}	models.ErrorResponse	"адрес уже занят"
//	@Router			/me/email-change [post]
func (c *ProfileController) ChangeEmail(w http.ResponseWriter, r *http.Request) {
	var req models.ChangeEmailRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	if err := c.svc.RequestEmailChange(r.Context(), middleware.ActorFrom(r), req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusAccepted, models.MessageResponse{Message: "письмо подтверждения отправлено на новый адрес"})
}

// Deactivate godoc
//
//	@Summary		Деактивация собственной учётной записи
//	@Description	Отзывает сессии, удаляет привязку Telegram и отменяет ожидающие уведомления.
//	@Description	Обратная активация выполняется администратором.
//	@Tags			profile
//	@Produce		json
//	@Security		CookieAuth
//	@Success		200	{object}	models.MessageResponse
//	@Failure		401	{object}	models.ErrorResponse
//	@Router			/me/deactivate [post]
func (c *ProfileController) Deactivate(w http.ResponseWriter, r *http.Request) {
	if err := c.svc.Deactivate(r.Context(), middleware.ActorFrom(r)); err != nil {
		httpx.Error(w, r, err)
		return
	}
	c.cookies.Clear(w)
	httpx.JSON(w, http.StatusOK, models.MessageResponse{Message: "учётная запись деактивирована"})
}
