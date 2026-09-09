package telegram

import (
	"context"
	"errors"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/GoatWhistle/timeline/internal/config"
)

func newClient(cfg config.Telegram) *http.Client {
	transport := &http.Transport{
		Proxy:               http.ProxyFromEnvironment,
		DialContext:         (&net.Dialer{Timeout: 30 * time.Second, KeepAlive: 30 * time.Second}).DialContext,
		ForceAttemptHTTP2:   true,
		TLSHandshakeTimeout: 5 * time.Second,
		IdleConnTimeout:     90 * time.Second,
		MaxIdleConns:        10,
	}
	if len(cfg.DirectIPs) > 0 {
		dialer := &net.Dialer{Timeout: 2 * time.Second, KeepAlive: 30 * time.Second}
		transport.DialContext = directDial(cfg.DirectIPs, dialer.DialContext)
	}
	return &http.Client{Transport: transport, CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
		return http.ErrUseLastResponse
	}}
}

type dialFunc func(context.Context, string, string) (net.Conn, error)

func directDial(ips []string, dial dialFunc) dialFunc {
	return func(ctx context.Context, network, address string) (net.Conn, error) {
		host, port, err := net.SplitHostPort(address)
		if err != nil || host != "api.telegram.org" {
			return dial(ctx, network, address)
		}
		for _, ip := range ips {
			conn, err := dial(ctx, network, net.JoinHostPort(ip, port))
			if err == nil {
				return conn, nil
			}
			if ctx.Err() != nil {
				return nil, ctx.Err()
			}
		}
		return dial(ctx, network, address)
	}
}

func (s *botSender) redactError(err error) error {
	if err == nil {
		return nil
	}
	message := err.Error()
	if s.cfg.BotToken != "" {
		message = strings.ReplaceAll(message, s.cfg.BotToken, "[redacted]")
	}
	return errors.New(message)
}
