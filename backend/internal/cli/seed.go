package cli

import (
	"context"
	"errors"
	"fmt"
	"log/slog"

	"github.com/spf13/cobra"

	"github.com/GoatWhistle/timeline/internal/models"
)

func init() {
	commandBuilders = append(commandBuilders, newSeedCmd)
}

type seedEvent struct {
	title       string
	description string
	organizer   string
	website     string
	kind        models.EventKind
	format      models.EventFormat
	origin      models.EventOrigin
	countryCode string
	city        string
	tracks      []seedTrack
	prizePool   string
	currency    string
	teamMin     int
	teamMax     int
	startAt     string
	endAt       string
	publish     bool
}

type seedTrack struct {
	name        string
	description string
	prizes      []int64
}

func newSeedCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "seed",
		Short: "Fill an empty database with real hackathons",
		Long: "Creates six hackathons taken from WeMakeDevs and lablab.ai, with their real dates, " +
			"prize pools and sites. Covers are not supplied: the server fetches each one from the " +
			"event's own page, the same og:image a messenger shows in a link preview. Running it " +
			"again adds nothing — an event whose title already exists is skipped.",
		RunE: func(cmd *cobra.Command, args []string) error {
			return runSeed(cmd.Context())
		},
	}
}

func runSeed(ctx context.Context) error {
	c, err := newContainer(ctx)
	if err != nil {
		return err
	}
	defer c.Close()

	admin, err := c.repos.users.GetByEmail(ctx, c.cfg.Auth.FirstAdminEmail)
	if err != nil {
		return fmt.Errorf("the seed needs the first administrator: run `admin create` first: %w", err)
	}
	actor := models.Actor{UserID: admin.ID, IsAdmin: true}

	var created, skipped int
	for _, item := range seedEvents {
		event, err := seedOne(ctx, c, actor, item)
		if errors.Is(err, errSeedExists) {
			skipped++
			continue
		}
		if err != nil {
			return fmt.Errorf("seeding %q: %w", item.title, err)
		}
		created++
		slog.InfoContext(ctx, "seeded an event",
			slog.String("event", event.DisplayID), slog.String("title", event.Title))
	}

	if c.covers != nil {
		slog.InfoContext(ctx, "waiting for the covers each site is still handing over")
		c.covers.WaitForBackground()
	}

	slog.InfoContext(ctx, "seed finished",
		slog.Int("created", created), slog.Int("skipped", skipped))
	return nil
}

var errSeedExists = errors.New("an event with this title already exists")
