import { Icon } from '@/components/icon'
import { WALK_DURATIONS } from '@/lib/walks'

export function SettingsView({
  staffEmail,
  defaultDuration,
  onDefaultDurationChange,
  onSignOut,
}: {
  staffEmail: string
  defaultDuration: number
  onDefaultDurationChange: (minutes: number) => void
  onSignOut: () => void
}) {
  return (
    <section className="panel settings-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Preferences</p>
          <h2>Shelter settings</h2>
        </div>
      </div>
      <div className="settings-list">
        <div className="settings-row">
          <div>
            <strong>Email settings</strong>
            <span>Manage booking emails, sender details and test delivery.</span>
          </div>
          {/* oxlint-disable-next-line nextjs/no-html-link-for-pages -- same root layout; moving to next/link changes navigation, so it is a follow-up */}
          <a className="secondary-button settings-action" href="/dashboard/email">
            Open <Icon name="external" size={14} />
          </a>
        </div>
        <label>
          <div>
            <strong>Default walk duration</strong>
            <span>Used when scheduling a new shelter walk. Saved in this browser.</span>
          </div>
          <select
            value={defaultDuration}
            onChange={(event) => onDefaultDurationChange(Number(event.target.value))}
          >
            {WALK_DURATIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} min
              </option>
            ))}
          </select>
        </label>
        <div className="settings-row">
          <div>
            <strong>Content manager</strong>
            <span>Add or edit dogs, photos, shelters, walks, bookings and staff accounts.</span>
          </div>
          {/* oxlint-disable-next-line nextjs/no-html-link-for-pages -- /admin has its own root layout, so the browser loads it as a new page either way */}
          <a className="secondary-button settings-action" href="/admin">
            Open <Icon name="external" size={14} />
          </a>
        </div>
        <div className="settings-row">
          <div>
            <strong>Public booking site</strong>
            <span>See the walks visitors can book right now.</span>
          </div>
          {/* oxlint-disable-next-line nextjs/no-html-link-for-pages -- The public site has its own root layout, so the browser loads it as a new page either way */}
          <a className="secondary-button settings-action" href="/">
            Open <Icon name="external" size={14} />
          </a>
        </div>
        <div className="settings-row">
          <div>
            <strong>Signed in as {staffEmail || 'staff member'}</strong>
            <span>Signing out also signs you out of the content manager.</span>
          </div>
          <button className="secondary-button settings-action" onClick={onSignOut}>
            Sign out <Icon name="logout" size={14} />
          </button>
        </div>
      </div>
    </section>
  )
}
