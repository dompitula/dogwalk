import type { CollectionConfig, FieldAccess } from 'payload'
import { WALK_ROUTES } from '../lib/walks'

// Route and handling notes are for shelter staff; the public site never sees them.
const staffOnly: FieldAccess = ({ req }) => req.user?.collection === 'admins'

export const WalkSlots: CollectionConfig = {
  slug: 'walk-slots',
  access: {
    read: () => true,
  },
  admin: {
    group: 'Walks',
    useAsTitle: 'label',
    defaultColumns: ['label', 'dog', 'shelter', 'startsAt', 'status'],
  },
  hooks: {
    beforeDelete: [
      // Keep bookings from pointing at a walk that no longer exists.
      async ({ id, req }) => {
        const { docs } = await req.payload.find({
          collection: 'bookings',
          where: { slot: { equals: id } },
          depth: 0,
          limit: 1,
          overrideAccess: true,
          req,
        })

        if (docs.length) {
          throw new Error('This walk has a booking. Delete the booking first, then the walk.')
        }
      },
    ],
  },
  fields: [
    {
      name: 'label',
      type: 'text',
      required: true,
      admin: {
        description: 'A short admin label, such as “Milo · Saturday morning”.',
      },
    },
    {
      name: 'dog',
      type: 'relationship',
      relationTo: 'dogs',
      required: true,
    },
    {
      name: 'shelter',
      type: 'relationship',
      relationTo: 'shelters',
      required: true,
    },
    {
      name: 'startsAt',
      type: 'date',
      required: true,
      index: true,
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
    {
      name: 'durationMinutes',
      type: 'number',
      required: true,
      defaultValue: 45,
      min: 20,
      max: 120,
    },
    {
      name: 'route',
      label: 'Approved route',
      type: 'select',
      options: WALK_ROUTES.map((route) => ({ label: route.label, value: route.value })),
      access: { read: staffOnly },
      admin: { position: 'sidebar' },
    },
    {
      name: 'handlingNotes',
      type: 'textarea',
      maxLength: 500,
      access: { read: staffOnly },
      admin: {
        description: 'Harness, behaviour, medication or other instructions. Staff only.',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'available',
      index: true,
      options: [
        { label: 'Available', value: 'available' },
        { label: 'Booked', value: 'booked' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
      admin: { position: 'sidebar' },
    },
  ],
}
