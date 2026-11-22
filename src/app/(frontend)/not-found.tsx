import Link from 'next/link'

/** Shown for any public page that does not exist. */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[50vh] max-w-2xl flex-col items-center justify-center px-8 py-16 text-center">
      <h1 className="font-serif text-4xl text-forest-900">Page not found</h1>
      <p className="mt-4 text-moss-600">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link className="mt-6 font-bold text-coral-500 underline-offset-4 hover:underline" href="/">
        &larr; Back to the walks
      </Link>
    </main>
  )
}
