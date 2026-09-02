package cli

import (
	"github.com/GoatWhistle/timeline/internal/config"
	svcauth "github.com/GoatWhistle/timeline/internal/services/auth"
	svccover "github.com/GoatWhistle/timeline/internal/services/cover"
	"github.com/GoatWhistle/timeline/internal/services/shared/blobstore"
	"github.com/GoatWhistle/timeline/internal/services/shared/imagefetch"
)

func (c *container) wireAvatars(cfg *config.Config) error {
	blobs, err := blobstore.NewLocal(cfg.Avatar.Root)
	if err != nil {
		return err
	}
	c.avatars = svcauth.NewAvatarService(c.db, c.repos.users, blobs, c.audit, cfg.Avatar)
	return nil
}

func (c *container) wireCovers(cfg *config.Config) error {
	covers, err := blobstore.NewLocal(cfg.Cover.Root)
	if err != nil {
		return err
	}
	fetcher := imagefetch.New(imagefetch.Options{
		Timeout:      cfg.Cover.FetchTimeout,
		MaxRedirects: cfg.Cover.FetchMaxRe,
		MaxBytes:     cfg.Cover.FetchMaxByte,
		UserAgent:    cfg.Cover.UserAgent,
	})
	c.covers = svccover.NewService(c.db, c.repos.events, covers, fetcher, c.audit, cfg.Cover)
	c.events.WithCovers(c.covers)
	return nil
}
