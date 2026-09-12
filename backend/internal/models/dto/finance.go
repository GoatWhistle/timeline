package dto

import "time"

type EventCaseResponse struct {
	ID          string    `json:"id" example:"cs_42ej2s5gh7e8"`
	EventID     string    `json:"event_id" example:"ev_gma9hq8a96q5"`
	TrackID     *string   `json:"track_id,omitempty" example:"tr_42ej2s5gh7e8"`
	TrackName   *string   `json:"track_name,omitempty" example:"Smart city"`
	CaseNo      int       `json:"case_no" example:"1"`
	Name        string    `json:"name" example:"Traffic light scheduling"`
	Description *string   `json:"description,omitempty"`
	Partner     *string   `json:"partner,omitempty" example:"City transport authority"`
	PrizeAmount *string   `json:"prize_amount,omitempty" example:"50000"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type EventCaseListResponse struct {
	Items []EventCaseResponse `json:"items"`
}

type CreateEventCaseRequest struct {
	Name        string  `json:"name" example:"Traffic light scheduling"`
	Description *string `json:"description,omitempty"`
	Partner     *string `json:"partner,omitempty" example:"City transport authority"`
	PrizeAmount *string `json:"prize_amount,omitempty" example:"50000"`
	TrackID     *string `json:"track_id,omitempty" example:"tr_42ej2s5gh7e8"`
	CaseNo      *int    `json:"case_no,omitempty" example:"1"`
}

type UpdateEventCaseRequest struct {
	Name        *string `json:"name,omitempty"`
	Description *string `json:"description,omitempty"`
	Partner     *string `json:"partner,omitempty"`
	PrizeAmount *string `json:"prize_amount,omitempty"`
	TrackID     *string `json:"track_id,omitempty"`
	CaseNo      *int    `json:"case_no,omitempty"`
	ClearTrack  bool    `json:"clear_track,omitempty" example:"false"`
	ClearPrize  bool    `json:"clear_prize,omitempty" example:"false"`
}

type FinanceTrackPrize struct {
	Place  *int    `json:"place,omitempty" example:"1"`
	Title  *string `json:"title,omitempty" example:"Best design"`
	Amount string  `json:"amount" example:"150000"`
}

type FinanceTrack struct {
	ID         string              `json:"id" example:"tr_42ej2s5gh7e8"`
	TrackNo    int                 `json:"track_no" example:"1"`
	Name       string              `json:"name" example:"Smart city"`
	PrizeTotal string              `json:"prize_total" example:"300000"`
	Prizes     []FinanceTrackPrize `json:"prizes"`
}

type FinanceCase struct {
	ID          string  `json:"id" example:"cs_42ej2s5gh7e8"`
	CaseNo      int     `json:"case_no" example:"1"`
	Name        string  `json:"name" example:"Traffic light scheduling"`
	Partner     *string `json:"partner,omitempty" example:"City transport authority"`
	TrackID     *string `json:"track_id,omitempty" example:"tr_42ej2s5gh7e8"`
	TrackName   *string `json:"track_name,omitempty" example:"Smart city"`
	PrizeAmount *string `json:"prize_amount,omitempty" example:"50000"`
}

type EventFinanceResponse struct {
	EventID           string         `json:"event_id" example:"ev_gma9hq8a96q5"`
	PrizePool         *string        `json:"prize_pool,omitempty" example:"500000"`
	PrizeCurrency     *string        `json:"prize_currency,omitempty" example:"RUB"`
	Tracks            []FinanceTrack `json:"tracks"`
	Cases             []FinanceCase  `json:"cases"`
	DistributedTracks string         `json:"distributed_tracks" example:"400000"`
	DistributedCases  string         `json:"distributed_cases" example:"50000"`
	Distributed       string         `json:"distributed" example:"450000"`
	Nominations       string         `json:"nominations" example:"50000"`
	Unallocated       *string        `json:"unallocated,omitempty" example:"50000"`
	Discrepancy       *string        `json:"discrepancy,omitempty" example:"50000"`
	DiscrepancyKnown  bool           `json:"discrepancy_known" example:"true"`
}
