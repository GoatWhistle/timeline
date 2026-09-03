package cli

import "github.com/GoatWhistle/timeline/internal/models"

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
		tracks: []seedTrack{
			{name: "Self-healing web scraping",
				description: "Build a scraper that survives a redesign: detect the break, re-derive the " +
					"selectors and carry on without a human editing a rule.",
				prizes: []int64{5000, 2500, 1000}},
			{name: "Structured extraction at scale",
				description: "Turn a messy crawl of a thousand unlike pages into one clean schema, and " +
					"say honestly where the extraction is unsure.",
				prizes: []int64{4000, 1500}},
		},
		prizePool: "15000.00",
		currency:  "USD",
		teamMin:   1,
		teamMax:   4,
		startAt:   "2026-08-17T09:00:00Z",
		endAt:     "2026-08-23T21:00:00Z",
		publish:   true,
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
		tracks: []seedTrack{
			{name: "Agent harnesses",
				description: "The scaffolding around a model: tool routing, retries, budget limits and a " +
					"trace a human can actually read afterwards.",
				prizes: []int64{4000, 2000}},
			{name: "Evaluation",
				description: "Make an agent's quality measurable: a benchmark that a team cannot pass " +
					"by overfitting to it.",
				prizes: []int64{3000, 1000}},
		},
		prizePool: "10000.00",
		currency:  "USD",
		teamMin:   1,
		teamMax:   4,
		startAt:   "2026-08-24T07:00:00Z",
		endAt:     "2026-08-30T19:00:00Z",
		publish:   true,
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
		tracks: []seedTrack{
			{name: "Trading agents",
				description: "An agent that takes positions under a real risk budget and explains each " +
					"decision after the fact.",
				prizes: []int64{3000, 1500, 800}},
			{name: "Market data plumbing",
				description: "Ingest, normalise and replay a live feed so a strategy can be tested " +
					"against exactly what it would have seen.",
				prizes: []int64{1000}},
		},
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
		tracks: []seedTrack{
			{name: "Voice agents",
				description: "Real-time speech in and out, with interruption handled the way a person " +
					"expects rather than the way a queue does.",
				prizes: []int64{4000, 2000, 1000}},
			{name: "Telephony integration",
				description: "Put the agent on an actual phone line and keep it usable when the audio " +
					"is bad.",
				prizes: []int64{2000, 1000}},
		},
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
		tracks: []seedTrack{
			{name: "Investigation and risk",
				description: "Trace a relationship across many hops and show the path that justified " +
					"the answer.",
				prizes: []int64{3000, 1500}},
			{name: "Agentic AI",
				description: "Let an agent choose its own traversals rather than following a query a " +
					"human wrote in advance.",
				prizes: []int64{2500, 1000}},
			{name: "Developer experience",
				description: "Make the graph pleasant to build against: schema, tooling, and errors " +
					"that say what to fix.",
				prizes: []int64{1500}},
		},
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
		tracks: []seedTrack{
			{name: "Applied AI",
				description: "A working answer to a problem someone actually has, judged on whether it " +
					"would survive contact with its users.",
				prizes: []int64{3000, 1500}},
		},
		prizePool: "5000.00",
		currency:  "USD",
		teamMin:   1,
		teamMax:   5,
		startAt:   "2026-09-15T09:00:00Z",
		endAt:     "2026-09-29T21:00:00Z",
		publish:   false,
	},
}
