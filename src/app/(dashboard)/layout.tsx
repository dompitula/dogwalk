import type { Metadata } from 'next'
import React from 'react'
import { BRAND_NAME } from '@/lib/brand'
import { dmSans, manrope } from '../fonts'
import './dashboard.css'

export const metadata: Metadata = {
  title: { default: `Staff · ${BRAND_NAME}`, template: `%s · ${BRAND_NAME}` },
  description: 'Schedule and manage shelter dog walks.',
  icons: { icon: '/favicon.svg' },
  robots: { index: false, follow: false },
}

/** Root layout for the staff dashboard (/dashboard). Kept separate so its styles never mix with the public site. */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${manrope.variable}`}>
      <body>{children}</body>
    </html>
  )
}
