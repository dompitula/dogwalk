'use client'

import { type FormEvent, useState } from 'react'
import { Icon } from '@/components/icon'
import { BRAND_NAME } from '@/lib/brand'

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
      setError('Could not reach the server. Check your connection and try again.')
    }
    setPending(false)
  }

  return (
    <main className="login-shell">
      <div className="login-card">
        <div className="brand login-brand">
          <span className="brand-mark">
            <Icon name="paw" size={25} />
          </span>
          <span>{BRAND_NAME}</span>
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
