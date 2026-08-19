import { describe, expect, it } from 'vitest'
import { voyageModById } from '../data/mods'
import chineseChart from './__fixtures__/charted.zh.txt?raw'
import { parseChartText } from './parser'
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

// === CN-import alias coverage =============================================
// Regression for the reported issue: charts pasted from the CN client with the
// strategy-critical strongbox wordings (侦探的保险箱 / 神圣的秘宝 / 瓶中信 /
// 保险箱) imported with EMPTY modIds, so Speedrun Strongboxes and the other
// strategies could not see their centre pieces. Every poedb.cn datamined
// adjacent/global sentence must resolve to its mod id when it appears as a
// chart's revealed implicit line.

describe('poedb.cn datamined implicit wording resolves on import', () => {
  it('parses every adjacent and global row from a CN chart body', () => {
    const failures: string[] = []
    for (const row of rows) {
      if (row.scope !== 'adjacent' && row.scope !== 'global') continue
      const chartText = chineseChart.replace(
        '相邻区域包含 8(8-10) 个额外的章鱼群',
        row.poedbChinese,
      )
      const result = parseChartText(chartText)
      if (result.rejected.length) {
        failures.push(`${row.modId}: rejected (${result.rejected[0]?.reason})`)
        continue
      }
      const modIds = result.charts[0]?.modIds ?? []
      if (!modIds.includes(row.modId)) {
        failures.push(`${row.modId}: got ${JSON.stringify(modIds)}`)
      }
    }
    expect(failures).toEqual([])
  })

  it('resolves the strategy-critical strongbox wordings from the user report', () => {
    const cases = [
      // Speedrun centre pieces: Operative's (侦探 = CN client for 特工),
      // Diviner's (神圣的秘宝), Messages in a Bottle.
      ['相邻区域包含 2 个额外侦探的保险箱', 'adj-opbox-1'],
      ['相邻区域包含 3 个额外侦探的保险箱', 'adj-opbox-2'],
      ['相邻区域包含 2 个额外神圣的秘宝', 'adj-divbox-1'],
      ['相邻区域包含 3 个额外神圣的秘宝', 'adj-divbox-2'],
      ['相邻区域包含 1 个额外瓶中信', 'adj-msg-1'],
      ['相邻区域包含一个额外瓶中信', 'adj-msg-1'], // client 一个 form
      ['相邻区域包含 2 个额外瓶中信', 'adj-msg-2'],
      // Generic strongboxes (Divine-border feeders), the 一个 client form.
      ['相邻区域包含 1 个额外保险箱', 'adj-box-1'],
      ['相邻区域包含一个额外保险箱', 'adj-box-1'],
      ['相邻区域包含 (2-4) 个额外保险箱', 'adj-box-2'],
      ['相邻区域包含 5 个额外保险箱', 'adj-box-3'],
      // Meatfish / Ethereal keeper pieces.
      ['相邻区域包含 (4-5) 个额外巨型海星', 'adj-star-1'],
      ['相邻区域包含 (6-7) 个额外巨型海星', 'adj-star-2'],
      ['相邻区域包含 4 个额外黄金灯笼', 'adj-lantern'],
      ['相邻区域的稀有怪物将带有众神词缀', 'adj-pantheon'],
      ['所有航行区域的稀有怪物有 100% 的几率被附身', 'voy-possess'],
      ['所有航行区域中的怪物无法掉落装备、药剂或酊剂', 'voy-noequip'],
      ['所有航行区域的稀有怪物死亡时有 50% 的几率分裂', 'voy-fracture'],
      ['所有航行区域的怪物至少为魔法', 'voy-minmagic'],
    ] as const

    for (const [implicitLine, expectedId] of cases) {
      const chartText = chineseChart.replace(
        '相邻区域包含 8(8-10) 个额外的章鱼群',
        implicitLine,
      )
      const result = parseChartText(chartText)
      expect(result.rejected, implicitLine).toEqual([])
      expect(result.charts[0]?.modIds, implicitLine).toEqual([expectedId])
    }
  })
})
