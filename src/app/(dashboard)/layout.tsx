import type { Metadata } from 'next'
import React from 'react'
import './dashboard.css'

export const metadata: Metadata = {
  title: 'ShelterWalk · Staff',
  description: 'Schedule and manage shelter dog walks.',
  icons: { icon: '/dashboard-favicon.png' },
  robots: { index: false, follow: false },
}

/** Root layout for the staff dashboard (/dashboard). Kept separate so its styles never mix with the public site. */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
