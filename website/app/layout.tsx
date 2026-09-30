import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Sans, JetBrains_Mono, Space_Grotesk } from 'next/font/google'
import { DESCRIPTION, SITE_URL } from '@/lib/site'
import './tokens.css'
import './globals.css'

// next/font downloads these at build time and serves them from the site itself: no request to Google at runtime.
const display = Space_Grotesk({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-space-grotesk', display: 'swap' })
const body = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-plex-sans', display: 'swap' })
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-jetbrains-mono', display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'DSA Tutor · a Claude skill that won’t give you the answer',
    template: '%s · DSA Tutor',
  },
  description: DESCRIPTION,
  applicationName: 'DSA Tutor',
  keywords: ['DSA', 'data structures and algorithms', 'Claude skill', 'MCP server', 'coding interview practice', 'LeetCode', 'tutor'],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'DSA Tutor',
    title: 'DSA Tutor',
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DSA Tutor',
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f8fb' },
    { media: '(prefers-color-scheme: dark)', color: '#11141c' },
  ],
}

// Applies a saved theme before first paint, so a dark-mode visitor never sees a light flash.
const themeScript = `try{var t=localStorage.getItem('dsa-tutor-theme');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t}catch(e){}`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
