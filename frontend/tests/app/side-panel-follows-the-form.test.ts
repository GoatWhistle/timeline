import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(process.cwd(), 'src')

const PANELS = {
  'app/pages/admin-event-page.tsx': 'the cover beside the general form',
  'features/registration/registration-tab.tsx': 'the state and versions beside the registration',
}

function aside(file: string): string {
  const source = readFileSync(join(SRC, file), 'utf8')
  const found = source.match(/<aside className="([^"]+)"/)
  if (!found?.[1]) throw new Error(`no side panel in ${file}`)
  return found[1]
}

describe('a side panel sits beside the form, and below it once they stack', () => {
  for (const [file, what] of Object.entries(PANELS)) {
    it(`puts ${what} after the form while the two are stacked`, () => {
      expect(aside(file)).toContain('order-last')
    })

    it(`returns ${what} to its own place once the panel column opens`, () => {
      const classes = aside(file)
      const split = classes.match(/(@\w+):col-start-2/)?.[1]
      expect(split).toBeTypeOf('string')
      expect(classes).toContain(`${split}:order-none`)
    })
  }
})
