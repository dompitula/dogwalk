import type { CollectionConfig } from 'payload'
import { BOOKING_LIMITS, EXPERIENCE_OPTIONS, validateBookingField } from '../lib/booking-rules'
import { sendApprovalEmail } from '../lib/email/send-approval-email'
import { sendCancellationEmail } from '../lib/email/send-cancellation-email'
import { toID } from '../lib/ids'
import { BOOKING_STATUS_OPTIONS } from '../lib/walks'

const isAdmin = ({ req }: { req: { user?: { collection?: string } | null } }) =>
  req.user?.collection === 'admins'

export const Bookings: CollectionConfig = {
  slug: 'bookings',
  access: {
    create: () => true,
    delete: isAdmin,
    read: isAdmin,
    update: isAdmin,
  },
  admin: {
    group: 'Walks',
    useAsTitle: 'fullName',
    defaultColumns: ['fullName', 'slot', 'status', 'createdAt'],
  },
  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        if (operation !== 'create') return data

        const slotID = toID(data.slot)
        if (slotID === null) throw new Error('Please choose an available walk.')

        // A walk that was deleted meanwhile is no longer available either (null, not an error).
        const slot = await req.payload.findByID({
          collection: 'walk-slots',
          id: slotID,
          depth: 0,
          overrideAccess: false,
          disableErrors: true,
          req,
        })

        if (!slot || slot.status !== 'available' || new Date(slot.startsAt) <= new Date()) {
          throw new Error('That walk is no longer available. Please choose another time.')
        }

        return data
      },
    ],
    afterChange: [
      sendApprovalEmail,
      sendCancellationEmail,
      async ({ doc, operation, req }) => {
        const slotID = toID(doc.slot)
        if (operation !== 'create' || slotID === null) return
        await req.payload.update({
          collection: 'walk-slots',
          id: slotID,
          data: { status: 'booked' },
          overrideAccess: true,
          req,
        })
      },
    ],
    afterDelete: [
      // Reopen the walk for public booking, unless staff cancelled the walk itself.
      async ({ doc, req }) => {
        const slotID = toID(doc.slot)
        if (slotID === null) return

        const { docs } = await req.payload.find({
          collection: 'walk-slots',
          where: { id: { equals: slotID } },
          depth: 0,
          limit: 1,
          overrideAccess: true,
          req,
        })
        if (docs[0]?.status !== 'booked') return

        await req.payload.update({
          collection: 'walk-slots',
          id: slotID,
          data: { status: 'available' },
          overrideAccess: true,
          req,
        })
      },
    ],
  },
  // The visitor's details follow the rules in src/lib/booking-rules.ts, which the public
  // booking form checks too.
  fields: [
    {
      name: 'slot',
      type: 'relationship',
      relationTo: 'walk-slots',
      required: true,
      unique: true,
    },
    {
      name: 'fullName',
      type: 'text',
      required: true,
      maxLength: BOOKING_LIMITS.fullName.max,
      validate: validateBookingField('fullName'),
    },
    {
      name: 'email',
      type: 'email',
      required: true,
      validate: validateBookingField('email'),
    },
    {
      name: 'phone',
      type: 'text',
      required: true,
      maxLength: BOOKING_LIMITS.phone.max,
      validate: validateBookingField('phone'),
    },
    {
      name: 'experience',
      type: 'select',
      required: true,
      options: EXPERIENCE_OPTIONS.map(({ label, value }) => ({ label, value })),
      validate: validateBookingField('experience'),
    },
    {
      name: 'notes',
      type: 'textarea',
      maxLength: BOOKING_LIMITS.notes.max,
      validate: validateBookingField('notes'),
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: BOOKING_STATUS_OPTIONS.map((option) => ({
        label: option.label,
        value: option.value,
      })),
      access: {
        create: isAdmin,
        update: isAdmin,
      },
      admin: { position: 'sidebar' },
    },
  ],
}
