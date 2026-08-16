import { describe, expect, it } from 'vitest'
import type { ChartData } from '../types'
import englishChartText from './__fixtures__/charted.en.txt?raw'
import koreanChartText from './__fixtures__/charted.ko.txt?raw'
import chineseChartText from './__fixtures__/charted.zh.txt?raw'
import twChartText from './__fixtures__/charted.tw.txt?raw'
import { parseChartText } from './parser'
import { buildChartSearch, buildSingleChartSearch } from './regex'

function parseOne(text: string): ChartData {
  const result = parseChartText(text)
  expect(result.rejected).toEqual([])
  expect(result.charts).toHaveLength(1)
  return result.charts[0]
}

describe('buildSingleChartSearch', () => {
  it('uses the verified Korean Area Level term for a Korean-client chart', () => {
    const search = buildSingleChartSearch(parseOne(koreanChartText))

    expect(search).toBe(
      '해병 고역 산호 암초 해도 인접 지역 내 몬스터가 떨어뜨리는 장비의 40%가 골드로 전환 지역 레벨 81',
    )
    expect(search).toContain('지역 레벨 81')
    expect(search).not.toContain('Level 81')
  })

  it('keeps the existing English Level term for an English-client chart', () => {
    const search = buildSingleChartSearch(parseOne(englishChartText))

    expect(search).toBe(
      "Armoured Coral Reef Chart of Ice 20% increased Dead Man's Sulphur found in this Area Level 63",
    )
    expect(search).toContain('Level 63')
    expect(search).not.toContain('지역 레벨')
  })

  it('detects Korean from an unknown verbatim implicit', () => {
    const chart: ChartData = {
      uid: 'unknown-korean-implicit',
      name: 'Manual Chart',
      level: 81,
      edges: [true, true, true, false],
      modIds: [],
      implicitText: '아직 등록되지 않은 한국어 항해 속성',
    }

    expect(buildSingleChartSearch(chart)).toContain('지역 레벨 81')
  })

  it('defaults Hangul-free manual and demo charts to English', () => {
    const chart: ChartData = {
      uid: 'manual-demo',
      name: 'Demo Chart',
      level: 83,
      edges: [true, false, false, false],
      modIds: ['voy-sulph-2'],
    }

    const search = buildSingleChartSearch(chart)
    expect(search).toBe(
      "Demo Chart 20% increased Dead Man's Sulphur found in this Area Level 83",
    )
    expect(search).toContain('Level 83')
    expect(search).not.toContain('지역 레벨')
  })

  it('uses the CN Area Level term for a Chinese-client chart', () => {
    const search = buildSingleChartSearch(parseOne(chineseChartText))

    expect(search).toContain('区域等级 82')
    expect(search).not.toContain('Level 82')
    expect(search).not.toContain('지역 레벨')
  })

  it('uses the TW Area Level term for a Traditional-Chinese-client chart', () => {
    // The TW client is a MIXED script (物品種類: 海图); without the recorded
    // clientLang the old character heuristic would pick the simplified 区域等级
    // and the paste would never match 區域等級: 83 in the TW client.
    const search = buildSingleChartSearch(parseOne(twChartText))

    expect(search).toContain('區域等級 83')
    expect(search).toContain('增加 30% 相鄰區域找到的魔法怪物數量')
    expect(search).not.toContain('区域等级')
    expect(search).not.toContain('Level 83')
  })

  it('detects Traditional Chinese from legacy TW verbatim text without a recorded language', () => {
    const chart: ChartData = {
      uid: 'legacy-tw',
      name: '海員郊遊 珊瑚礁海圖',
      level: 83,
      edges: [true, true, true, true],
      modIds: [],
      implicitText: '相鄰區域內含有額外 2 個特工的保險箱',
    }

    expect(buildSingleChartSearch(chart)).toContain('區域等級 83')
  })

  it('keeps the CN Area Level term for legacy simplified text without a recorded language', () => {
    const chart: ChartData = {
      uid: 'legacy-cn',
      name: '咸水 短途 珊瑚暗礁海图',
      level: 82,
      edges: [true, true, false, false],
      modIds: [],
      implicitText: '相邻区域包含 8(8-10) 个额外的章鱼群',
    }

    expect(buildSingleChartSearch(chart)).toContain('区域等级 82')
    expect(buildSingleChartSearch(chart)).not.toContain('區域等級')
  })

  it('detects Chinese from an unknown verbatim implicit', () => {
    const chart: ChartData = {
      uid: 'unknown-cn-implicit',
      name: 'Manual Chart',
      level: 81,
      edges: [true, true, true, false],
      modIds: [],
      implicitText: '尚未登记的中文航行属性',
    }

    expect(buildSingleChartSearch(chart)).toContain('区域等级 81')
  })
})

describe('buildChartSearch', () => {
  it('keeps English fragments within word boundaries', () => {
    const search = buildChartSearch(
      ['Armoured Coral Reef Chart of Ice'],
      ['Sandy Coral Chart', 'Coral Reef Chart of Fire'],
    )

    expect(search.split('|').every((frag) => !frag.includes(' '))).toBe(true)
    expect(search).toBeTruthy()
  })

  it('folds whitespace out of CN chart names so fragments stay unspaced', () => {
    const search = buildChartSearch(
      ['海兵苦役 珊瑚暗礁海图'],
      ['海底林地', '远洋深渊', '深渊平原'],
    )

    // Shortest unique 3-char fragment of the space-folded name.
    expect(search).toBe('海兵苦')
    expect(search).not.toMatch(/\s/)
  })
})
