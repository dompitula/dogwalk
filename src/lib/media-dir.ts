import path from 'node:path'

/**
 * The folder uploaded files (the Media collection) are stored in: `media` in the project
 * folder, where the app is started from. Booking emails read the dog photos from here too.
 *
 * The integration tests set `MEDIA_DIR` to a throwaway folder, so they never write into the
 * real `media` folder. It is a test-only setting, so it is not in .env.example.
 */
export const MEDIA_DIR = path.resolve(
  // The folder is chosen at run time; the build must not bundle the files it could hold.
  /*turbopackIgnore: true*/ process.cwd(),
  process.env.MEDIA_DIR || 'media',
)
