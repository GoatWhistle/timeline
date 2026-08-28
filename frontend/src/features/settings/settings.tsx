import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { LanguageToggle } from '@/shared/ui/primitives/language-toggle'
import { ThemeToggle } from '@/shared/ui/primitives/theme-toggle'

function SettingRow({
  title,
  hint,
  control,
}: {
  title: string
  hint: string
  control: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0 max-w-prose">
        <p className="font-medium text-copy">{title}</p>
        <p className="mt-0.5 text-meta text-muted-foreground">{hint}</p>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  )
}

export function SettingsPage() {
  const { t } = useTranslation()

  return (
    <div className="max-w-3xl">
      <h1 className="font-semibold text-screen tracking-tight">{t('settings.title')}</h1>
      <p className="mt-1 text-meta text-muted-foreground">{t('settings.description')}</p>

      <section aria-labelledby="settings-appearance" className="mt-8">
        <h2 id="settings-appearance" className="font-semibold text-heading">
          {t('settings.appearance')}
        </h2>
        <div className="mt-2 divide-y divide-border border-border border-t">
          <SettingRow
            title={t('settings.theme')}
            hint={t('settings.themeHint')}
            control={<ThemeToggle />}
          />
          <SettingRow
            title={t('language.label')}
            hint={t('settings.languageHint')}
            control={<LanguageToggle />}
          />
        </div>
      </section>

      <section aria-labelledby="settings-profile" className="mt-8">
        <h2 id="settings-profile" className="font-semibold text-heading">
          {t('settings.profile')}
        </h2>
        <div className="mt-2 border-border border-t py-3">
          <p className="max-w-prose text-meta text-muted-foreground">{t('settings.profileHint')}</p>
          <Link
            to="/profile"
            className="mt-2 inline-flex text-copy text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {t('settings.openProfile')}
          </Link>
        </div>
      </section>
    </div>
  )
}
