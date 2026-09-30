// Renders scripts/og-card.html to app/opengraph-image.png (1200×630), which Next.js uses for Open Graph and Twitter cards.
// Needs Google Chrome installed. Run with: npm run og-image
const path = require('path')
const { chromium } = require('playwright-core')
;(async () => {
  const browser = await chromium.launch({ channel: 'chrome' })
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
  await page.goto('file://' + path.join(__dirname, 'og-card.html'))
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: path.join(__dirname, '..', 'app', 'opengraph-image.png') })
  await browser.close()
  console.log('wrote app/opengraph-image.png')
})()
