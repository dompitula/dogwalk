import type { CollectionConfig, FieldAccess } from 'payload'

// Kennel and temperament are staff notes used by the dashboard; the public site never sees them.
const staffOnly: FieldAccess = ({ req }) => req.user?.collection === 'admins'

export const Dogs: CollectionConfig = {
  slug: 'dogs',
  access: {
    read: () => true,
  },
  admin: {
    group: 'Walks',
    useAsTitle: 'name',
    defaultColumns: ['name', 'shelter', 'breed', 'energy', 'kennel'],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'shelter',
      type: 'relationship',
      relationTo: 'shelters',
      required: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'photo',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'breed',
      type: 'text',
      required: true,
    },
    {
      name: 'ageLabel',
      label: 'Age',
      type: 'text',
      required: true,
    },
    {
      name: 'size',
      type: 'select',
      required: true,
      options: [
        { label: 'Small', value: 'small' },
        { label: 'Medium', value: 'medium' },
        { label: 'Large', value: 'large' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'energy',
      type: 'select',
      required: true,
      options: [
        { label: 'Easygoing', value: 'easygoing' },
        { label: 'Moderate', value: 'moderate' },
        { label: 'High energy', value: 'high' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'bio',
      type: 'textarea',
      required: true,
    },
    {
      name: 'traits',
      type: 'array',
      maxRows: 4,
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'kennel',
      type: 'text',
      maxLength: 20,
      access: { read: staffOnly },
      admin: {
        position: 'sidebar',
        description: 'Kennel or run, e.g. “A-12”. Staff only.',
      },
    },
    {
      name: 'temperament',
      type: 'text',
      maxLength: 80,
      access: { read: staffOnly },
      admin: {
        position: 'sidebar',
        description: 'Short handling note, e.g. “Shy at first”. Staff only.',
      },
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      admin: { position: 'sidebar' },
    },
  ],
}
