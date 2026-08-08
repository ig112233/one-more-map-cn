import { describe, expect, it } from 'vitest'
import { CHART_AREAS } from '../data/chartAreas'
import type { ChartData } from '../types'
import chineseChart from './__fixtures__/charted.zh.txt?raw'
import latestChineseCharts from './__fixtures__/charted.latest.zh.txt?raw'
import { isChartClipboardText, parseChartText } from './parser'

// charted.zh.txt is a verbatim CN-client Ctrl+C copy (2026-08 CN player
// corpus), fixture #1: 咸水 短途 / 珊瑚暗礁海图, 海底山脊, 角落 shape,
// 8(8-10) octopus packs implicit.

function parseOnlyChart(text: string): ChartData {
  const result = parseChartText(text)
  expect(result.rejected).toEqual([])
  expect(result.charts).toHaveLength(1)
  return result.charts[0]
}

describe('Chinese client support', () => {
  it('detects CN-client clipboard text as Chart items', () => {
    expect(isChartClipboardText(chineseChart)).toBe(true)
    expect(isChartClipboardText(chineseChart.replace('物品类别', '物品种类'))).toBe(true)
    expect(isChartClipboardText('物品类别: 环甲')).toBe(false)
  })

  it('parses a real CN-client chart into canonical ids and shape names', () => {
    const chart = parseOnlyChart(chineseChart)

    expect(chart).toMatchObject({
      name: '咸水 短途 珊瑚暗礁海图',
      level: 82,
      areaType: 'seafloor-ridges',
      shape: 'Corner',
      edges: [true, true, false, false],
      implicitText: '相邻区域包含 8(8-10) 个额外的章鱼群',
      modIds: ['adj-octo-1'],
      rewards: [
        { stat: 'quantity', percent: 40 },
        { stat: 'rarity', percent: 60 },
        { stat: 'sulphur', percent: 30 },
        { stat: 'packsize', percent: 16 },
      ],
    })
  })

  it('normalizes an inline roll so any roll of the range matches the alias', () => {
    const chart = parseOnlyChart(
      chineseChart.replace('相邻区域包含 8(8-10) 个额外的章鱼群', '相邻区域包含 9(8-10) 个额外的章鱼群'),
    )

    expect(chart.modIds).toEqual(['adj-octo-1'])
  })

  it('keeps explicit downside lines in rawText but drops structural lines', () => {
    const chart = parseOnlyChart(chineseChart)

    expect(chart.rawText).toContain('怪物造成的 20(15-20)% 额外物理伤害视为火焰伤害')
    expect(chart.rawText).toContain('怪物击中时有几率偷取暴击球，狂暴球，耐力球')
    // Reward rider is structural and must not be duplicated into rawText.
    expect(chart.rawText).not.toContain('此区域中找到的亡者硫磺提高')
    // { 前缀属性 … } markers and the full-width parenthetical tooltips.
    expect(chart.rawText).not.toContain('前缀属性')
    expect(chart.rawText).not.toContain('被致盲')
  })

  const areaCases = CHART_AREAS.map(
    ({ id, english, chinese }) => [id, english, chinese] as const,
  )

  it('keeps the complete verified English/Korean/Chinese destination table', () => {
    expect(CHART_AREAS).toHaveLength(15)
    expect(new Set(CHART_AREAS.map(({ chinese }) => chinese)).size).toBe(15)
  })

  it.each(areaCases)(
    'maps Chinese %s destinations to the same canonical area type',
    (id, _english, chinese) => {
      const parsed = parseOnlyChart(
        chineseChart.replace('海底山脊', chinese as string),
      )

      expect(parsed.areaType).toBe(id)
    },
  )

  const shapeCases = [
    ['End', '末端', [true, false, false, false]],
    ['Corner', '角落', [true, true, false, false]],
    ['Straight', '直线', [true, false, true, false]],
    ['Junction', '节点', [true, true, true, false]],
    ['Crossing', '交叉', [true, true, true, true]],
  ]

  it.each(shapeCases)(
    'maps the Chinese %s shape to the canonical edges',
    (canonical, chineseShape, edges) => {
      const chart = parseOnlyChart(
        chineseChart.replace('海图形状：角落', `海图形状：${chineseShape}`),
      )

      expect(chart).toMatchObject({ shape: canonical, edges })
    },
  )

  it('keeps a chart with an unknown future destination without guessing', () => {
    const chart = parseOnlyChart(
      chineseChart.replace('海底山脊', '尚未登记的目的地'),
    )

    expect(chart.areaType).toBeUndefined()
    expect(chart.rawText).not.toContain('尚未登记的目的地')
  })

  it('rejects an uncharted CN chart with a reason', () => {
    const uncharted = chineseChart
      .replace('相邻区域包含 8(8-10) 个额外的章鱼群', '航行词缀将在完成测绘后揭示')
      .replace('海图形状：角落', '海图形状：直线')

    const result = parseChartText(uncharted)

    expect(result.charts).toEqual([])
    expect(result.rejected[0]?.reason).toContain('not charted')
  })

  it('mixes CN charts into a multi-client clipboard batch', () => {
    const mixed = `${chineseChart.trim()}\n${chineseChart.trim()}`

    const result = parseChartText(mixed)

    expect(result.rejected).toEqual([])
    expect(result.charts).toHaveLength(2)
  })
})

describe('real CN-client corpus (7 charts)', () => {
  const result = parseChartText(latestChineseCharts)

  it('imports all 7 charts without rejections', () => {
    expect(result.rejected).toEqual([])
    expect(result.charts).toHaveLength(7)
  })

  it.each([
    ['咸水 短途 珊瑚暗礁海图', 'Corner', 'seafloor-ridges', ['adj-octo-1']],
    ['海员 冒险 金沙海床海图', 'Crossing', 'abyssal-plain', ['adj-magic-1']],
    ['航海 冒险 金沙海床海图', 'Corner', 'abyssal-plain', ['adj-spirit-1']],
    ['水生 下潜 金沙海床海图', 'Junction', 'abyssal-plain', ['adj-barrel-1']],
    ['咸水 下降 金沙海床海图', 'Junction', 'abyssal-plain', ['voy-rare']],
    ['盐水 追寻 珊瑚暗礁海图', 'Junction', 'seafloor-ridges', ['adj-fracture']],
    ['远洋 深入 珊瑚密林海图', 'Junction', 'undersea-groves', ['adj-wisps-1']],
  ] as const)(
    'parses %s into the canonical shape, destination and implicit id',
    (name, shape, areaType, modIds) => {
      const chart = result.charts.find((c) => c.name === name)

      expect(chart, name).toMatchObject({ shape, areaType, modIds })
    },
  )

  it('keeps every explicit downside verbatim, free of structural lines', () => {
    for (const chart of result.charts) {
      expect(chart.rawText).toBeTruthy()
      expect(chart.rawText).not.toContain('此区域中找到的')
      expect(chart.rawText).not.toContain('前缀属性')
      expect(chart.rawText).not.toContain('基底属性')
    }
  })
})
