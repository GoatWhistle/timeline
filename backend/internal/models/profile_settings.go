package models

type ProfileVisibility string

const (
	ProfilePublicVisibility  ProfileVisibility = "public"
	ProfileMembersVisibility ProfileVisibility = "members"
	ProfilePrivateVisibility ProfileVisibility = "private"
)

func (v ProfileVisibility) Valid() bool {
	switch v {
	case ProfilePublicVisibility, ProfileMembersVisibility, ProfilePrivateVisibility:
		return true
	}
	return false
}

type UserTheme string

const (
	ThemeDark   UserTheme = "dark"
	ThemeLight  UserTheme = "light"
	ThemeSystem UserTheme = "system"
)

func (t UserTheme) Valid() bool {
	switch t {
	case ThemeDark, ThemeLight, ThemeSystem:
		return true
	}
	return false
}

const ProfilePinnedEventsMax = 3
