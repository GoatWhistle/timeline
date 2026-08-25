package controllers

import (
	"net/http"

	"github.com/kaifarikman/hackathon-os-backend/internal/controllers/httpx"
	"github.com/kaifarikman/hackathon-os-backend/internal/controllers/middleware"
	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

// UserController обслуживает административные операции над учётными записями.
type UserController struct {
	svc      UserService
	pageSize int
	pageMax  int
}

// NewUserController создаёт контроллер пользователей.
func NewUserController(svc UserService, pageSize, pageMax int) *UserController {
	return &UserController{svc: svc, pageSize: pageSize, pageMax: pageMax}
}

// Search godoc
//
//	@Summary		Поиск пользователей
//	@Description	Поиск по display_name и нормализованному email для выбора участников.
//	@Description	Возвращаются только минимальные поля; credentials и данные каналов не отдаются.
//	@Tags			users
//	@Produce		json
//	@Security		CookieAuth
//	@Param			query		query		string	false	"Строка поиска"
//	@Param			page		query		int		false	"Номер страницы"	default(1)
//	@Param			page_size	query		int		false	"Размер страницы"	default(50)
//	@Success		200			{object}	models.UserPage
//	@Failure		403			{object}	models.ErrorResponse
//	@Router			/admin/users [get]
func (c *UserController) Search(w http.ResponseWriter, r *http.Request) {
	page, err := httpx.ParsePage(r, c.pageSize, c.pageMax)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	items, total, err := c.svc.Search(r.Context(), middleware.ActorFrom(r), httpx.QueryTrimmed(r, "query"), page)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, models.UserPage{Items: items, Meta: httpx.Meta(page, total)})
}

// Deactivate godoc
//
//	@Summary		Деактивация пользователя
//	@Description	Отзывает сессии, удаляет привязку Telegram и переводит ожидающие уведомления в CANCELLED.
//	@Tags			users
//	@Produce		json
//	@Security		CookieAuth
//	@Param			id	path		string	true	"Идентификатор пользователя"	format(uuid)
//	@Success		200	{object}	models.MessageResponse
//	@Failure		403	{object}	models.ErrorResponse
//	@Failure		404	{object}	models.ErrorResponse
//	@Router			/admin/users/{id}/deactivate [post]
func (c *UserController) Deactivate(w http.ResponseWriter, r *http.Request) {
	c.setActive(w, r, false)
}

// Activate godoc
//
//	@Summary		Обратная активация пользователя
//	@Description	Восстанавливает доступ. Ранее отменённые уведомления не воскрешаются.
//	@Tags			users
//	@Produce		json
//	@Security		CookieAuth
//	@Param			id	path		string	true	"Идентификатор пользователя"	format(uuid)
//	@Success		200	{object}	models.MessageResponse
//	@Failure		403	{object}	models.ErrorResponse
//	@Failure		404	{object}	models.ErrorResponse
//	@Router			/admin/users/{id}/activate [post]
func (c *UserController) Activate(w http.ResponseWriter, r *http.Request) {
	c.setActive(w, r, true)
}

func (c *UserController) setActive(w http.ResponseWriter, r *http.Request, active bool) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	if err := c.svc.SetActive(r.Context(), middleware.ActorFrom(r), id, active); err != nil {
		httpx.Error(w, r, err)
		return
	}
	msg := "учётная запись деактивирована"
	if active {
		msg = "учётная запись активирована"
	}
	httpx.JSON(w, http.StatusOK, models.MessageResponse{Message: msg})
}

// Delete godoc
//
//	@Summary		Необратимое удаление пользователя
//	@Description	Удаляет credentials и каналы доставки, обезличивает имя и email.
//	@Description	Ссылки участия и записи аудита сохраняются.
//	@Tags			users
//	@Produce		json
//	@Security		CookieAuth
//	@Param			id	path		string	true	"Идентификатор пользователя"	format(uuid)
//	@Success		200	{object}	models.MessageResponse
//	@Failure		403	{object}	models.ErrorResponse
//	@Failure		404	{object}	models.ErrorResponse
//	@Router			/admin/users/{id} [delete]
func (c *UserController) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	if err := c.svc.Delete(r.Context(), middleware.ActorFrom(r), id); err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, models.MessageResponse{Message: "учётная запись удалена и обезличена"})
}
