package finance

import (
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

func trackPanel(track *models.EventTrack) (dto.FinanceTrack, int64, int64) {
	panel := dto.FinanceTrack{
		ID:      track.DisplayID,
		TrackNo: track.TrackNo,
		Name:    track.Name,
		Prizes:  make([]dto.FinanceTrackPrize, 0, len(track.Prizes)),
	}
	var total, nominations int64
	for i := range track.Prizes {
		prize := track.Prizes[i]
		amount := Whole(prize.Amount)
		total += amount
		if prize.Nomination() {
			nominations += amount
		}
		panel.Prizes = append(panel.Prizes, dto.FinanceTrackPrize{
			Place: prize.Place, Title: prize.Title, Amount: Format(amount),
		})
	}
	panel.PrizeTotal = Format(total)
	return panel, total, nominations
}

func caseRow(item *models.EventCase, tracks []models.EventTrack) (dto.FinanceCase, int64) {
	trackID, trackName := trackNameOf(tracks, item.TrackID)
	row := dto.FinanceCase{
		ID: item.DisplayID, CaseNo: item.CaseNo, Name: item.Name,
		Partner: item.Partner, TrackID: trackID, TrackName: trackName,
	}
	if item.PrizeAmount == nil {
		return row, 0
	}
	amount := Whole(*item.PrizeAmount)
	row.PrizeAmount = Pointer(amount)
	return row, amount
}

func Summary(target *models.Event, tracks []models.EventTrack,
	cases []models.EventCase) *dto.EventFinanceResponse {
	out := &dto.EventFinanceResponse{
		EventID:       target.DisplayID,
		PrizeCurrency: target.PrizeCurrency,
		Tracks:        make([]dto.FinanceTrack, 0, len(tracks)),
		Cases:         make([]dto.FinanceCase, 0, len(cases)),
	}
	if target.PrizePool != nil {
		out.PrizePool = Pointer(Whole(*target.PrizePool))
	}

	var distributedTracks, distributedCases, nominations int64
	for i := range tracks {
		panel, total, nominated := trackPanel(&tracks[i])
		distributedTracks += total
		nominations += nominated
		out.Tracks = append(out.Tracks, panel)
	}
	for i := range cases {
		row, amount := caseRow(&cases[i], tracks)
		distributedCases += amount
		out.Cases = append(out.Cases, row)
	}

	out.DistributedTracks = Format(distributedTracks)
	out.DistributedCases = Format(distributedCases)
	out.Distributed = Format(distributedTracks + distributedCases)
	out.Nominations = Format(nominations)
	if out.PrizePool != nil {
		pool := Whole(*out.PrizePool)
		out.Unallocated = Pointer(pool - distributedTracks)
		out.Discrepancy = Pointer(pool - distributedTracks - distributedCases)
		out.DiscrepancyKnown = true
	}
	return out
}
