package controllers

import (
	"net/http"

	"github.com/GoatWhistle/timeline/internal/controllers/personal"
)

func mountPersonal(mux *http.ServeMux, rt *routes, api string, c *personal.Controller) {
	mux.Handle("GET "+api+"/me/events/{id}/tasks", rt.authd(c.ListTasks))
	mux.Handle("POST "+api+"/me/events/{id}/tasks", rt.authd(c.CreateTask))
	mux.Handle("POST "+api+"/me/events/{id}/tasks/apply-template", rt.authd(c.ApplyTemplate))
	mux.Handle("PATCH "+api+"/me/tasks/{id}", rt.authd(c.UpdateTask))
	mux.Handle("DELETE "+api+"/me/tasks/{id}", rt.authd(c.DeleteTask))
	mux.Handle("GET "+api+"/me/checklist-templates", rt.authd(c.ListTemplates))
	mux.Handle("GET "+api+"/me/events/{id}/note", rt.authd(c.GetNote))
	mux.Handle("PUT "+api+"/me/events/{id}/note", rt.authd(c.SaveNote))
	mux.Handle("GET "+api+"/me/events/{id}/artifacts", rt.authd(c.ListArtifacts))
	mux.Handle("POST "+api+"/me/events/{id}/artifacts", rt.authd(c.CreateArtifact))
	mux.Handle("PATCH "+api+"/me/artifacts/{id}", rt.authd(c.UpdateArtifact))
	mux.Handle("DELETE "+api+"/me/artifacts/{id}", rt.authd(c.DeleteArtifact))
	mux.Handle("GET "+api+"/me/events/{id}/outcome", rt.authd(c.GetOutcome))
	mux.Handle("PUT "+api+"/me/events/{id}/outcome", rt.authd(c.SaveOutcome))
	mux.Handle("DELETE "+api+"/me/events/{id}/outcome", rt.authd(c.DeleteOutcome))
	mux.Handle("GET "+api+"/me/bookmarks", rt.authd(c.ListBookmarks))
	mux.Handle("PUT "+api+"/me/bookmarks/{id}", rt.authd(c.AddBookmark))
	mux.Handle("DELETE "+api+"/me/bookmarks/{id}", rt.authd(c.RemoveBookmark))
	mux.Handle("GET "+api+"/me/history", rt.authd(c.History))
	mux.Handle("GET "+api+"/me/events/{id}/retrospective", rt.authd(c.GetRetrospective))
	mux.Handle("PUT "+api+"/me/events/{id}/retrospective", rt.authd(c.SaveRetrospective))
	mux.Handle("DELETE "+api+"/me/events/{id}/retrospective", rt.authd(c.DeleteRetrospective))
}
