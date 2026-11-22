import { describe, expect, it } from 'vitest'
import { removeRepeatedIndexes } from '@/lib/database'

const run = (statements: string[]) => {
  const copy = [...statements]
  removeRepeatedIndexes(copy)
  return copy
}

describe('removeRepeatedIndexes', () => {
  it('removes a repeated CREATE INDEX', () => {
    expect(
      run([
        'CREATE TABLE `__new_media` (`id` integer)',
        'CREATE INDEX `media_updated_at_idx` ON `media` (`updated_at`);',
        'CREATE INDEX `media_updated_at_idx` ON `media` (`updated_at`);',
      ]),
    ).toEqual([
      'CREATE TABLE `__new_media` (`id` integer)',
      'CREATE INDEX `media_updated_at_idx` ON `media` (`updated_at`);',
    ])
  })

  it('compares statements without surrounding whitespace or keyword case', () => {
    expect(
      run([
        '  CREATE INDEX `i` ON `t` (`a`);',
        'CREATE INDEX `i` ON `t` (`a`);\n',
        'create index x',
      ]),
    ).toEqual(['  CREATE INDEX `i` ON `t` (`a`);', 'create index x'])
  })

  it('keeps a repeat that follows a DROP', () => {
    const statements = [
      'CREATE INDEX `i` ON `t` (`a`);',
      'DROP TABLE `t`;',
      'CREATE INDEX `i` ON `t` (`a`);',
    ]
    expect(run(statements)).toEqual(statements)
  })

  it('handles CREATE UNIQUE INDEX', () => {
    expect(
      run([
        'CREATE UNIQUE INDEX `admins_email_idx` ON `admins` (`email`);',
        'CREATE UNIQUE INDEX `admins_email_idx` ON `admins` (`email`);',
      ]),
    ).toEqual(['CREATE UNIQUE INDEX `admins_email_idx` ON `admins` (`email`);'])
  })

  it('keeps every other statement, in order, even when repeated', () => {
    const statements = [
      'PRAGMA foreign_keys=OFF;',
      'INSERT INTO `__new_media` SELECT * FROM `media`;',
      'ALTER TABLE `__new_media` RENAME TO `media`;',
      'PRAGMA foreign_keys=OFF;',
    ]
    expect(run(statements)).toEqual(statements)
  })

  it('changes the array in place', () => {
    const statements = ['CREATE INDEX `i` ON `t` (`a`);', 'CREATE INDEX `i` ON `t` (`a`);', 'END']
    const result = removeRepeatedIndexes(statements)
    expect(result).toBeUndefined()
    expect(statements).toEqual(['CREATE INDEX `i` ON `t` (`a`);', 'END'])
  })
})
