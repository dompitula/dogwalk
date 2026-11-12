import path from 'path'
import { fileURLToPath } from 'url'
import { buildConfig } from 'payload'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { mcpPlugin } from '@payloadcms/plugin-mcp'
import { en as adminLanguage } from '@payloadcms/translations/languages/en'
import { EmailSettings } from './globals/EmailSettings'
import { Admins } from './collections/Admins'
import { Media } from './collections/Media'
import { Folders } from './collections/Folders'
import { Tags } from './collections/Tags'
import { Shelters } from './collections/Shelters'
import { Dogs } from './collections/Dogs'
import { WalkSlots } from './collections/WalkSlots'
import { Bookings } from './collections/Bookings'
import { seedStarterData } from './seed/index'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Admins.slug,
    constrainWidth: true,
    components: {
      // "← Staff dashboard" at the top of the sidebar. After changing admin components,
      // run `pnpm generate:importmap` (the build also does it).
      beforeNavLinks: ['/components/admin/DashboardLink#DashboardLink'],
    },
    dashboard: {
      widgets: [],
      defaultLayout: [
        { widgetSlug: 'activity', width: 'full' },
        { widgetSlug: 'collections', width: 'full' },
      ],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  i18n: {
    fallbackLanguage: 'en',
    supportedLanguages: { en: adminLanguage },
  },
  globals: [EmailSettings],
  collections: [Admins, Media, Folders, Tags, Shelters, Dogs, WalkSlots, Bookings],
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  localization: {
    locales: [{ code: 'en', label: 'English' }],
    fallback: true,
    defaultLocale: 'en',
  },
  plugins: [mcpPlugin({})],
  editor: lexicalEditor(),
  // Set PAYLOAD_SECRET in .env (see .env.example). Payload refuses to start without it.
  secret: process.env.PAYLOAD_SECRET || '',
  // Local SQLite database file. The tables are created automatically by `pnpm dev`.
  db: sqliteAdapter({
    client: {
      url: process.env.DATABASE_URL || 'file:./shelter.db',
    },
  }),
  // Fills an empty database with a sample shelter, dogs, walk times and three demo bookings,
  // unless SAMPLE_DATA=false (deploy.sh --clean). See src/seed/index.ts.
  onInit: async (payload) => {
    await seedStarterData(payload)
  },
})
