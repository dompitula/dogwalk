/** Shared suggestions; custom values remain supported for existing dog records. */
export const KENNEL_OPTIONS = ['A', 'B', 'C'].flatMap((block) =>
  Array.from({ length: 20 }, (_, index) => block + '-' + String(index + 1).padStart(2, '0')),
)
export const AGE_OPTIONS = ['Puppy', 'Young', 'Adult', 'Senior', 'Unknown']
export const TEMPERAMENT_OPTIONS = [
  'Friendly & social',
  'Calm & gentle',
  'Playful',
  'Shy at first',
  'High energy',
  'Independent',
  'Sensitive to noise',
  'Reactive to other dogs',
  'Needs an experienced handler',
  'Not assessed yet',
]
export const SPECIAL_CARE_OPTIONS = [
  'Limited mobility',
  'Short walks only',
  'Vision impairment',
  'Hearing impairment',
  'Medication schedule',
  'Dietary restrictions',
  'Recovering from treatment',
  'Other care needs',
]
