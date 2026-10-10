import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const REPO = path.resolve(import.meta.dirname, '..', '..')
const OUT = path.join(REPO, 'screenshots', 'readme')
const { chromium } = createRequire(path.join(REPO, 'frontend', 'package.json'))('@playwright/test')

const readme = fs.readFileSync(path.join(REPO, 'README.md'), 'utf8')
const head = readme.slice(0, readme.indexOf('> **'))
fs.mkdirSync(OUT, { recursive: true })
const html = `<!doctype html><html><head><meta charset="utf-8"><base href="${pathToFileURL(REPO).href}/"><style>
body{margin:0;font:16px/1.5 -apple-system,Segoe UI,Helvetica,Arial,sans-serif}
main{max-width:700px;margin:0 auto;padding:32px}
p{margin:0 0 16px}
@media (prefers-color-scheme: dark){body{background:#0d1117;color:#e6edf3}}
@media (prefers-color-scheme: light){body{background:#ffffff;color:#1f2328}}
</style></head><body><main>${head}</main></body></html>`
const file = path.join(OUT, 'preview.html')
fs.writeFileSync(file, html)
const browser = await chromium.launch()
for (const scheme of ['light', 'dark']) {
  const page = await browser.newPage({
    viewport: { width: 764, height: 900 },
    colorScheme: scheme,
  })
  await page.goto(pathToFileURL(file).href)
  await page.waitForTimeout(300)
  await page.screenshot({
    path: path.join(OUT, `readme-${scheme}.png`),
    fullPage: true,
  })
  await page.close()
}
await browser.close()
fs.rmSync(file)
console.log(
  'screenshots/readme: readme-light.png and readme-dark.png, the header as GitHub shows it',
)
