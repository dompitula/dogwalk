import { Icon, type IconName } from '@/components/icon'
import { BRAND_NAME } from '@/lib/brand'
import type { NavView } from './walk-view'
import { initialsOf } from './walk-view'

const NAV_ITEMS: { label: NavView; icon: IconName }[] = [
  { label: 'Overview', icon: 'home' },
  { label: 'Schedule', icon: 'calendar' },
  { label: 'Dogs', icon: 'dogs' },
  { label: 'Volunteers', icon: 'users' },
]

/** The dashboard's navigation. On small screens it slides in over the page while `open`. */
export function Sidebar({
  activeView,
  open,
  staffEmail,
  onNavigate,
  onClose,
  onSignOut,
}: {
  activeView: NavView
  open: boolean
  staffEmail: string
  onNavigate: (view: NavView) => void
  onClose: () => void
  onSignOut: () => void
}) {
  return (
    <>
      {open && <button className="sidebar-backdrop" aria-label="Close menu" onClick={onClose} />}
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <span className="brand-mark">
            <Icon name="paw" size={25} />
          </span>
          <span>{BRAND_NAME}</span>
        </div>
        <p className="nav-label">Shelter operations</p>
        <nav className="main-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              className={activeView === item.label ? 'active' : ''}
              onClick={() => onNavigate(item.label)}
            >
              <Icon name={item.icon} size={19} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <button
          className={`settings-link ${activeView === 'Settings' ? 'active' : ''}`}
          onClick={() => onNavigate('Settings')}
        >
          <Icon name="settings" size={19} />
          Settings
        </button>
        <div className="admin-card">
          <div className="admin-avatar">{initialsOf(staffEmail)}</div>
          <div>
            <strong title={staffEmail}>{staffEmail || 'Staff member'}</strong>
            <span>Shelter staff</span>
          </div>
          <button
            className="signout-button"
            onClick={onSignOut}
            title="Sign out"
            aria-label="Sign out"
          >
            <Icon name="logout" size={16} />
          </button>
        </div>
      </aside>
    </>
  )
}
