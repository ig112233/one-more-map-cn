import { describe, expect, it } from 'vitest'
import { CHART_AREAS } from '../data/chartAreas'
import type { ChartData } from '../types'
import { isChartClipboardText, parseChartText } from './parser'
import twChart from './__fixtures__/charted.tw.txt?raw'

// charted.tw.txt is a SYNTHETIC TW-client chart copy: the verified CN-client
// fixture translated to the TW client's terms (物品類別 / 區域等級 / 海圖形狀 /
// { 基底屬性 } / 亡者硫酸), with the implicit in the poedb.tw sentence
// template (相鄰區域內含有額外 X(X-Y) 群章魚). No real TW-client Ctrl+C copy
// has been verified yet (2026-08); treat these expectations as candidates
// until a real copy confirms the sentence templates and roll format.

function parseOnlyChart(text: string): ChartData {
  const result = parseChartText(text)
  expect(result.rejected).toEqual([])
  expect(result.charts).toHaveLength(1)
  return result.charts[0]
}

describe('Traditional-Chinese client support', () => {
  it('detects TW-client clipboard text as Chart items', () => {
    expect(isChartClipboardText(twChart)).toBe(true)
    expect(isChartClipboardText(twChart.replace('物品類別', '物品種類'))).toBe(true)
    expect(isChartClipboardText('物品類別: 環甲')).toBe(false)
  })

  it('parses a TW chart into canonical ids and shape names', () => {
    const chart = parseOnlyChart(twChart)

    expect(chart).toMatchObject({
      name: '鹹水 短途 珊瑚暗礁海圖',
      level: 82,
      areaType: 'seafloor-ridges',
      shape: 'Corner',
      edges: [true, true, false, false],
      implicitText: '相鄰區域內含有額外 8(8-10) 群章魚',
      modIds: ['adj-octo-1'],
      rewards: [
        { stat: 'quantity', percent: 40 },
        { stat: 'rarity', percent: 60 },
        { stat: 'sulphur', percent: 30 },
        { stat: 'packsize', percent: 16 },
      ],
    })
  })

  it('matches an inline roll of the range and the poedb-style bare range', () => {
    // In-game inline roll 9(8-10) must resolve to the same octopus tier ...
    const inline = parseOnlyChart(
      twChart.replace('相鄰區域內含有額外 8(8-10) 群章魚', '相鄰區域內含有額外 9(8-10) 群章魚'),
    )
    expect(inline.modIds).toEqual(['adj-octo-1'])

    // ... and so must poedb's bare (8—10) rendering.
    const poedb = parseOnlyChart(
      twChart.replace('相鄰區域內含有額外 8(8-10) 群章魚', '相鄰區域內含有額外(8—10)群章魚'),
    )
    expect(poedb.modIds).toEqual(['adj-octo-1'])
  })

  it('resolves the Deep-Water rare-count implicit from its poedb.tw wording', () => {
    const t30 = parseOnlyChart(
      twChart.replace('相鄰區域內含有額外 8(8-10) 群章魚', '增加 30% 相鄰區域找到的稀有怪物數量'),
    )
    const t60 = parseOnlyChart(
      twChart.replace('相鄰區域內含有額外 8(8-10) 群章魚', '增加 60% 相鄰區域找到的稀有怪物數量'),
    )

    expect(t30.modIds).toEqual(['adj-rare-1'])
    expect(t60.modIds).toEqual(['adj-rare-2'])
  })

  it('keeps explicit downside lines in rawText but drops structural lines', () => {
    const chart = parseOnlyChart(twChart)

    expect(chart.rawText).toContain('怪物造成的 20(15-20)% 額外物理傷害視為火焰傷害')
    expect(chart.rawText).toContain('怪物擊中時有機率偷取暴擊、狂怒和耐力球')
    // Reward rider is structural and must not be duplicated into rawText.
    expect(chart.rawText).not.toContain('此區域中找到的')
    // { 前綴屬性 … } markers and the full-width parenthetical tooltips.
    expect(chart.rawText).not.toContain('前綴屬性')
    expect(chart.rawText).not.toContain('被致盲')
  })

  it('maps the Traditional-Chinese destination names where they differ', () => {
    // 遠洋深淵 is the traditional form of 远洋深渊 (Pelagic Abyss); the CN
    // entry would not match, so the traditional field must carry it.
    const chart = parseOnlyChart(twChart.replace('海底山脊', '遠洋深淵'))

    expect(chart.areaType).toBe('pelagic-abyss')
  })

  const shapeCases = [
    ['End', '末端', [true, false, false, false]],
    ['Corner', '角落', [true, true, false, false]],
    ['Straight', '直線', [true, false, true, false]],
    ['Junction', '節點', [true, true, true, false]],
    ['Crossing', '交叉', [true, true, true, true]],
  ]

  it.each(shapeCases)(
    'maps the Traditional-Chinese %s shape to the canonical edges',
    (canonical, twShape, edges) => {
      const chart = parseOnlyChart(
        twChart.replace('海圖形狀：角落', `海圖形狀：${twShape}`),
      )

      expect(chart).toMatchObject({ shape: canonical, edges })
    },
  )

  it('keeps a chart with an unknown future destination without guessing', () => {
    const chart = parseOnlyChart(
      twChart.replace('海底山脊', '尚未登記的目的地'),
    )

    expect(chart.areaType).toBeUndefined()
    expect(chart.rawText).not.toContain('尚未登記的目的地')
  })

  it('rejects an uncharted TW chart with a reason', () => {
    const uncharted = twChart.replace(
      '相鄰區域內含有額外 8(8-10) 群章魚',
      '航程詞綴將於完成測繪後揭露',
    )

    const result = parseChartText(uncharted)

    expect(result.charts).toEqual([])
    expect(result.rejected[0]?.reason).toContain('not charted')
  })

  it('mixes TW charts into a multi-client clipboard batch', () => {
    const mixed = `${twChart.trim()}\n${twChart.trim()}`

    const result = parseChartText(mixed)

    expect(result.rejected).toEqual([])
    expect(result.charts).toHaveLength(2)
  })

  it('keeps the complete verified destination table with unique TW names', () => {
    expect(CHART_AREAS).toHaveLength(15)
    const traditional = CHART_AREAS.map(({ traditional }) => traditional)
    expect(traditional.every(Boolean)).toBe(true)
    expect(new Set(traditional).size).toBe(15)
  })
})
