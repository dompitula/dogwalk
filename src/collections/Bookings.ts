import type { CollectionConfig } from 'payload'
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

        const slotID =
          typeof data.slot === 'object' && data.slot !== null ? data.slot.id : data.slot

        if (!slotID) throw new Error('Please choose an available walk.')

        const slot = await req.payload.findByID({
          collection: 'walk-slots',
          id: slotID,
          depth: 0,
          overrideAccess: false,
          req,
        })

        if (slot.status !== 'available' || new Date(slot.startsAt) <= new Date()) {
          throw new Error('That walk is no longer available. Please choose another time.')
        }

        return data
      },
    ],
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation !== 'create') return
        const slotID = typeof doc.slot === 'object' ? doc.slot.id : doc.slot
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
        const slotID =
          typeof doc.slot === 'object' && doc.slot !== null ? doc.slot.id : doc.slot
        if (!slotID) return

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
      maxLength: 100,
    },
    {
      name: 'email',
      type: 'email',
      required: true,
    },
    {
      name: 'phone',
      type: 'text',
      required: true,
      maxLength: 40,
    },
    {
      name: 'experience',
      type: 'select',
      required: true,
      options: [
        { label: 'First time walking a shelter dog', value: 'first-time' },
        { label: 'Some dog walking experience', value: 'some' },
        { label: 'Experienced dog walker', value: 'experienced' },
      ],
    },
    {
      name: 'notes',
      type: 'textarea',
      maxLength: 500,
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
