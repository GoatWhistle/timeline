package controllers

import (
	"net/http"

	"github.com/GoatWhistle/timeline/internal/controllers/event"
)

func mountResourceLinks(mux *http.ServeMux, rt *routes, api string, c *event.ResourceLinkController) {
	mux.Handle("GET "+api+"/events/{id}/links", rt.authd(c.List))
	mux.Handle("POST "+api+"/events/{id}/links", rt.admin(c.Create))
	mux.Handle("PATCH "+api+"/events/{id}/links/{linkId}", rt.admin(c.Update))
	mux.Handle("DELETE "+api+"/events/{id}/links/{linkId}", rt.admin(c.Delete))
}
