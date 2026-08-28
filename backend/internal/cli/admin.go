package cli

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/spf13/cobra"

	"github.com/GoatWhistle/timeline/internal/models"
)

func init() {
	commandBuilders = append(commandBuilders, newAdminCmd)
}

func newAdminCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "admin",
		Short: "Operations on administrator accounts",
	}
	create := &cobra.Command{
		Use:   "create",
		Short: "Create the first administrator",
		Long: "Creates an administrator from FIRST_ADMIN_EMAIL, FIRST_ADMIN_PASSWORD and FIRST_ADMIN_NAME " +
			"or from command flags. The address is treated as confirmed: no confirmation email is sent. " +
			"Running it again for an existing address changes nothing.",
		RunE: func(cmd *cobra.Command, args []string) error {
			email, _ := cmd.Flags().GetString("email")
			password, _ := cmd.Flags().GetString("password")
			name, _ := cmd.Flags().GetString("name")
			return createAdmin(cmd.Context(), email, password, name)
		},
	}
	create.Flags().String("email", "", "administrator address (defaults to FIRST_ADMIN_EMAIL)")
	create.Flags().String("password", "", "password (defaults to FIRST_ADMIN_PASSWORD)")
	create.Flags().String("name", "", "display name (defaults to FIRST_ADMIN_NAME)")
	cmd.AddCommand(create)
	return cmd
}

func createAdmin(ctx context.Context, email, password, name string) error {
	c, err := newContainer(ctx)
	if err != nil {
		return err
	}
	defer c.Close()

	if email == "" {
		email = c.cfg.Auth.FirstAdminEmail
	}
	if password == "" {
		password = c.cfg.Auth.FirstAdminPassword
	}
	if name == "" {
		name = c.cfg.Auth.FirstAdminName
	}

	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" || password == "" {
		return errors.New("set FIRST_ADMIN_EMAIL and FIRST_ADMIN_PASSWORD, or the --email and --password flags")
	}
	if len(password) < c.cfg.Auth.MinPasswordLength {
		return fmt.Errorf("password is shorter than the minimum length %d", c.cfg.Auth.MinPasswordLength)
	}
	if name == "" {
		name = "Administrator"
	}

	if existing, err := c.repos.users.GetByEmail(ctx, email); err == nil {
		fmt.Printf("user %s already exists (id %s, administrator: %t)\n",
			existing.Email, existing.ID, existing.IsAdmin)
		return nil
	} else if !errors.Is(err, models.ErrNotFound) {
		return err
	}

	hash, err := c.hasher.Hash(password)
	if err != nil {
		return err
	}
	now := nowUTC()
	created, err := c.repos.users.Create(ctx, &models.User{
		DisplayName:     name,
		Email:           email,
		PasswordHash:    hash,
		EmailVerifiedAt: &now,
		IsAdmin:         true,
		IsActive:        true,
	})
	if err != nil {
		return err
	}
	fmt.Printf("administrator created: %s (id %s)\n", created.Email, created.ID)
	return nil
}
