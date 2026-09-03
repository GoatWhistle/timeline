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
	track       string
	prizePool   string
	currency    string
	teamMin     int
	teamMax     int
	startAt     string
	endAt       string
	publish     bool
}

var seedEvents = []seedEvent{
	{
		title: "Into the Scrape-Verse",
		description: "Build self-healing web scrapers: collectors that repair themselves when a site " +
			"changes its layout, instead of breaking overnight. Title sponsor Bright Data.",
		organizer:   "WeMakeDevs",
		website:     "https://www.wemakedevs.org/hackathons/scrape-verse",
		kind:        models.EventKindHackathon,
		format:      models.FormatHybrid,
		origin:      models.OriginWorld,
		countryCode: "US",
		city:        "San Francisco",
		track:       "Self-healing web scraping",
		prizePool:   "15000.00",
		currency:    "USD",
		teamMin:     1,
		teamMax:     4,
		startAt:     "2026-08-17T09:00:00Z",
		endAt:       "2026-08-23T21:00:00Z",
		publish:     true,
	},
	{
		title: "The Agent Harness Hackathon",
		description: "Give AI models a licence to act: build agent harnesses with tool access, " +
			"code sandboxing and human approval gates. Run with TrueFoundry.",
		organizer:   "WeMakeDevs",
		website:     "https://www.wemakedevs.org/hackathons/trueforge",
		kind:        models.EventKindHackathon,
		format:      models.FormatHybrid,
		origin:      models.OriginWorld,
		countryCode: "US",
		city:        "San Francisco",
		track:       "Agent harnesses",
		prizePool:   "10000.00",
		currency:    "USD",
		teamMin:     1,
		teamMax:     4,
		startAt:     "2026-08-24T07:00:00Z",
		endAt:       "2026-08-30T19:00:00Z",
		publish:     true,
	},
	{
		title: "Alpaca AI Trading Agents Hackathon",
		description: "Code the next generation of algorithmic trading: autonomous agents and " +
			"trading apps built on Alpaca's Trading API, MCP server and CLI.",
		organizer: "lablab.ai",
		website:   "https://lablab.ai/ai-hackathons/alpaca-ai-trading-agents-hackathon",
		kind:      models.EventKindHackathon,
		format:    models.FormatOnline,
		origin:    models.OriginWorld,
		track:     "Trading agents",
		prizePool: "6300.00",
		currency:  "USD",
		teamMin:   1,
		teamMax:   5,
		startAt:   "2026-08-28T15:00:00Z",
		endAt:     "2026-09-04T23:00:00Z",
		publish:   true,
	},
	{
		title: "AssemblyAI Voice Agent Hackathon",
		description: "The fastest path to a working voice agent: a month-long build on " +
			"AssemblyAI's voice infrastructure. Prize pool is half cash, half API credits.",
		organizer: "lablab.ai",
		website:   "https://lablab.ai/ai-hackathons/assemblyai-voice-agent-hackathon",
		kind:      models.EventKindHackathon,
		format:    models.FormatOnline,
		origin:    models.OriginWorld,
		track:     "Voice agents",
		prizePool: "10000.00",
		currency:  "USD",
		teamMin:   1,
		teamMax:   5,
		startAt:   "2026-09-01T15:00:00Z",
		endAt:     "2026-09-30T23:00:00Z",
		publish:   true,
	},
	{
		title: "Graph Hacks: Building Next-Gen RAG",
		description: "Rows show individual records, graphs show how they connect. Build retrieval " +
			"on FalkorDB's graph engine across three tracks: investigation and risk, agentic AI, " +
			"and the GraphRAG SDK.",
		organizer: "WeMakeDevs",
		website:   "https://www.wemakedevs.org/hackathons/falkordb",
		kind:      models.EventKindHackathon,
		format:    models.FormatOnline,
		origin:    models.OriginWorld,
		track:     "GraphRAG",
		prizePool: "10000.00",
		currency:  "USD",
		teamMin:   1,
		teamMax:   4,
		startAt:   "2026-09-08T09:00:00Z",
		endAt:     "2026-09-21T21:00:00Z",
		publish:   true,
	},
	{
		title: "IBM Bob 2.0 Hackathon",
		description: "Build with IBM's developer stack in the second edition of the Bob hackathon, " +
			"run online by lablab.ai.",
		organizer: "lablab.ai",
		website:   "https://lablab.ai/ai-hackathons/ibm-bob-2-hackathon",
		kind:      models.EventKindHackathon,
		format:    models.FormatOnline,
		origin:    models.OriginWorld,
		track:     "Applied AI",
		prizePool: "5000.00",
		currency:  "USD",
		teamMin:   1,
		teamMax:   5,
		startAt:   "2026-09-15T09:00:00Z",
		endAt:     "2026-09-29T21:00:00Z",
		publish:   false,
	},
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
