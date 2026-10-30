// Génère les icônes PNG de l'app (écran d'accueil Android/iOS) à partir d'un SVG.
// Usage : node scripts/icons.mjs
import { chromium } from '@playwright/test'

// full : fond jusqu'aux bords (iOS arrondit lui-même, Android découpe les « maskable »).
function svg(size, { rounded, scale }) {
  const r = rounded ? size * 0.22 : 0
  const fs = size * 0.56 * scale
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${r}" fill="#C2410C"/>
    <text x="50%" y="50%" dy="0.35em" font-family="Arial, Helvetica, sans-serif" font-size="${fs}" font-weight="700" fill="#fff" text-anchor="middle">B</text>
  </svg>`
}

const ICONS = [
  { file: 'icon-192.png', size: 192, rounded: true, scale: 1 },
  { file: 'icon-512.png', size: 512, rounded: true, scale: 1 },
  { file: 'icon-maskable-512.png', size: 512, rounded: false, scale: 0.8 },
  { file: 'apple-touch-icon.png', size: 180, rounded: false, scale: 0.9 },
]

const browser = await chromium.launch()
const page = await browser.newPage()
for (const icon of ICONS) {
  await page.setViewportSize({ width: icon.size, height: icon.size })
  await page.setContent(`<style>html,body{margin:0;background:transparent}</style>${svg(icon.size, icon)}`)
  await page.locator('svg').screenshot({ path: `public/${icon.file}`, omitBackground: true })
  console.log('public/' + icon.file)
}
await browser.close()
