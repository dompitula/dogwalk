'use client'
import { useActionState, useState } from 'react'
import { Icon } from '@/components/icon'
import { BRAND_NAME } from '@/lib/brand'
import { saveEmailSettings, sendTestEmail } from './actions'
export function EmailForm({
  settings,
  recipient,
}: {
  settings: {
    enabled: boolean
    from: string
    timeZone: string
    replyTo: string
    hasEnvironmentKey: boolean
  }
  recipient: string
}) {
  const [result, save, saving] = useActionState(saveEmailSettings, { ok: false, message: '' })
  const [testResult, test, testing] = useActionState(sendTestEmail, { ok: false, message: '' })
  const [enabled, setEnabled] = useState(settings.enabled)
  return (
    <div className="email-layout">
      {/* Keep the chosen settings visible when React resets the form after an action. */}
      <form
        action={save}
        onReset={(event) => event.preventDefault()}
        className="email-card email-settings-form"
      >
        <div className="email-card-heading">
          <div>
            <span className="email-eyebrow">DELIVERY</span>
            <h2>Booking confirmations</h2>
          </div>
          <span className="email-provider">via Resend</span>
        </div>
        <label className="email-toggle-row">
          <span>
            <strong>Send confirmation emails</strong>
            <small>Let volunteers know their request is in.</small>
          </span>
          <input
            className="email-switch"
            type="checkbox"
            role="switch"
            name="enabled"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
        </label>
        <div className="email-fields">
          <label htmlFor="email-from">Sender address</label>
          <input
            id="email-from"
            name="from"
            defaultValue={settings.from}
            placeholder={`${BRAND_NAME} <onboarding@resend.dev>`}
            maxLength={254}
            aria-describedby="sender-help"
          />
          <p id="sender-help" className="email-help">
            Use a verified Resend sender. With onboarding@resend.dev, emails can only go to your
            Resend account address.
          </p>
          <label htmlFor="email-reply-to">Reply-To address</label>
          <input
            id="email-reply-to"
            type="email"
            name="replyTo"
            defaultValue={settings.replyTo}
            placeholder="shelter@gmail.com"
            maxLength={254}
            aria-describedby="reply-to-help"
          />
          <p id="reply-to-help" className="email-help">
            Replies will go to this address, including Gmail or Outlook. Leave blank to use the
            sender address.
          </p>
          <p className="email-help" role="status">
            {settings.hasEnvironmentKey
              ? 'Email delivery is configured on the server.'
              : 'Email delivery is not configured. Ask your administrator to set it up before enabling notifications.'}
          </p>
          <label htmlFor="email-zone">Time zone</label>
          <input
            id="email-zone"
            name="timeZone"
            defaultValue={settings.timeZone}
            required
            aria-describedby="zone-help"
          />
          <p id="zone-help" className="email-help">
            Used for the walk date and time in each email.
          </p>
        </div>
        <footer className="email-save-row">
          <span>Changes apply as soon as you save.</span>
          <button className="email-button email-button-primary" disabled={saving || testing}>
            {saving ? 'Saving...' : 'Save settings'}
          </button>
        </footer>
        {result.message && (
          <p role="status" className={'email-feedback ' + (result.ok ? 'is-success' : 'is-error')}>
            {result.message}
          </p>
        )}
      </form>
      <aside className="email-side">
        <section className="email-preview">
          <span className="email-eyebrow">A BETTER WELCOME</span>
          <div className="email-envelope" aria-hidden="true">
            <Icon name="mail" size={32} />
          </div>
          <h2>
            Request received.
            <br />
            Tail wags to follow.
          </h2>
          <p>Each confirmation includes the dog, walk time and shelter details.</p>
          <div className="email-preview-note">
            A confirmation acknowledges the request. Your team still approves the walk.
          </div>
        </section>
        <form action={test} className="email-card email-test">
          <h2>Give it a test run</h2>
          <p>Save your settings, then send yourself a preview.</p>
          <div className="email-recipient">
            <span>DELIVER TO</span>
            <strong>{recipient}</strong>
          </div>
          <button className="email-button email-button-secondary" disabled={saving || testing}>
            {testing ? 'Sending...' : 'Send test email'} <span aria-hidden="true">&rarr;</span>
          </button>
          {testResult.message && (
            <p
              role="status"
              className={'email-feedback ' + (testResult.ok ? 'is-success' : 'is-error')}
            >
              {testResult.message}
            </p>
          )}
        </form>
      </aside>
    </div>
  )
}
