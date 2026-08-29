export type ServiceId =
  | 'github'
  | 'gitlab'
  | 'bitbucket'
  | 'gitea'
  | 'sourcehut'
  | 'telegram'
  | 'discord'
  | 'linkedin'
  | 'x'
  | 'mastodon'
  | 'bluesky'
  | 'youtube'
  | 'twitch'
  | 'instagram'
  | 'facebook'
  | 'threads'
  | 'reddit'
  | 'medium'
  | 'vk'
  | 'stackOverflow'
  | 'leetcode'
  | 'codeforces'
  | 'figma'
  | 'behance'
  | 'dribbble'
  | 'notion'
  | 'npm'
  | 'vimeo'
  | 'soundcloud'
  | 'spotify'
  | 'boosty'
  | 'patreon'
  | 'tiktok'
  | 'hackerone'

export type ServiceDefinition = {
  id: ServiceId
  label: string
  domains: readonly string[]
}

export const SERVICES: readonly ServiceDefinition[] = [
  { id: 'github', label: 'GitHub', domains: ['github.com', 'github.io', 'gist.github.com'] },
  { id: 'gitlab', label: 'GitLab', domains: ['gitlab.com', 'gitlab.io'] },
  { id: 'bitbucket', label: 'Bitbucket', domains: ['bitbucket.org'] },
  { id: 'gitea', label: 'Gitea', domains: ['gitea.com', 'gitea.io'] },
  { id: 'sourcehut', label: 'SourceHut', domains: ['sr.ht'] },
  { id: 'telegram', label: 'Telegram', domains: ['t.me', 'telegram.me', 'telegram.org'] },
  { id: 'discord', label: 'Discord', domains: ['discord.com', 'discord.gg', 'discordapp.com'] },
  { id: 'linkedin', label: 'LinkedIn', domains: ['linkedin.com', 'lnkd.in'] },
  { id: 'x', label: 'X', domains: ['x.com', 'twitter.com', 't.co'] },
  {
    id: 'mastodon',
    label: 'Mastodon',
    domains: ['mastodon.social', 'mastodon.online', 'mstdn.social'],
  },
  { id: 'bluesky', label: 'Bluesky', domains: ['bsky.app', 'bsky.social'] },
  { id: 'youtube', label: 'YouTube', domains: ['youtube.com', 'youtu.be'] },
  { id: 'twitch', label: 'Twitch', domains: ['twitch.tv'] },
  { id: 'instagram', label: 'Instagram', domains: ['instagram.com'] },
  { id: 'facebook', label: 'Facebook', domains: ['facebook.com', 'fb.com'] },
  { id: 'threads', label: 'Threads', domains: ['threads.net', 'threads.com'] },
  { id: 'reddit', label: 'Reddit', domains: ['reddit.com', 'redd.it'] },
  { id: 'medium', label: 'Medium', domains: ['medium.com'] },
  { id: 'vk', label: 'VK', domains: ['vk.com', 'vk.ru'] },
  {
    id: 'stackOverflow',
    label: 'Stack Overflow',
    domains: ['stackoverflow.com', 'stackexchange.com'],
  },
  { id: 'leetcode', label: 'LeetCode', domains: ['leetcode.com'] },
  { id: 'codeforces', label: 'Codeforces', domains: ['codeforces.com'] },
  { id: 'figma', label: 'Figma', domains: ['figma.com'] },
  { id: 'behance', label: 'Behance', domains: ['behance.net'] },
  { id: 'dribbble', label: 'Dribbble', domains: ['dribbble.com'] },
  { id: 'notion', label: 'Notion', domains: ['notion.so', 'notion.site'] },
  { id: 'npm', label: 'npm', domains: ['npmjs.com'] },
  { id: 'vimeo', label: 'Vimeo', domains: ['vimeo.com'] },
  { id: 'soundcloud', label: 'SoundCloud', domains: ['soundcloud.com'] },
  { id: 'spotify', label: 'Spotify', domains: ['spotify.com'] },
  { id: 'boosty', label: 'Boosty', domains: ['boosty.to'] },
  { id: 'patreon', label: 'Patreon', domains: ['patreon.com'] },
  { id: 'tiktok', label: 'TikTok', domains: ['tiktok.com'] },
  { id: 'hackerone', label: 'HackerOne', domains: ['hackerone.com'] },
]

const BY_DOMAIN: ReadonlyMap<string, ServiceDefinition> = new Map(
  SERVICES.flatMap((service) => service.domains.map((domain) => [domain, service] as const)),
)

export function serviceForDomain(domain: string): ServiceDefinition | null {
  return BY_DOMAIN.get(domain) ?? null
}
