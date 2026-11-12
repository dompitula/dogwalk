'use client'
import { useActionState, useState } from 'react'
import { saveEmailSettings, sendTestEmail } from './actions'
export function EmailForm({ settings, recipient }: { settings: { enabled: boolean; from: string; timeZone: string; hasKey: boolean }; recipient: string }) {
  const [result, save, saving] = useActionState(saveEmailSettings, { ok: false, message: '' })
  const [testResult, test, testing] = useActionState(sendTestEmail, { ok: false, message: '' })
  const [enabled, setEnabled] = useState(settings.enabled)
  return <div className="email-layout">
    <form action={save} className="email-card email-settings-form">
      <div className="email-card-heading"><div><span className="email-eyebrow">DELIVERY</span><h2>Booking confirmations</h2></div><span className="email-provider">via Resend</span></div>
      <label className="email-toggle-row"><span><strong>Send confirmation emails</strong><small>Let volunteers know their request is in.</small></span><input className="email-switch" type="checkbox" role="switch" name="enabled" checked={enabled} onChange={event => setEnabled(event.target.checked)} /></label>
      <div className="email-fields">
        <label htmlFor="email-from">Sender address</label><input id="email-from" name="from" defaultValue={settings.from} placeholder="ShelterWalk <bookings@yourdomain.com>" maxLength={254} aria-describedby="sender-help" /><p id="sender-help" className="email-help">The name and address volunteers will see. Use a verified Resend sender.</p>
        <label htmlFor="email-key">Resend API key<span className="email-label-note">Private</span></label><input id="email-key" type="password" name="apiKey" autoComplete="new-password" placeholder={settings.hasKey ? 'Saved key - leave blank to keep it' : 'Paste your API key'} maxLength={256} aria-describedby="key-help" /><p id="key-help" className="email-help">Stored securely. Leave blank to keep your saved key.</p>
        <label htmlFor="email-zone">Time zone</label><input id="email-zone" name="timeZone" defaultValue={settings.timeZone} required aria-describedby="zone-help" /><p id="zone-help" className="email-help">Used for the walk date and time in each email.</p>
      </div>
      <footer className="email-save-row"><span>Changes apply as soon as you save.</span><button className="email-button email-button-primary" disabled={saving || testing}>{saving ? 'Saving...' : 'Save settings'}</button></footer>
      {result.message && <p role="status" className={'email-feedback ' + (result.ok ? 'is-success' : 'is-error')}>{result.message}</p>}
    </form>
    <aside className="email-side">
      <section className="email-preview"><span className="email-eyebrow">A BETTER WELCOME</span><div className="email-envelope" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none"><rect x="5" y="11" width="38" height="27" rx="5" stroke="currentColor" strokeWidth="2"/><path d="m7 14 17 13 17-13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></div><h2>Request received.<br />Tail wags to follow.</h2><p>Each confirmation includes the dog, walk time and shelter details.</p><div className="email-preview-note">A confirmation acknowledges the request. Your team still approves the walk.</div></section>
      <form action={test} className="email-card email-test"><h2>Give it a test run</h2><p>Save your settings, then send yourself a preview.</p><div className="email-recipient"><span>DELIVER TO</span><strong>{recipient}</strong></div><button className="email-button email-button-secondary" disabled={saving || testing}>{testing ? 'Sending...' : 'Send test email'} <span aria-hidden="true">&rarr;</span></button>{testResult.message && <p role="status" className={'email-feedback ' + (testResult.ok ? 'is-success' : 'is-error')}>{testResult.message}</p>}</form>
    </aside>
  </div>
}
