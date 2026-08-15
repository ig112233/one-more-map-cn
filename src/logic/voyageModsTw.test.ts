import { describe, expect, it } from 'vitest'
import { voyageModById } from '../data/mods'
import voyageModsTw from './__fixtures__/voyage-mods.tw.tsv?raw'

interface TwModRow {
  modId: string
  scope: string
  appEnglish: string
  poedbTraditional: string
  level: string
  preSuf: string
  notes: string
}

const rows: TwModRow[] = voyageModsTw
  .split(/\r?\n/)
  .filter((line) => line && !line.startsWith('#'))
  .map((line) => {
    const [modId, scope, appEnglish, poedbTraditional, level, preSuf, notes] =
      line.split('\t')
    if (modId === 'modId') return null // column header
    if (!modId || !scope || !poedbTraditional) {
      throw new Error(`Malformed voyage-mods.tw.tsv row: ${line}`)
    }
    return { modId, scope, appEnglish, poedbTraditional, level, preSuf, notes }
  })
  .filter((row): row is TwModRow => row !== null)

describe('voyage-mods.tw.tsv corpus', () => {
  it('contains all 62 poedb.tw adjacent/global deep-water chart mods', () => {
    expect(rows).toHaveLength(62)
  })

  it('has exactly the poedb.tw adjacent/global breakdown', () => {
    const byScope = new Map<string, number>()
    for (const row of rows) byScope.set(row.scope, (byScope.get(row.scope) ?? 0) + 1)
    expect(Object.fromEntries(byScope)).toEqual({ adjacent: 43, global: 19 })
  })

  it('maps every row to a real voyage mod id', () => {
    const unnamed: string[] = []
    for (const row of rows) {
      if (!voyageModById.has(row.modId)) unnamed.push(row.modId)
    }
    expect(unnamed).toEqual([])
  })

  it('keeps app scope assignments consistent with the mod defs', () => {
    for (const row of rows) {
      const mod = voyageModById.get(row.modId)
      expect(mod?.scope, row.modId).toBe(row.scope)
    }
  })

  it('registers every poedb.tw sentence as a matching alias on its mod id', () => {
    const missing: string[] = []
    for (const row of rows) {
      const mod = voyageModById.get(row.modId)
      if (!mod?.aliases?.includes(row.poedbTraditional)) {
        missing.push(`${row.modId}: ${row.poedbTraditional}`)
      }
    }
    expect(missing).toEqual([])
  })
})
