'use client'

import { type FormEvent, useState } from 'react'

function PawIcon() {
  return (
    <svg
      width="25"
      height="25"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 5.5C8.5 3 5.5 2.5 4 4c-1.5 1.5-.5 4.5 2 5.5" />
      <path d="M14 5.5C15.5 3 18.5 2.5 20 4c1.5 1.5.5 4.5-2 5.5" />
      <path d="M6 10c0 7 2.7 11 6 11s6-4 6-11c-1.8-2-3.8-3-6-3s-4.2 1-6 3Z" />
      <path d="M9.5 13h.01M14.5 13h.01M10 17c1.2 1 2.8 1 4 0" />
    </svg>
  )
}

export function LoginForm({ hasStaffAccount }: { hasStaffAccount: boolean }) {
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setPending(true)
    const form = new FormData(event.currentTarget)

    try {
      // Payload's login endpoint sets the session cookie used by /dashboard and /admin.
      const response = await fetch('/api/admins/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
      })

      if (response.ok) {
        window.location.assign('/dashboard')
        return
      }

      const body = (await response.json().catch(() => null)) as {
        errors?: { message?: string }[]
      } | null
      setError(body?.errors?.[0]?.message || 'The email or password is incorrect.')
    } catch {
      setError('Could not reach the server. Check that the dev server (pnpm dev) is still running.')
    }
    setPending(false)
  }

  return (
    <main className="login-shell">
      <div className="login-card">
        <div className="brand login-brand">
          <span className="brand-mark">
            <PawIcon />
          </span>
          <span>ShelterWalk</span>
        </div>
        <p className="eyebrow">Shelter staff</p>
        <h1>Sign in to the dashboard</h1>

        {hasStaffAccount ? (
          <form onSubmit={signIn}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="primary-button" disabled={pending}>
              {pending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        ) : (
          <div className="login-empty">
            <p>
              There is no staff account yet. Create the first one in the content manager, then come
              back here.
            </p>
            <a className="primary-button" href="/admin">
              Create the first staff account
            </a>
          </div>
        )}

        <div className="login-links">
          <a href="/">← Back to the public site</a>
          <a href="/admin">Content manager</a>
        </div>
      </div>
    </main>
  )
}
