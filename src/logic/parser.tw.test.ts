import { describe, expect, it } from 'vitest'
import { CHART_AREAS } from '../data/chartAreas'
import type { ChartData } from '../types'
import { isChartClipboardText, parseChartText } from './parser'
import twChart from './__fixtures__/charted.tw.txt?raw'

// charted.tw.txt is a VERBATIM TW-client Ctrl+C copy (2026-08, provided by a
// TW player): 近海 跋涉 / 珊瑚暗礁海图, 海底山脊, 終點 (End) shape, and the
// 增加 30% 相鄰區域找到的魔法怪物數量 magic-monsters implicit. Note the TW
// client renders a MIXED script (物品種類 traditional but 海图 simplified;
// prefix/suffix mod lines mix 傷害 with 野蛮人/伤害), the header is 物品數量 /
// 亡者硫酸, the implicit marker is { 固定詞綴 }, and reward riders are
// front-loaded (增加 45% 此區域中找到的亡者硫酸).

function parseOnlyChart(text: string): ChartData {
  const result = parseChartText(text)
  expect(result.rejected).toEqual([])
  expect(result.charts).toHaveLength(1)
  return result.charts[0]
}

describe('Traditional-Chinese client support', () => {
  it('detects TW-client clipboard text as Chart items', () => {
    expect(isChartClipboardText(twChart)).toBe(true)
    expect(isChartClipboardText(twChart.replace('物品種類', '物品類別'))).toBe(true)
    expect(isChartClipboardText('物品類別: 環甲')).toBe(false)
  })

  it('parses a real TW-client chart into canonical ids and shape names', () => {
    const chart = parseOnlyChart(twChart)

    expect(chart).toMatchObject({
      name: '近海 跋涉 珊瑚暗礁海图',
      level: 83,
      areaType: 'seafloor-ridges',
      shape: 'End',
      edges: [true, false, false, false],
      implicitText: '增加 30% 相鄰區域找到的魔法怪物數量',
      modIds: ['adj-magic-1'],
      rewards: [
        { stat: 'quantity', percent: 110 },
        { stat: 'sulphur', percent: 75 },
      ],
    })
  })

  it('matches poedb-style roll forms on a different implicit', () => {
    // In-game inline roll 8(8-10) and poedb's bare (8—10) both resolve to
    // the same octopus tier through normalizeAliasText.
    const inline = parseOnlyChart(
      twChart.replace('增加 30% 相鄰區域找到的魔法怪物數量', '相鄰區域內含有額外 8(8-10) 群章魚'),
    )
    expect(inline.modIds).toEqual(['adj-octo-1'])

    const poedb = parseOnlyChart(
      twChart.replace('增加 30% 相鄰區域找到的魔法怪物數量', '相鄰區域內含有額外(8—10)群章魚'),
    )
    expect(poedb.modIds).toEqual(['adj-octo-1'])
  })

  it('resolves the Deep-Water rare-count implicit from its poedb.tw wording', () => {
    const t30 = parseOnlyChart(
      twChart.replace('增加 30% 相鄰區域找到的魔法怪物數量', '增加 30% 相鄰區域找到的稀有怪物數量'),
    )
    const t60 = parseOnlyChart(
      twChart.replace('增加 30% 相鄰區域找到的魔法怪物數量', '增加 60% 相鄰區域找到的稀有怪物數量'),
    )

    expect(t30.modIds).toEqual(['adj-rare-1'])
    expect(t60.modIds).toEqual(['adj-rare-2'])
  })

  it('keeps explicit downside lines in rawText but drops structural lines', () => {
    const chart = parseOnlyChart(twChart)

    expect(chart.rawText).toContain('怪物攻擊擊中時造成癱瘓')
    expect(chart.rawText).toContain('增加 30(26-35)% 怪物傷害')
    // Front-loaded reward riders are structural and must not be duplicated.
    expect(chart.rawText).not.toContain('此區域中找到的')
    // { 前綴 … } markers and the full-width parenthetical tooltips.
    expect(chart.rawText).not.toContain('前綴')
    expect(chart.rawText).not.toContain('被致盲')
  })

  it('maps the Traditional-Chinese destination names where they differ', () => {
    // 遠洋深淵 is the traditional form of 远洋深渊 (Pelagic Abyss); the CN
    // entry would not match, so the traditional field must carry it.
    const chart = parseOnlyChart(twChart.replace('海底山脊', '遠洋深淵'))

    expect(chart.areaType).toBe('pelagic-abyss')
  })

  const shapeCases = [
    ['End', '終點', [true, false, false, false]],
    ['Corner', '角落', [true, true, false, false]],
    ['Straight', '直線', [true, false, true, false]],
    ['Junction', '節點', [true, true, true, false]],
    ['Crossing', '交叉', [true, true, true, true]],
  ]

  it.each(shapeCases)(
    'maps the Traditional-Chinese %s shape to the canonical edges',
    (canonical, twShape, edges) => {
      const chart = parseOnlyChart(
        twChart.replace('海圖形狀： 終點', `海圖形狀： ${twShape}`),
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
      '增加 30% 相鄰區域找到的魔法怪物數量',
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
