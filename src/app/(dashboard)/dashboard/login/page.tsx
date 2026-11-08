import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getStaffSession } from '@/lib/staff-auth'
import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Staff sign in · ShelterWalk',
}

export default async function StaffLoginPage() {
  const { payload, user } = await getStaffSession()
  if (user) redirect('/dashboard')

  // Only used to decide whether to point to the "create first account" screen.
  const staff = await payload.find({
    collection: 'admins',
    depth: 0,
    limit: 1,
    overrideAccess: true,
  })

  return <LoginForm hasStaffAccount={staff.docs.length > 0} />
}
