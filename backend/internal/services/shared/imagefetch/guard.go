package imagefetch

import (
	"errors"
	"fmt"
	"net"
	"net/url"
	"strings"
)

var (
	ErrBlockedScheme      = errors.New("only http and https addresses are allowed")
	ErrBlockedHost        = errors.New("the address is not a public host")
	ErrBlockedDestination = errors.New("the address resolves to a non-public network")
	ErrUnresolvable       = errors.New("the address could not be resolved")
	ErrTooManyRedirects   = errors.New("too many redirects")
	ErrTooLarge           = errors.New("the response is larger than the limit")
	ErrNotAnImage         = errors.New("the response is not a supported image")
	ErrNoCover            = errors.New("the page declares no cover image")
)

var blockedIPv4Nets = []string{
	"0.0.0.0/8",
	"10.0.0.0/8",
	"100.64.0.0/10",
	"127.0.0.0/8",
	"169.254.0.0/16",
	"172.16.0.0/12",
	"192.0.0.0/24",
	"192.0.2.0/24",
	"192.88.99.0/24",
	"192.168.0.0/16",
	"198.18.0.0/15",
	"198.51.100.0/24",
	"203.0.113.0/24",
	"224.0.0.0/4",
	"240.0.0.0/4",
	"255.255.255.255/32",
}

var blockedIPv6Nets = []string{
	"::/128",
	"::1/128",
	"::ffff:0:0/96",
	"64:ff9b::/96",
	"100::/64",
	"2001:db8::/32",
	"fc00::/7",
	"fe80::/10",
	"ff00::/8",
}

var (
	blockedIPv4 = parseCIDRs(blockedIPv4Nets)
	blockedIPv6 = parseCIDRs(blockedIPv6Nets)
)

func parseCIDRs(cidrs []string) []*net.IPNet {
	all := make([]*net.IPNet, 0, len(cidrs))
	for _, cidr := range cidrs {
		_, network, err := net.ParseCIDR(cidr)
		if err != nil {
			panic("imagefetch: unparsable blocked CIDR " + cidr)
		}
		all = append(all, network)
	}
	return all
}

func AllowedIP(ip net.IP) bool {
	if ip == nil {
		return false
	}
	if !ip.IsGlobalUnicast() || ip.IsPrivate() ||
		ip.IsLoopback() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() ||
		ip.IsInterfaceLocalMulticast() || ip.IsMulticast() || ip.IsUnspecified() {
		return false
	}
	if v4 := ip.To4(); v4 != nil {
		return allowedIn(v4, blockedIPv4)
	}
	return allowedIn(ip, blockedIPv6)
}

func allowedIn(ip net.IP, networks []*net.IPNet) bool {
	for _, network := range networks {
		if network.Contains(ip) {
			return false
		}
	}
	return true
}

func CheckURL(raw string) (*url.URL, error) {
	return checkURLWith(raw, AllowedIP)
}

func checkURLWith(raw string, allowed func(net.IP) bool) (*url.URL, error) {
	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil {
		return nil, ErrBlockedHost
	}
	switch parsed.Scheme {
	case "http", "https":
	default:
		return nil, ErrBlockedScheme
	}
	host := parsed.Hostname()
	if host == "" {
		return nil, ErrBlockedHost
	}
	if literal := net.ParseIP(host); literal != nil {
		if !allowed(literal) {
			return nil, ErrBlockedDestination
		}
		return parsed, nil
	}
	if isBlockedName(host) {
		return nil, ErrBlockedHost
	}
	return parsed, nil
}

func isBlockedName(host string) bool {
	name := strings.ToLower(strings.TrimSuffix(host, "."))
	if name == "localhost" || strings.HasSuffix(name, ".localhost") {
		return true
	}
	for _, suffix := range []string{".local", ".internal", ".localdomain", ".home.arpa", ".onion"} {
		if strings.HasSuffix(name, suffix) {
			return true
		}
	}
	return !strings.Contains(name, ".")
}

func checkResolved(host string, addrs []net.IPAddr) error {
	return checkResolvedWith(host, addrs, AllowedIP)
}

func checkResolvedWith(host string, addrs []net.IPAddr, allowed func(net.IP) bool) error {
	if len(addrs) == 0 {
		return fmt.Errorf("%w: %s", ErrUnresolvable, host)
	}
	for i := range addrs {
		if !allowed(addrs[i].IP) {
			return ErrBlockedDestination
		}
	}
	return nil
}
