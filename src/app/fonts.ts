import { DM_Sans, Fraunces, Manrope } from 'next/font/google'

/**
 * The app's fonts. next/font downloads them when the app is built and serves them with
 * the app, so browsers never fetch them from Google. Each root layout puts the variables
 * of the fonts it uses on <html>, and src/app/tokens.css turns them into the font tokens.
 */

/** Body text everywhere (`font-sans`). */
export const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' })

/** Public site headings (`font-serif`). */
export const fraunces = Fraunces({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  axes: ['opsz'],
  variable: '--font-fraunces',
})

/** Dashboard headings (`font-display`). */
export const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope' })
