package controllers

import (
	"net/http"

	"github.com/GoatWhistle/timeline/internal/controllers/realtime"
)

func mountCalendarFeed(mux *http.ServeMux, rt *routes, api string, c *realtime.CalendarFeedController) {
	mux.Handle("GET "+api+"/me/calendar-feed", rt.authd(c.Describe))
	mux.Handle("POST "+api+"/me/calendar-feed", rt.authd(c.Create))
	mux.Handle("POST "+api+"/me/calendar-feed/rotate", rt.authd(c.Rotate))
	mux.Handle("DELETE "+api+"/me/calendar-feed", rt.authd(c.Revoke))

	mux.Handle("GET "+api+"/calendar/{token}/feed.ics", http.HandlerFunc(c.Feed))
	mux.Handle("HEAD "+api+"/calendar/{token}/feed.ics", http.HandlerFunc(c.Feed))
}
