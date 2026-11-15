import type { GlobalConfig } from 'payload'
export const EmailSettings: GlobalConfig = {
  slug: 'email-settings',
  admin: { hidden: true },
  access: { read: () => false, update: () => false },
  fields: [
    { name: 'enabled', type: 'checkbox', defaultValue: false },
    { name: 'from', type: 'text' },
    { name: 'replyTo', type: 'email' },
    // Legacy column kept for database compatibility; email delivery no longer reads it.
    { name: 'encryptedKey', type: 'text', admin: { hidden: true } },
    { name: 'timeZone', type: 'text', defaultValue: 'Europe/Warsaw' },
  ],
}
