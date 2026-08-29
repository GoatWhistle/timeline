package controllers

import "net/http"

func mountResourceLinks(mux *http.ServeMux, rt *routes, api string, c *ResourceLinkController) {
	mux.Handle("GET "+api+"/events/{id}/links", rt.authd(c.List))
	mux.Handle("POST "+api+"/events/{id}/links", rt.admin(c.Create))
	mux.Handle("PATCH "+api+"/events/{id}/links/{linkId}", rt.admin(c.Update))
	mux.Handle("DELETE "+api+"/events/{id}/links/{linkId}", rt.admin(c.Delete))
	mux.Handle("GET "+api+"/me/events/{id}/links", rt.authd(c.ListPersonal))
	mux.Handle("POST "+api+"/me/events/{id}/links", rt.authd(c.CreatePersonal))
	mux.Handle("PATCH "+api+"/me/links/{id}", rt.authd(c.UpdatePersonal))
	mux.Handle("DELETE "+api+"/me/links/{id}", rt.authd(c.DeletePersonal))
}
