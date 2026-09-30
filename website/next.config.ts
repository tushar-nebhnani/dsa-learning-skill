import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { NextConfig } from 'next'

// A static export: `next build` writes plain HTML, CSS and JS to out/, so any static host can serve it.
// BASE_PATH is only needed when the site lives under a sub-path, such as a GitHub Pages project site.
const basePath = process.env.BASE_PATH || ''

// `prebuild` zips ../dsa-learning-skill into public/. If that folder wasn't available to the build
// (for example, a host that only uploads website/), the download buttons use the GitHub release instead.
const hasZip = existsSync(join(process.cwd(), 'public', 'dsa-learning-skill.zip'))
const skillZip = hasZip
  ? `${basePath}/dsa-learning-skill.zip`
  : 'https://github.com/tushar-nebhnani/dsa-learning-skill/releases/latest/download/dsa-learning-skill.zip'
if (!hasZip) console.warn('⚠ public/dsa-learning-skill.zip is missing; download buttons will point to the GitHub release.')

const nextConfig: NextConfig = {
  output: 'export',
  basePath: basePath || undefined,
  env: { NEXT_PUBLIC_SKILL_ZIP: skillZip },
  images: { unoptimized: true },
  reactStrictMode: true,
}

export default nextConfig
