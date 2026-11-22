import { redirect } from 'next/navigation'
import { BRAND_NAME } from '@/lib/brand'
import { getStaffSession } from '@/lib/staff-auth'
import { EmailForm } from './form'
export default async function EmailSettingsPage() {
  const { payload, user } = await getStaffSession()
  if (!user) redirect('/dashboard/login')
  const settings = await payload.findGlobal({ slug: 'email-settings', overrideAccess: true })
  return (
    <main className="email-settings-page">
      <nav className="email-topbar">
        {/* oxlint-disable-next-line nextjs/no-html-link-for-pages -- same root layout; moving to next/link changes navigation, so it is a follow-up */}
        <a href="/dashboard" className="email-brand">
          {BRAND_NAME}
          <span>Staff workspace</span>
        </a>
        {/* oxlint-disable-next-line nextjs/no-html-link-for-pages -- same root layout; moving to next/link changes navigation, so it is a follow-up */}
        <a className="email-back" href="/dashboard">
          &larr; Back to dashboard
        </a>
      </nav>
      <header className="email-heading">
        <span className="email-eyebrow">SETTINGS / NOTIFICATIONS</span>
        <h1>
          A little reassurance,
          <br />
          straight to their inbox.
        </h1>
        <p>Manage the confirmation emails volunteers receive after requesting a walk.</p>
      </header>
      <EmailForm
        recipient={user.email}
        settings={{
          enabled: Boolean(settings.enabled),
          from: settings.from || '',
          timeZone: settings.timeZone || 'Europe/Warsaw',
          replyTo: settings.replyTo || '',
          hasEnvironmentKey: Boolean(process.env.RESEND_API_KEY?.trim()),
        }}
      />
    </main>
  )
}
