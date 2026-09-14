package geoip

import (
	"log/slog"
	"net"
	"net/netip"

	"github.com/oschwald/geoip2-golang"

	"github.com/GoatWhistle/timeline/internal/models"
)

type Locator interface {
	Locate(ip string) models.SessionPlace
}

type emptyLocator struct{}

func (emptyLocator) Locate(string) models.SessionPlace { return models.SessionPlace{} }

func New(path string) Locator {
	if path == "" {
		slog.Warn("GEOIP_DATABASE_PATH is empty: session place is left undetermined")
		return emptyLocator{}
	}
	db, err := geoip2.Open(path)
	if err != nil {
		slog.Warn("the geoip database could not be opened: session place is left undetermined",
			"path", path, "error", err)
		return emptyLocator{}
	}
	slog.Info("the geoip database is open", "path", path)
	return &mmdbLocator{db: db}
}

type mmdbLocator struct{ db *geoip2.Reader }

func (l *mmdbLocator) Locate(ip string) models.SessionPlace {
	addr, err := netip.ParseAddr(ip)
	if err != nil || !Routable(addr) {
		return models.SessionPlace{}
	}
	record, err := l.db.City(net.IP(addr.AsSlice()))
	if err != nil || record == nil {
		return models.SessionPlace{}
	}
	return models.SessionPlace{
		CountryCode: countryCode(record.Country.IsoCode),
		City:        record.City.Names["en"],
	}
}

func countryCode(code string) string {
	if len(code) != 2 {
		return ""
	}
	for _, r := range code {
		if r < 'A' || r > 'Z' {
			return ""
		}
	}
	return code
}

func Routable(addr netip.Addr) bool {
	if !addr.IsValid() {
		return false
	}
	if addr.Is4In6() {
		addr = addr.Unmap()
	}
	return !addr.IsLoopback() && !addr.IsPrivate() && !addr.IsLinkLocalUnicast() &&
		!addr.IsLinkLocalMulticast() && !addr.IsInterfaceLocalMulticast() &&
		!addr.IsUnspecified() && !addr.IsMulticast() && !isSharedOrReserved(addr)
}

func isSharedOrReserved(addr netip.Addr) bool {
	if addr.Is4() {
		b := addr.As4()
		switch {
		case b[0] == 100 && b[1] >= 64 && b[1] <= 127:
			return true
		case b[0] == 192 && b[1] == 0 && b[2] == 0:
			return true
		case b[0] == 198 && (b[1] == 18 || b[1] == 19):
			return true
		}
		return false
	}
	return addr.Is6() && addr.As16()[0]&0xfe == 0xfc
}
