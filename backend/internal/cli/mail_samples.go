package cli

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/spf13/cobra"

	"github.com/GoatWhistle/timeline/internal/adapters/email"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/services/shared/mail"
)

func init() {
	commandBuilders = append(commandBuilders, newMailSamplesCmd)
}

func newMailSamplesCmd() *cobra.Command {
	var to string
	cmd := &cobra.Command{
		Use:   "mail",
		Short: "Mail template diagnostics",
	}
	samples := &cobra.Command{
		Use:   "samples",
		Short: "Send one sample of every letter, in both themes and both languages",
		Long: "Sends every letter Timeline can produce - account letters and registration " +
			"notifications - once per theme (dark, light) and once per language (ru, en), " +
			"so a change to the shared template can be checked by eye in a real inbox. " +
			"Available only with APP_ENV=dev.",
		RunE: func(cmd *cobra.Command, _ []string) error {
			return runMailSamples(cmd.Context(), to)
		},
	}
	samples.Flags().StringVar(&to, "to", "", "recipient address for the samples")
	_ = samples.MarkFlagRequired("to")
	cmd.AddCommand(samples)
	return cmd
}

func runMailSamples(ctx context.Context, to string) error {
	cfg, err := loadConfig()
	if err != nil {
		return err
	}
	if cfg.App.Env != "dev" {
		return errors.New("mail samples are only available with APP_ENV=dev")
	}
	if to == "" {
		return errors.New("--to is required")
	}

	sender := email.New(cfg.Email)
	mailer := mail.NewMailer(sender, nil, cfg.App.PublicURL)

	sent := 0
	for _, lang := range []string{"ru", "en"} {
		mailer.SendInvite(ctx, to, "Administrator", lang, "sample-token", 72*time.Hour)
		sent++
		for _, theme := range []string{"dark", "light"} {
			sendAccountSamples(ctx, mailer, to, lang, theme)
			sendNotificationSamples(ctx, sender, cfg.App.PublicURL, to, lang, theme)
			sent += 11
		}
	}
	fmt.Printf("sent %d sample letters to %s\n", sent, to)
	return nil
}

func sendAccountSamples(ctx context.Context, mailer *mail.Mailer, to, lang, theme string) {
	mailer.SendVerification(ctx, to, "Maria Ivanova", lang, theme, "sample-token", 24*time.Hour,
		mail.TelegramRecipient{})
	mailer.SendPasswordReset(ctx, to, "Maria Ivanova", lang, theme, "sample-token", 2*time.Hour,
		mail.TelegramRecipient{})
	mailer.SendEmailChange(ctx, to, "Maria Ivanova", lang, theme, "sample-token", 24*time.Hour)
	mailer.SendEmailChangeCancel(ctx, to, "Maria Ivanova", lang, theme, "sample-token", time.Hour)
	mailer.SendPasswordChanged(ctx, to, "Maria Ivanova", lang, theme, mail.TelegramRecipient{})
}

func sendNotificationSamples(ctx context.Context, sender mail.EmailSender, publicURL, to, lang, theme string) {
	samples := []mail.NotificationEmail{
		{
			Lang: lang, Theme: theme, PublicURL: publicURL,
			Subject: "Registration required for HackTogether", Heading: "Registration required for HackTogether",
			Body:            "You have been assigned to HackTogether. External registration is required.",
			RegistrationURL: "https://example.com/register",
		},
		{
			Lang: lang, Theme: theme, PublicURL: publicURL,
			Subject: "Reminder: registration for HackTogether", Heading: "Reminder: registration for HackTogether",
			Body:            "A reminder about registration for HackTogether.",
			RegistrationURL: "https://example.com/register",
		},
		{
			Lang: lang, Theme: theme, PublicURL: publicURL,
			Subject:         "The registration deadline for HackTogether has passed",
			Heading:         "The registration deadline for HackTogether has passed",
			Body:            "The registration deadline for HackTogether passed and registration has not been marked.",
			RegistrationURL: "https://example.com/register",
		},
		{
			Lang: lang, Theme: theme, PublicURL: publicURL,
			Subject: "What is on this week in Timeline", Heading: "What is on this week in Timeline",
			Body: "Your week from 01.06 to 07.06 (Europe/Moscow):\n" +
				"01.06 09:00 - registration deadline: HackTogether",
			RegistrationURL: publicURL + "/catalog",
		},
		{
			Lang: lang, Theme: theme, PublicURL: publicURL,
			Subject: "Task due: Record the demo", Heading: "Task due: Record the demo",
			Body: "Your task for HackTogether is due.\n\n" +
				"Task: Record the demo\nDue: 01.06.2026 18:00 (Europe/Moscow)",
			RegistrationURL: publicURL + "/events/ev_sample",
		},
		{
			Lang: lang, Theme: theme, PublicURL: publicURL,
			Subject: "Share a retrospective for HackTogether", Heading: "Share a retrospective for HackTogether",
			Body: "HackTogether has ended. Share a short retrospective in Timeline: " +
				"what went well, what did not, what to do next time.",
			RegistrationURL: publicURL + "/events/ev_sample",
		},
	}
	for _, sample := range samples {
		subject, html, unsubscribeURL, err := mail.RenderNotificationEmail(sample)
		if err != nil {
			continue
		}
		_ = sender.Send(ctx, models.OutboundMessage{
			Recipient: to, Subject: subject, Body: sample.Body, HTML: html, UnsubscribeURL: unsubscribeURL,
		})
	}
}
