//go:build integration

package support

import (
	"net/http"
	"net/http/httptest"
	"time"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/event"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/identity"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/systemevent"
	"github.com/GoatWhistle/timeline/internal/config"
	svcauth "github.com/GoatWhistle/timeline/internal/services/auth"
	svcevent "github.com/GoatWhistle/timeline/internal/services/event"
	svcrealtime "github.com/GoatWhistle/timeline/internal/services/realtime"
	svcretention "github.com/GoatWhistle/timeline/internal/services/retention"
)

func (s *Stack) URL(path string) string { return s.server.URL + "/api/v1" + path }

func (s *Stack) Transport() http.RoundTripper { return s.server.Client().Transport }

func (s *Stack) AccessTTL() time.Duration { return s.cfg.Auth.AccessTTL }

func (s *Stack) DB() *postgres.DB { return s.db }

func (s *Stack) Config() *config.Config { return s.cfg }

func (s *Stack) Server() *httptest.Server { return s.server }

func (s *Stack) Feed() *svcrealtime.SystemEventService { return s.feed }

func (s *Stack) FeedRepo() *systemevent.Events { return s.feedRepo }

func (s *Stack) Hub() *svcrealtime.RealtimeHub { return s.hub }

func (s *Stack) Users() *identity.Users { return s.users }

func (s *Stack) Sessions() *identity.Sessions { return s.sessions }

func (s *Stack) Events() *event.Events { return s.events }

func (s *Stack) EventService() *svcevent.EventService { return s.eventSvc }

func (s *Stack) Retention() *svcretention.Service { return s.retention }

func (s *Stack) Auth() *svcauth.AuthService { return s.auth }
