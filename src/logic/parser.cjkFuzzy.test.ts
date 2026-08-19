import { describe, expect, it } from 'vitest'
import chineseChart from './__fixtures__/charted.zh.txt?raw'
import twChart from './__fixtures__/charted.tw.txt?raw'
import { parseChartText } from './parser'

// CJK fuzzy fallback (regression for the reported issue: a player's CN-client
// Operative's-Strongbox chart imported with EMPTY modIds because its wording
// was not a verbatim alias, so Speedrun Strongboxes could not see it).
// English lines get Levenshtein tolerance via sigWords/fuzzyHas; Chinese/TW
// previously had NO fallback - anything short of a verbatim alias stayed
// unparsed. These cases must resolve to their canonical mod id.

function modIdOf(text: string, template: string, needle: string): string[] {
  const result = parseChartText(template.replace(needle, text))
  expect(result.rejected).toEqual([])
  expect(result.charts).toHaveLength(1)
  return result.charts[0].modIds
}

describe('CJK fuzzy implicit matching', () => {
  const CN_IMPLICIT = '相邻区域包含 8(8-10) 个额外的章鱼群'
  const TW_IMPLICIT = '增加 30% 相鄰區域找到的魔法怪物數量'

  it('resolves CN strongbox wordings with an inline roll (2(2-3))', () => {
    expect(modIdOf('相邻区域包含 2(2-3) 个额外侦探的保险箱', chineseChart, CN_IMPLICIT)).toEqual([
      'adj-opbox-1',
    ])
    expect(modIdOf('相邻区域包含 3(2-3) 个额外侦探的保险箱', chineseChart, CN_IMPLICIT)).toEqual([
      'adj-opbox-2',
    ])
  })

  it('tolerates a missing particle (的) and an 一个 form', () => {
    expect(modIdOf('相邻区域包含 2 个额外侦探保险箱', chineseChart, CN_IMPLICIT)).toEqual([
      'adj-opbox-1',
    ])
    expect(modIdOf('相邻区域包含一个额外侦探的保险箱', chineseChart, CN_IMPLICIT)).toEqual([
      'adj-opbox-1',
    ])
  })

  it('tolerates reordered words', () => {
    expect(modIdOf('相邻区域额外包含 2 个侦探的保险箱', chineseChart, CN_IMPLICIT)).toEqual([
      'adj-opbox-1',
    ])
  })

  it('keeps typed strongboxes ahead of the generic strongbox family', () => {
    // the generic "+N 保险箱" alias is a character-substring of the typed one;
    // the typed match must win on bigram overlap, then length/tier
    expect(modIdOf('相邻区域包含 2(2-3) 个额外侦探的保险箱', chineseChart, CN_IMPLICIT)).toEqual([
      'adj-opbox-1',
    ])
    expect(modIdOf('相邻区域包含 5 个保险箱', chineseChart, CN_IMPLICIT)).toEqual(['adj-box-3'])
  })

  it('resolves Diviner / Message / Starfish / lantern near-misses', () => {
    expect(modIdOf('相邻区域包含 2 个额外神圣秘宝', chineseChart, CN_IMPLICIT)).toEqual([
      'adj-divbox-1',
    ])
    expect(modIdOf('相邻区域包含 1 个额外瓶中信', chineseChart, CN_IMPLICIT)).toEqual(['adj-msg-1'])
    expect(modIdOf('相邻区域包含 6(6-7) 个额外巨型海星', chineseChart, CN_IMPLICIT)).toEqual([
      'adj-star-2',
    ])
    expect(modIdOf('相邻区域包含 4 个黄金灯笼', chineseChart, CN_IMPLICIT)).toEqual(['adj-lantern'])
  })

  it('resolves voyage-scope near-misses', () => {
    expect(modIdOf('所有航行区域中的怪物无法掉落装备药剂或酊剂', chineseChart, CN_IMPLICIT)).toEqual([
      'voy-noequip',
    ])
  })

  it('resolves TW near-misses against the TW corpus', () => {
    expect(modIdOf('相鄰區域內含有額外 2 個特工保險箱', twChart, TW_IMPLICIT)).toEqual([
      'adj-opbox-1',
    ])
  })

  it('leaves unrelated lines unparsed instead of guessing', () => {
    expect(modIdOf('相邻区域包含 99 个未知的奇怪东西', chineseChart, CN_IMPLICIT)).toEqual([])
  })
})