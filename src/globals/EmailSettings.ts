import type { GlobalConfig } from 'payload'
export const EmailSettings: GlobalConfig = {
  slug: 'email-settings',
  admin: { hidden: true },
  access: { read: () => false, update: () => false },
  fields: [
    { name: 'enabled', type: 'checkbox', defaultValue: false },
    { name: 'from', type: 'text' },
    { name: 'encryptedKey', type: 'text' },
    { name: 'timeZone', type: 'text', defaultValue: 'Europe/Warsaw' },
  ],
}
