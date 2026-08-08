import { describe, expect, it } from 'vitest'
import { voyageModById } from '../data/mods'
import voyageModsZh from './__fixtures__/voyage-mods.zh.tsv?raw'

interface ZhModRow {
  modId: string
  scope: string
  appEnglish: string
  poedbChinese: string
  level: string
  preSuf: string
  notes: string
}

const rows: ZhModRow[] = voyageModsZh
  .split(/\r?\n/)
  .filter((line) => line && !line.startsWith('#'))
  .map((line) => {
    const [modId, scope, appEnglish, poedbChinese, level, preSuf, notes] = line.split('\t')
    if (modId === 'modId') return null // column header
    if (!modId || !scope || !poedbChinese) {
      throw new Error(`Malformed voyage-mods.zh.tsv row: ${line}`)
    }
    return { modId, scope, appEnglish, poedbChinese, level, preSuf, notes }
  })
  .filter((row): row is ZhModRow => row !== null)

describe('voyage-mods.zh.tsv corpus', () => {
  it('contains all 144 poedb.cn deep-water chart mods', () => {
    expect(rows).toHaveLength(144)
  })

  it('has exactly the poedb.cn self/adjacent/global breakdown', () => {
    const byScope = new Map<string, number>()
    for (const row of rows) byScope.set(row.scope, (byScope.get(row.scope) ?? 0) + 1)
    expect(Object.fromEntries(byScope)).toEqual({
      self: 81,
      adjacent: 43,
      global: 19,
      'uncharted-implicit': 1,
    })
  })

  it('maps every adjacent and global row to a real voyage mod id', () => {
    const unnamed: string[] = []
    for (const row of rows) {
      if (row.scope !== 'adjacent' && row.scope !== 'global') continue
      if (!voyageModById.has(row.modId)) unnamed.push(row.modId)
    }
    expect(unnamed).toEqual([])
  })

  it('keeps app scope assignments consistent with the mod defs', () => {
    for (const row of rows) {
      if (row.scope !== 'adjacent' && row.scope !== 'global') continue
      const mod = voyageModById.get(row.modId)
      expect(mod?.scope, row.modId).toBe(row.scope)
    }
  })
})
