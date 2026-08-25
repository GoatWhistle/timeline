package cli

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/spf13/cobra"

	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

func init() {
	commandBuilders = append(commandBuilders, newAdminCmd)
}

func newAdminCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "admin",
		Short: "Операции над учётными записями администраторов",
	}
	create := &cobra.Command{
		Use:   "create",
		Short: "Создать первого администратора",
		Long: "Создаёт администратора по FIRST_ADMIN_EMAIL, FIRST_ADMIN_PASSWORD и FIRST_ADMIN_NAME " +
			"либо по флагам команды. Адрес считается подтверждённым: письмо подтверждения не отправляется. " +
			"Повторный запуск для существующего адреса ничего не меняет.",
		RunE: func(cmd *cobra.Command, args []string) error {
			email, _ := cmd.Flags().GetString("email")
			password, _ := cmd.Flags().GetString("password")
			name, _ := cmd.Flags().GetString("name")
			return createAdmin(cmd.Context(), email, password, name)
		},
	}
	create.Flags().String("email", "", "адрес администратора (по умолчанию FIRST_ADMIN_EMAIL)")
	create.Flags().String("password", "", "пароль (по умолчанию FIRST_ADMIN_PASSWORD)")
	create.Flags().String("name", "", "отображаемое имя (по умолчанию FIRST_ADMIN_NAME)")
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
		return errors.New("задайте FIRST_ADMIN_EMAIL и FIRST_ADMIN_PASSWORD либо флаги --email и --password")
	}
	if len(password) < c.cfg.Auth.MinPasswordLength {
		return fmt.Errorf("пароль короче минимальной длины %d", c.cfg.Auth.MinPasswordLength)
	}
	if name == "" {
		name = "Администратор"
	}

	if existing, err := c.repos.users.GetByEmail(ctx, email); err == nil {
		fmt.Printf("пользователь %s уже существует (id %s, администратор: %t)\n",
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
		DisplayName: name,
		Email:       email,
		// Первый администратор создаётся оператором развёртывания, поэтому
		// адрес считается подтверждённым и уведомления по email доступны сразу.
		PasswordHash:    hash,
		EmailVerifiedAt: &now,
		IsAdmin:         true,
		IsActive:        true,
	})
	if err != nil {
		return err
	}
	fmt.Printf("администратор создан: %s (id %s)\n", created.Email, created.ID)
	return nil
}
