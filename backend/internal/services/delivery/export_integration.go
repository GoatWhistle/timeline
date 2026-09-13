//go:build integration

package delivery

import (
	"context"
	"time"
)

func SetDeliveryClock(s *DeliveryService, now func() time.Time) { s.now = now }

func SetOpsClock(s *OpsService, now func() time.Time) { s.now = now }

func RunDeliveryOnce(s *DeliveryService, ctx context.Context) { s.runOnce(ctx) }

func RecoverDeliveryLeases(s *DeliveryService, ctx context.Context) { s.recoverLeases(ctx) }

func RunRetention(s *DeliveryService, ctx context.Context) { s.cleanup(ctx) }
