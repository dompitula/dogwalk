/**
 * First entry in the content manager's sidebar (/admin), linking back to the staff
 * dashboard. Registered in payload.config.ts under `admin.components.beforeNavLinks`
 * and uses Payload's own nav classes so it looks like the other sidebar links.
 *
 * A plain <a>, not next/link: /dashboard has its own root layout, so the browser
 * loads it as a new page either way.
 */
export function DashboardLink() {
  return (
    <div className="nav__link-wrapper" style={{ marginBottom: 'calc(var(--base, 20px) * 0.75)' }}>
      <a className="nav__link" href="/dashboard" id="nav-staff-dashboard">
        <span className="nav__link-label">← Staff dashboard</span>
      </a>
    </div>
  )
}
