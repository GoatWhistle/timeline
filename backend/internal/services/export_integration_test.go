//go:build integration

package services

import (
	"context"
	"time"
)

func SetNotificationClock(s *NotificationService, now func() time.Time) { s.now = now }

func SetSchedulerClock(s *SchedulerService, now func() time.Time) { s.now = now }

func SetDeliveryClock(s *DeliveryService, now func() time.Time) { s.now = now }

func RunDeliveryOnce(s *DeliveryService, ctx context.Context) { s.runOnce(ctx) }

func RecoverDeliveryLeases(s *DeliveryService, ctx context.Context) { s.recoverLeases(ctx) }

func RunRetention(s *DeliveryService, ctx context.Context) { s.cleanup(ctx) }
