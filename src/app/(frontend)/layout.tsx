import React from 'react'
import type { Metadata } from 'next'
import { BRAND_NAME } from '@/lib/brand'
import { dmSans, fraunces } from '../fonts'
import './styles.css'

const description = 'Book a feel-good walk with a dog from a local shelter.'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: BRAND_NAME,
  description,
  icons: { icon: '/favicon.svg' },
  openGraph: { title: BRAND_NAME, description },
}

/** Root layout for the public booking site (/). */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${fraunces.variable}`}>
      <body className="min-h-screen bg-cream text-forest-900 antialiased">{children}</body>
    </html>
  )
}
