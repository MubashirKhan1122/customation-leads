import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Customation Lead Machine',
  description: 'Automated lead generation, website auditing, and cold outreach platform',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'Customation Lead Machine',
    description: 'Find leads, audit websites, send cold emails — all automated',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
