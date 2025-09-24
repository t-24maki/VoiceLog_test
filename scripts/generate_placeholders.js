// Create 5 colored square PNGs (256x256) into public using sharp (ESM)
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function main() {
  const outDir = path.resolve(__dirname, '..', 'public')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

  const colors = [
    { name: '1', rgb: { r: 52, g: 152, b: 219 } },   // blue
    { name: '2', rgb: { r: 39, g: 174, b: 96 } },    // green
    { name: '3', rgb: { r: 241, g: 196, b: 15 } },   // yellow
    { name: '4', rgb: { r: 230, g: 126, b: 34 } },   // orange
    { name: '5', rgb: { r: 231, g: 76, b: 60 } },    // red
  ]

  await Promise.all(colors.map(async ({ name, rgb }) => {
    const buffer = await sharp({ create: { width: 256, height: 256, channels: 3, background: rgb } })
      .png()
      .toBuffer()
    const outPath = path.join(outDir, `${name}.png`)
    await fs.promises.writeFile(outPath, buffer)
    console.log('wrote', outPath)
  }))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
