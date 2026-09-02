package imagefetch

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"syscall"
	"time"
)

type Options struct {
	Timeout      time.Duration
	MaxRedirects int
	MaxBytes     int64
	UserAgent    string
	Resolver     Resolver

	policy func(net.IP) bool
}

type Resolver interface {
	LookupIPAddr(ctx context.Context, host string) ([]net.IPAddr, error)
}

type Client struct {
	http *http.Client
	opts Options
}

const defaultUserAgent = "TimelineCoverBot/1.0"

func New(opts Options) *Client {
	if opts.Timeout <= 0 {
		opts.Timeout = 10 * time.Second
	}
	if opts.MaxRedirects < 0 {
		opts.MaxRedirects = 0
	}
	if opts.MaxBytes <= 0 {
		opts.MaxBytes = 5 << 20
	}
	if opts.UserAgent == "" {
		opts.UserAgent = defaultUserAgent
	}
	if opts.Resolver == nil {
		opts.Resolver = net.DefaultResolver
	}
	if opts.policy == nil {
		opts.policy = AllowedIP
	}

	c := &Client{opts: opts}
	c.http = &http.Client{
		Timeout:       opts.Timeout,
		Transport:     c.transport(),
		CheckRedirect: c.checkRedirect,
	}
	return c
}

func (c *Client) transport() *http.Transport {
	dialer := &net.Dialer{
		Timeout:   c.opts.Timeout,
		KeepAlive: -1,
		Control: func(_, address string, _ syscall.RawConn) error {
			host, _, err := net.SplitHostPort(address)
			if err != nil {
				return ErrBlockedDestination
			}
			if !c.allowed(net.ParseIP(host)) {
				return ErrBlockedDestination
			}
			return nil
		},
	}
	return &http.Transport{
		DialContext:           c.dialGuarded(dialer),
		DisableKeepAlives:     true,
		MaxIdleConns:          1,
		TLSHandshakeTimeout:   c.opts.Timeout,
		ResponseHeaderTimeout: c.opts.Timeout,
		ExpectContinueTimeout: time.Second,
		Proxy:                 nil,
	}
}

func (c *Client) dialGuarded(dialer *net.Dialer) func(context.Context, string, string) (net.Conn, error) {
	return func(ctx context.Context, network, address string) (net.Conn, error) {
		host, port, err := net.SplitHostPort(address)
		if err != nil {
			return nil, ErrBlockedDestination
		}
		addrs, err := c.opts.Resolver.LookupIPAddr(ctx, host)
		if err != nil {
			return nil, fmt.Errorf("%w: %s", ErrUnresolvable, host)
		}
		if err := checkResolvedWith(host, addrs, c.allowed); err != nil {
			return nil, err
		}
		var lastErr error
		for i := range addrs {
			conn, dialErr := dialer.DialContext(ctx, network, net.JoinHostPort(addrs[i].IP.String(), port))
			if dialErr == nil {
				return conn, nil
			}
			if errors.Is(dialErr, ErrBlockedDestination) {
				return nil, ErrBlockedDestination
			}
			lastErr = dialErr
		}
		return nil, lastErr
	}
}

func (c *Client) allowed(ip net.IP) bool {
	return ip != nil && c.opts.policy(ip)
}

func (c *Client) checkRedirect(req *http.Request, via []*http.Request) error {
	if len(via) > c.opts.MaxRedirects {
		return ErrTooManyRedirects
	}
	if _, err := c.checkURL(req.URL.String()); err != nil {
		return err
	}
	req.Header.Set("User-Agent", c.opts.UserAgent)
	return nil
}

func (c *Client) checkURL(raw string) (*url.URL, error) {
	return checkURLWith(raw, c.allowed)
}

func (c *Client) get(ctx context.Context, target string, accept string) (*http.Response, error) {
	parsed, err := c.checkURL(target)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, parsed.String(), nil)
	if err != nil {
		return nil, ErrBlockedHost
	}
	req.Header.Set("User-Agent", c.opts.UserAgent)
	req.Header.Set("Accept", accept)
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, unwrapGuardError(err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		_ = resp.Body.Close()
		return nil, fmt.Errorf("fetch %s: unexpected status %d", parsed.Redacted(), resp.StatusCode)
	}
	return resp, nil
}

func unwrapGuardError(err error) error {
	for _, guard := range []error{
		ErrBlockedDestination, ErrBlockedScheme, ErrBlockedHost,
		ErrTooManyRedirects, ErrUnresolvable,
	} {
		if errors.Is(err, guard) {
			return guard
		}
	}
	return err
}

func (c *Client) readCapped(body io.Reader) ([]byte, error) {
	data, err := io.ReadAll(io.LimitReader(body, c.opts.MaxBytes+1))
	if err != nil {
		return nil, err
	}
	if int64(len(data)) > c.opts.MaxBytes {
		return nil, ErrTooLarge
	}
	return data, nil
}
