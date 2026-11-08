import type { CollectionConfig } from 'payload'

export const Shelters: CollectionConfig = {
  slug: 'shelters',
  access: {
    read: () => true,
  },
  admin: {
    group: 'Walks',
    useAsTitle: 'name',
    defaultColumns: ['name', 'neighborhood', 'active'],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'slug',
      useAsSlug: 'name',
    },
    {
      name: 'neighborhood',
      type: 'text',
      required: true,
    },
    {
      name: 'address',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
      required: true,
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      admin: { position: 'sidebar' },
    },
  ],
}
