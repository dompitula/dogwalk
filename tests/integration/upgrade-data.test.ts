import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { dropRetiredTables } from '@/lib/upgrade-data'

// The one-off database update that removes the old media folders and tags tables. Uses
// node:sqlite directly, on a database laid out like one from before the update.

afterEach(() => {
  vi.restoreAllMocks()
})

function oldDatabase() {
  mkdirSync('.tmp-tests', { recursive: true })
  const name = `${randomUUID()}.db`
  const db = new DatabaseSync(path.join('.tmp-tests', name))
  db.exec(`
    CREATE TABLE folders (id INTEGER PRIMARY KEY, name TEXT);
    CREATE TABLE tags (id INTEGER PRIMARY KEY, name TEXT);
    -- The two collections reference each other, which is why Payload's own update stops.
    CREATE TABLE folders_rels (id INTEGER PRIMARY KEY, parent_id INTEGER REFERENCES folders(id), tags_id INTEGER REFERENCES tags(id));
    CREATE TABLE tags_rels (id INTEGER PRIMARY KEY, parent_id INTEGER REFERENCES tags(id), folders_id INTEGER REFERENCES folders(id));
    CREATE TABLE media (id INTEGER PRIMARY KEY, alt TEXT, folder_id INTEGER REFERENCES folders(id));
    CREATE TABLE media_rels (id INTEGER PRIMARY KEY, parent_id INTEGER REFERENCES media(id), tags_id INTEGER REFERENCES tags(id), dogs_id INTEGER);

    INSERT INTO folders VALUES (1, 'Dogs'), (2, 'Archive'), (3, 'Spare');
    INSERT INTO tags VALUES (1, 'Cute');
    INSERT INTO folders_rels VALUES (1, 1, 1);
    INSERT INTO tags_rels VALUES (1, 1, 2);
    INSERT INTO media VALUES (1, 'Milo', 1), (2, 'Luna', NULL);
    INSERT INTO media_rels VALUES (1, 1, 1, NULL), (2, 2, NULL, 7);
  `)
  db.close()
  return { url: `file:./.tmp-tests/${name}`, file: path.join('.tmp-tests', name) }
}

function read(file: string) {
  const db = new DatabaseSync(file)
  try {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all()
      .map((row) => row.name)
    return {
      tables,
      media: db.prepare('SELECT id, alt, folder_id FROM media ORDER BY id').all(),
      mediaRels: db.prepare('SELECT id, tags_id, dogs_id FROM media_rels ORDER BY id').all(),
    }
  } finally {
    db.close()
  }
}

describe('dropRetiredTables', () => {
  it('drops the tables, clears what pointed at them and keeps the photos', () => {
    const { url, file } = oldDatabase()
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    const warn = vi.spyOn(console, 'warn')

    dropRetiredTables(url)

    expect(warn).not.toHaveBeenCalled()
    expect(info).toHaveBeenCalledWith(
      'Database: removed the media folders and tags, which the app no longer uses ' +
        '(with 3 folders and 1 tag; 2 folder or tag assignments removed, photos kept).',
    )
    const after = read(file)
    expect(after.tables).toEqual(['media', 'media_rels'])
    expect(after.media).toEqual([
      { id: 1, alt: 'Milo', folder_id: null },
      { id: 2, alt: 'Luna', folder_id: null },
    ])
    // The tag link is deleted; the photo's other link is kept.
    expect(after.mediaRels).toEqual([{ id: 2, tags_id: null, dogs_id: 7 }])
  })

  it('does nothing the second time', () => {
    const { url, file } = oldDatabase()
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    dropRetiredTables(url)
    const once = read(file)
    info.mockClear()

    dropRetiredTables(url)

    expect(info).not.toHaveBeenCalled()
    expect(read(file)).toEqual(once)
  })

  it('does nothing for a database that does not exist yet', () => {
    const info = vi.spyOn(console, 'info')
    dropRetiredTables(`file:./.tmp-tests/${randomUUID()}.db`)
    expect(info).not.toHaveBeenCalled()
  })
})
