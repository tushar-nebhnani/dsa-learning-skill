import type { NextConfig } from 'next'

// A static export: `next build` writes plain HTML, CSS and JS to out/, so any static host can serve it.
// BASE_PATH is only needed when the site lives under a sub-path, such as a GitHub Pages project site.
const nextConfig: NextConfig = {
  output: 'export',
  basePath: process.env.BASE_PATH || undefined,
  images: { unoptimized: true },
  reactStrictMode: true,
}

export default nextConfig
