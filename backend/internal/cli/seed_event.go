package cli

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

func seedOne(ctx context.Context, c *container, actor models.Actor, item seedEvent,
) (*models.Event, error) {
	taken, err := titleTaken(ctx, c, actor, item.title)
	if err != nil {
		return nil, err
	}
	if taken {
		return nil, errSeedExists
	}

	req, err := seedRequest(item)
	if err != nil {
		return nil, err
	}

	event, err := c.events.Create(ctx, actor, req)
	if err != nil {
		return nil, err
	}
	if !item.publish {
		return event, nil
	}
	return c.events.Publish(ctx, actor, event.ID)
}

func titleTaken(ctx context.Context, c *container, actor models.Actor, title string) (bool, error) {
	found, _, err := c.events.List(ctx, actor,
		models.EventFilter{Search: title, IncludeArchived: true},
		models.Page{Number: 1, Size: 50})
	if err != nil {
		return false, err
	}
	for _, event := range found {
		if strings.EqualFold(event.Title, title) {
			return true, nil
		}
	}
	return false, nil
}

func seedRequest(item seedEvent) (dto.CreateEventRequest, error) {
	startAt, err := time.Parse(time.RFC3339, item.startAt)
	if err != nil {
		return dto.CreateEventRequest{}, fmt.Errorf("start of %q: %w", item.title, err)
	}
	endAt, err := time.Parse(time.RFC3339, item.endAt)
	if err != nil {
		return dto.CreateEventRequest{}, fmt.Errorf("end of %q: %w", item.title, err)
	}

	kind := item.kind
	format := item.format
	origin := item.origin
	req := dto.CreateEventRequest{
		Title:       item.title,
		Description: text(item.description),
		Organizer:   text(item.organizer),
		WebsiteURL:  text(item.website),
		Kind:        &kind,
		Format:      &format,
		Origin:      &origin,
		CountryCode: text(item.countryCode),
		City:        text(item.city),
		Track:       text(item.track),
		StartAt:     startAt,
		EndAt:       endAt,
	}
	if item.prizePool != "" {
		req.PrizePool = text(item.prizePool)
		req.PrizeCurrency = text(item.currency)
	}
	if item.teamMin > 0 {
		req.TeamSizeMin = &item.teamMin
	}
	if item.teamMax > 0 {
		req.TeamSizeMax = &item.teamMax
	}
	return req, nil
}

func text(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}
