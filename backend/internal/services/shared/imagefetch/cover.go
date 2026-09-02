package imagefetch

import (
	"context"
	"mime"
	"net/url"
	"strings"

	"github.com/GoatWhistle/timeline/internal/services/shared/blobstore"
)

type Cover struct {
	Data        []byte
	ContentType string
	SourceURL   string
	Width       int
	Height      int
}

const pageAccept = "text/html,application/xhtml+xml"

const imageAccept = "image/png,image/jpeg,image/webp,image/*"

func (c *Client) FetchCover(ctx context.Context, pageURL string) (*Cover, error) {
	page, base, err := c.fetchPage(ctx, pageURL)
	if err != nil {
		return nil, err
	}

	lastErr := error(ErrNoCover)
	for _, candidate := range CoverCandidates(page) {
		absolute, ok := resolveCandidate(base, candidate)
		if !ok {
			continue
		}
		cover, err := c.FetchImage(ctx, absolute)
		if err != nil {
			lastErr = err
			continue
		}
		return cover, nil
	}
	return nil, lastErr
}

func (c *Client) fetchPage(ctx context.Context, pageURL string) (string, *url.URL, error) {
	resp, err := c.get(ctx, pageURL, pageAccept)
	if err != nil {
		return "", nil, err
	}
	defer resp.Body.Close()

	if !isHTML(resp.Header.Get("Content-Type")) {
		return "", nil, ErrNoCover
	}
	body, err := c.readCapped(resp.Body)
	if err != nil {
		return "", nil, err
	}
	return string(body), resp.Request.URL, nil
}

func isHTML(contentType string) bool {
	if contentType == "" {
		return true
	}
	parsed, _, err := mime.ParseMediaType(contentType)
	if err != nil {
		return false
	}
	return parsed == "text/html" || parsed == "application/xhtml+xml"
}

func resolveCandidate(base *url.URL, candidate string) (string, bool) {
	candidate = strings.TrimSpace(candidate)
	if candidate == "" || strings.HasPrefix(strings.ToLower(candidate), "data:") {
		return "", false
	}
	parsed, err := url.Parse(candidate)
	if err != nil {
		return "", false
	}
	if base != nil {
		parsed = base.ResolveReference(parsed)
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return "", false
	}
	return parsed.String(), true
}

func (c *Client) FetchImage(ctx context.Context, imageURL string) (*Cover, error) {
	resp, err := c.get(ctx, imageURL, imageAccept)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if !declaresImage(resp.Header.Get("Content-Type")) {
		return nil, ErrNotAnImage
	}
	data, err := c.readCapped(resp.Body)
	if err != nil {
		return nil, err
	}
	image, err := blobstore.InspectImage(data)
	if err != nil {
		return nil, ErrNotAnImage
	}
	return &Cover{
		Data:        blobstore.StripMetadata(data, image.ContentType),
		ContentType: image.ContentType,
		SourceURL:   resp.Request.URL.String(),
		Width:       image.Width,
		Height:      image.Height,
	}, nil
}

func declaresImage(contentType string) bool {
	if contentType == "" {
		return false
	}
	parsed, _, err := mime.ParseMediaType(contentType)
	if err != nil {
		return false
	}
	switch parsed {
	case blobstore.TypePNG, blobstore.TypeJPEG, blobstore.TypeWebP:
		return true
	}
	return false
}
