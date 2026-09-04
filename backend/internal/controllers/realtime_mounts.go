package controllers

import (
	"net/http"

	"github.com/GoatWhistle/timeline/internal/controllers/realtime"
)

func mountRealtime(mux *http.ServeMux, rt *routes, api string, deps Deps) {
	feedC := realtime.NewSystemEventController(deps.Feed, deps.Limiter, deps.FeedRate,
		deps.FeedRateWindow, deps.PageDefault, deps.PageMax)
	mux.Handle("GET "+api+"/me/events-feed", rt.authd(feedC.List))
	mux.Handle("GET "+api+"/me/events-feed/unread-count", rt.authd(feedC.UnreadCount))
	mux.Handle("POST "+api+"/me/events-feed/read", rt.authd(feedC.MarkRead))

	if deps.Realtime == nil || deps.Sessions == nil {
		return
	}
	realtimeC := realtime.NewController(deps.Realtime, deps.Sessions, deps.CORSOrigins,
		deps.RealtimePing, deps.Limiter, deps.RealtimeRate, deps.RealtimeRateWindow)
	mux.Handle("GET "+api+"/realtime", rt.authd(realtimeC.Connect))
}
