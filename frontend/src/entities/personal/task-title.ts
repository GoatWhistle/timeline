import { i18n } from '@/shared/i18n/config'

const TEMPLATE_TITLE = /^task\.[a-z_]+$/

export function isTemplateTitle(title: string): boolean {
  return TEMPLATE_TITLE.test(title.trim())
}

export function taskTitle(title: string): string {
  const trimmed = title.trim()
  if (!isTemplateTitle(trimmed)) return title
  const key = `event:personal.template.item.${trimmed}`
  const translated = i18n.t(key)
  return translated === key ? title : translated
}
