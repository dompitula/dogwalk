import Image from 'next/image'
import { connection } from 'next/server'
import config from '@payload-config'
import { getPayload } from 'payload'
import { BookingExperience, type WalkOption } from './booking-experience'

function PawMark() {
  return (
    <span className="relative block h-7 w-7 rotate-[-8deg]" aria-hidden="true">
      <span className="absolute bottom-0 left-1/2 h-4 w-5 -translate-x-1/2 rounded-[55%_55%_48%_48%] bg-current" />
      <span className="absolute left-0 top-1 h-2.5 w-2.5 rounded-full bg-current" />
      <span className="absolute left-[9px] top-0 h-2.5 w-2.5 rounded-full bg-current" />
      <span className="absolute right-0 top-1.5 h-2.5 w-2.5 rounded-full bg-current" />
    </span>
  )
}

function ArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M5 12h14m-5-5 5 5-5 5" />
    </svg>
  )
}

async function getAvailableWalks(): Promise<WalkOption[]> {
  await connection()
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'walk-slots',
    overrideAccess: false,
    depth: 3,
    limit: 24,
    sort: 'startsAt',
    where: {
      and: [
        { status: { equals: 'available' } },
        { startsAt: { greater_than: new Date().toISOString() } },
      ],
    },
  })

  return result.docs.flatMap((slot) => {
    if (typeof slot.dog !== 'object' || typeof slot.shelter !== 'object') return []
    const dog = slot.dog
    const shelter = slot.shelter
    if (typeof dog.photo !== 'object' || !dog.photo.url || !dog.active || !shelter.active) return []

    return [
      {
        id: String(slot.id),
        startsAt: slot.startsAt,
        durationMinutes: slot.durationMinutes,
        dog: {
          name: dog.name,
          breed: dog.breed,
          ageLabel: dog.ageLabel,
          size: dog.size,
          energy: dog.energy,
          bio: dog.bio,
          traits: (dog.traits ?? []).map((trait) => trait.label),
          photo: {
            url: dog.photo.url,
            alt: dog.photo.alt,
            width: dog.photo.width,
            height: dog.photo.height,
          },
        },
        shelter: {
          name: shelter.name,
          neighborhood: shelter.neighborhood,
          address: shelter.address,
        },
      },
    ]
  })
}

export default async function HomePage() {
  const walks = await getAvailableWalks()
  const featured = walks[0]

  return (
    <main id="top" className="overflow-hidden bg-[#fffdfa] text-[#183e2b]">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <a
            href="#top"
            className="flex items-center gap-2.5 font-serif text-xl font-bold tracking-[-.03em] text-white"
          >
            <span className="text-[#f2a33b]">
              <PawMark />
            </span>
            The Good Walk
          </a>
          <nav
            className="hidden items-center gap-8 text-sm font-semibold text-white/80 sm:flex"
            aria-label="Main navigation"
          >
            <a href="#walks" className="transition hover:text-white">
              Find a walk
            </a>
            <a href="#how" className="transition hover:text-white">
              How it works
            </a>
            <a href="#impact" className="transition hover:text-white">
              Why walk
            </a>
          </nav>
          <a
            href="#walks"
            className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-bold text-white backdrop-blur transition hover:bg-white hover:text-[#173f2b] sm:px-5 sm:py-2.5 sm:text-sm"
          >
            Browse walks
          </a>
        </div>
      </header>

      <section className="relative min-h-[760px] bg-[#153c29] pt-32 sm:min-h-[820px]">
        <div className="hero-orb absolute -right-36 -top-28 h-[640px] w-[640px] rounded-full bg-[#2d6446]" />
        <div className="absolute -left-24 bottom-[-12rem] h-96 w-96 rounded-full border-[70px] border-[#24563b]/40" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:gap-8 lg:pb-28">
          <div className="relative z-10 pt-8 text-white lg:pt-16">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[.18em] text-[#ffc66d] backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-[#f2a33b]" />
              A little time. A lot of tail wags.
            </p>
            <h1 className="mt-7 max-w-3xl font-serif text-[3.6rem] leading-[.96] tracking-[-.045em] sm:text-7xl lg:text-[5.25rem]">
              Take a shelter dog <span className="text-[#ffc66d] italic">for a walk.</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-[#d0ded4] sm:text-lg sm:leading-8">
              Book a relaxed, feel-good walk with a dog who could use a friend. No long-term
              commitment. Just fresh air, company, and one very happy pup.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <a
                href="#walks"
                className="inline-flex items-center gap-2 rounded-full bg-[#db5d3f] px-6 py-3.5 text-sm font-bold text-white shadow-[0_12px_30px_rgba(219,93,63,.24)] transition hover:-translate-y-0.5 hover:bg-[#ea6a49]"
              >
                Find your walking buddy <ArrowIcon />
              </a>
              <span className="text-xs font-medium text-white/60">
                Free · Usually 45 minutes · Local shelters
              </span>
            </div>
            <div className="mt-12 flex flex-wrap gap-x-8 gap-y-4 border-t border-white/12 pt-7">
              {['No experience needed', 'Shelter provides supplies', 'Instant request'].map(
                (item) => (
                  <span
                    key={item}
                    className="flex items-center gap-2 text-xs font-semibold text-[#c7d7cc]"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#f2a33b]/15 text-[10px] text-[#ffc66d]">
                      ✓
                    </span>
                    {item}
                  </span>
                ),
              )}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[560px] lg:translate-x-8 lg:pt-16">
            <div className="absolute -right-3 -top-4 z-10 rotate-6 rounded-2xl bg-[#f2a33b] px-4 py-3 text-[#173f2b] shadow-xl">
              <p className="font-serif text-2xl font-bold">{walks.length || 'New'}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider">
                {walks.length === 1 ? 'walk open' : 'walks open'}
              </p>
            </div>
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2.5rem_2.5rem_9rem_2.5rem] border border-white/10 bg-[#24553b] shadow-[0_40px_100px_rgba(4,24,13,.42)]">
              {featured?.dog.photo.url ? (
                <Image
                  src={featured.dog.photo.url}
                  alt={featured.dog.photo.alt}
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 1024px) 90vw, 45vw"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-[#ffc66d]">
                  <PawMark />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0b2417]/90 via-[#0b2417]/35 to-transparent px-7 pb-8 pt-24 text-white">
                <p className="text-xs font-bold uppercase tracking-[.16em] text-[#ffc66d]">
                  Today’s good deed
                </p>
                <p className="mt-2 font-serif text-3xl">
                  {featured
                    ? `Give ${featured.dog.name} the best part of their day.`
                    : 'New walking buddies are arriving soon.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="relative border-b border-[#e5ebe5] bg-[#f4f7f1]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:grid-cols-3 sm:px-8 lg:py-16">
          {[
            ['01', 'Choose a dog', 'Browse personalities, energy levels, and open times.'],
            ['02', 'Book your time', 'Share a few details so the shelter can get ready.'],
            ['03', 'Meet & wander', 'They provide the lead and route. You bring the company.'],
          ].map(([number, title, copy]) => (
            <div key={number} className="flex gap-4">
              <span className="font-serif text-3xl italic text-[#db5d3f]">{number}</span>
              <div>
                <h2 className="font-serif text-xl text-[#173f2b]">{title}</h2>
                <p className="mt-1.5 text-sm leading-6 text-[#6b7b70]">{copy}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <BookingExperience walks={walks} />

      <section id="impact" className="bg-[#173f2b] text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[.9fr_1.1fr] lg:py-24">
          <div>
            <p className="eyebrow !text-[#ffc66d]">Small walk, real impact</p>
            <h2 className="mt-3 max-w-xl font-serif text-4xl leading-tight sm:text-5xl">
              You’re not just stretching their legs.
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {[
              ['Calmer', 'Movement helps reduce kennel stress.'],
              ['Seen', 'Outings help dogs show their true personality.'],
              ['Ready', 'Real-world practice builds adoption confidence.'],
            ].map(([title, copy]) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-white/[.06] p-5">
                <h3 className="font-serif text-2xl text-[#ffc66d]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#c6d5ca]">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-[#102b1d] text-[#b9c9be]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-2 font-serif text-base font-bold text-white">
            <span className="text-[#f2a33b]">
              <PawMark />
            </span>
            The Good Walk
          </div>
          <p>Helping local shelter dogs get more fresh air, one walk at a time.</p>
          <a href="/dashboard" className="font-bold text-white/60 transition hover:text-white">
            Shelter login
          </a>
        </div>
      </footer>
    </main>
  )
}
