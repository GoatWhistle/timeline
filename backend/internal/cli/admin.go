package cli

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"

	"github.com/spf13/cobra"

	"github.com/GoatWhistle/timeline/internal/config"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/services/shared/validation"
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
			nickname, _ := cmd.Flags().GetString("nickname")
			return createAdmin(cmd.Context(), email, password, name, nickname)
		},
	}
	create.Flags().String("email", "", "administrator address (defaults to FIRST_ADMIN_EMAIL)")
	create.Flags().String("password", "", "password (defaults to FIRST_ADMIN_PASSWORD)")
	create.Flags().String("name", "", "display name (defaults to FIRST_ADMIN_NAME)")
	create.Flags().String("nickname", "", "nickname (defaults to FIRST_ADMIN_NICKNAME)")
	cmd.AddCommand(create)
	cmd.AddCommand(newAdminFlagCmd("grant", "Give an existing account administrator rights", true))
	cmd.AddCommand(newAdminFlagCmd("revoke", "Take administrator rights away from an account", false))
	return cmd
}

func newAdminFlagCmd(use, short string, admin bool) *cobra.Command {
	cmd := &cobra.Command{
		Use:   use,
		Short: short,
		Long: short + ". The account must already exist. The change is written to the audit log " +
			"with no actor, because it is made from the server rather than through the API.",
		RunE: func(cmd *cobra.Command, args []string) error {
			email, _ := cmd.Flags().GetString("email")
			return setAdminFlag(cmd.Context(), email, admin)
		},
	}
	cmd.Flags().String("email", "", "address of the account to change")
	return cmd
}

func setAdminFlag(ctx context.Context, email string, admin bool) error {
	c, err := newContainer(ctx)
	if err != nil {
		return err
	}
	defer c.Close()

	email = validation.NormalizeEmail(email)
	if email == "" {
		return errors.New("set --email")
	}

	user, err := c.repos.users.GetByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			return fmt.Errorf("no account with address %s", email)
		}
		return err
	}
	if user.IsAdmin == admin {
		slog.Info("nothing to change", "email", user.Email, "id", user.DisplayID, "administrator", admin)
		return nil
	}
	if err := c.repos.users.SetAdmin(ctx, user.ID, admin); err != nil {
		return err
	}
	if err := c.repos.audit.Insert(ctx, &models.AuditLog{
		Action:     models.AuditUserAdminFlagChange,
		EntityType: models.EntityUser,
		EntityID:   &user.ID,
		BeforeJSON: map[string]bool{"is_admin": user.IsAdmin},
		AfterJSON:  map[string]bool{"is_admin": admin},
	}); err != nil {
		return err
	}
	slog.Info("administrator flag changed",
		"email", user.Email, "id", user.DisplayID, "administrator", admin)
	return nil
}

func adminDefaults(cfg config.Auth, email, password, name, nickname string) (string, string, string, string) {
	if email == "" {
		email = cfg.FirstAdminEmail
	}
	if password == "" {
		password = cfg.FirstAdminPassword
	}
	if name == "" {
		name = cfg.FirstAdminName
	}
	if nickname == "" {
		nickname = cfg.FirstAdminNickname
	}
	return email, password, name, nickname
}

func createAdmin(ctx context.Context, email, password, name, nickname string) error {
	c, err := newContainer(ctx)
	if err != nil {
		return err
	}
	defer c.Close()

	email, password, name, nickname = adminDefaults(c.cfg.Auth, email, password, name, nickname)

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
	firstName, lastName := splitAdminName(name)
	adminNickname, err := validation.RegistrationNickname(nickname)
	if err != nil {
		return err
	}

	if existing, err := c.repos.users.GetByEmail(ctx, email); err == nil {
		slog.Info("user already exists",
			"email", existing.Email, "id", existing.DisplayID, "administrator", existing.IsAdmin)
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
		FirstName:       firstName,
		LastName:        lastName,
		Nickname:        &adminNickname,
		Email:           email,
		PasswordHash:    hash,
		EmailVerifiedAt: &now,
		IsAdmin:         true,
		IsActive:        true,
	})
	if err != nil {
		return err
	}
	slog.Info("administrator created", "email", created.Email, "id", created.DisplayID)
	return nil
}

func splitAdminName(name string) (string, string) {
	parts := strings.Fields(name)
	if len(parts) < 2 {
		return name, name
	}
	return parts[0], parts[len(parts)-1]
}
