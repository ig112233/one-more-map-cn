import { describe, expect, it } from 'vitest'
import { VOYAGE_MODS, BORDER_MODS, borderModById } from '../data/mods'
import { CHINESE_BORDER_MOD_EVIDENCE } from '../data/borderMods.zh'
import { TRADITIONAL_CHINESE_BORDER_MOD_EVIDENCE } from '../data/borderMods.tw'
import { CHART_AREAS, chartAreaTypeForText } from '../data/chartAreas'
import { STRATEGIES } from '../data/strategies'
import { matchImplicit, parseChartText } from './parser'
import { parseBorderOcrPayload } from './borderOcr'
import chineseChart from './__fixtures__/charted.zh.txt?raw'
import twChart from './__fixtures__/charted.tw.txt?raw'

const CN_IMPLICIT = '相邻区域包含 8(8-10) 个额外的章鱼群'
const TW_IMPLICIT = '增加 30% 相鄰區域找到的魔法怪物數量'

// every implicit mod id the 5 non-speedrun strategies need (requirements +
// bankTypes + rules + reservation groups)
const NEEDED_MOD_IDS = new Set(
  STRATEGIES.flatMap((s) => [
    ...(s.requirements ?? []).flatMap((r) => r.modIds ?? []),
    ...(s.bankTypes ?? []).flatMap((b) => b.modIds ?? []),
    ...s.rules.flatMap((r) => r.modIds ?? []),
    ...(s.reservationGroups ?? []).flatMap((g) => g.modIds ?? []),
  ]),
)
const NEEDED_AREAS = new Set(
  STRATEGIES.flatMap((s) => [
    ...(s.requirements ?? []).flatMap((r) => r.areaTypes ?? []),
    ...(s.bankTypes ?? []).flatMap((b) => b.areaTypes ?? []),
    ...s.rules.flatMap((r) => r.areaTypes ?? []),
  ]),
)
const NEEDED_BORDERS = new Set(
  STRATEGIES.flatMap((s) =>
    [
      s.requiresBorderId?.id,
      ...s.rules.map((r) => r.nearBorderId).filter(Boolean),
    ].filter((x): x is string => !!x),
  ),
)

const block = (text: string) => `=== VOYAGE BORDER 0 ===\n${text}\n=== END VOYAGE BORDER ===`

const SIMPLIFIED_MARK = /[个们区国图对发进过边机时书历层里后体会见间问龙兰门风马鱼长圣东单帮点无与华万头准号动药猫鸟鸡钱关开邻数谈尘贝贝车]/u // simplified-only chars
const TRADITIONAL_MARK = /[個們區國圖對發進過邊機時書曆層裏後體會見間問龍蘭門風馬魚長聖東單幫點無與華萬頭準號動藥貓鳥雞錢關開鄰數談塵貝車]|相鄰/u // traditional-only chars

describe('strategy component detection audit (CN/TW)', () => {
  it('every required implicit has a CN alias and a TW alias', () => {
    const missing: string[] = []
    for (const id of NEEDED_MOD_IDS) {
      const mod = VOYAGE_MODS.find((m) => m.id === id)
      if (!mod) {
        missing.push(`${id}: NOT A MOD`)
        continue
      }
      const aliases = mod.aliases ?? []
      const cnAlias = aliases.filter((a) => SIMPLIFIED_MARK.test(a))
      const twAlias = aliases.filter((a) => TRADITIONAL_MARK.test(a))
      if (cnAlias.length === 0) missing.push(`${id}: no CN alias`)
      if (twAlias.length === 0) missing.push(`${id}: no TW alias`)
    }
    expect(missing).toEqual([])
  })

  it('every required implicit RESOLVES via the parser (CN fixture + TW fixture)', () => {
    const failures: string[] = []
    for (const id of NEEDED_MOD_IDS) {
      const mod = VOYAGE_MODS.find((m) => m.id === id)
      if (!mod) continue
      const cnAlias = (mod.aliases ?? []).find((a) => /相邻/.test(a))
      const twAlias = (mod.aliases ?? []).find((a) => /相[鄰邻]/.test(a))
      if (cnAlias) {
        const chart = parseChartText(chineseChart.replace(CN_IMPLICIT, cnAlias))
        if (!chart.charts[0]?.modIds.includes(id)) failures.push(`${id} CN: ${cnAlias} -> ${JSON.stringify(chart.charts[0]?.modIds)}`)
      }
      if (twAlias) {
        const chart = parseChartText(twChart.replace(TW_IMPLICIT, twAlias))
        if (!chart.charts[0]?.modIds.includes(id)) failures.push(`${id} TW: ${twAlias} -> ${JSON.stringify(chart.charts[0]?.modIds)}`)
      }
    }
    expect(failures).toEqual([])
  })

  it('every required implicit RESOLVES from NEAR-MISS variants (missing 的 / roll form)', () => {
    const failures: string[] = []
    for (const id of NEEDED_MOD_IDS) {
      const mod = VOYAGE_MODS.find((m) => m.id === id)
      const cnAlias = (mod?.aliases ?? []).find((a) => /相邻/.test(a) && !/相鄰/.test(a))
      if (!cnAlias) continue
      const noParticle = cnAlias.replace(/[的得地]/g, '')
      if (noParticle !== cnAlias) {
        const r = matchImplicit(noParticle)
        if (r !== id) failures.push(`${id} near-miss "的" (${noParticle}) -> ${r}`)
      }
      const rolled = cnAlias.replace(/(\d+)(?![\.\d])/g, '$1($1-$1)')
      if (rolled !== cnAlias) {
        const r = matchImplicit(rolled)
        if (r !== id) failures.push(`${id} near-miss roll (${rolled}) -> ${r}`)
      }
    }
    expect(failures).toEqual([])
  })

  it('required AREA TYPES resolve from CN and TW names (anchorfield/sea-pillars/pelagic-abyss)', () => {
    const failures: string[] = []
    for (const areaId of NEEDED_AREAS) {
      const def = CHART_AREAS.find((a) => a.id === areaId)
      if (!def) {
        failures.push(`${areaId}: NOT IN CHART_AREAS`)
        continue
      }
      if (!def.chinese || chartAreaTypeForText(def.chinese) !== areaId)
        failures.push(`${areaId}: CN name ${def.chinese ?? 'MISSING'} not mapped`)
      if (!def.traditional || chartAreaTypeForText(def.traditional) !== areaId)
        failures.push(`${areaId}: TW name ${def.traditional ?? 'MISSING'} not mapped`)
    }
    expect(failures).toEqual([])
  })

  it('strategy BORDER mods resolve from CN and TW OCR sentences (b-divine etc.)', () => {
    const failures: string[] = []
    for (const id of NEEDED_BORDERS) {
      const zh = CHINESE_BORDER_MOD_EVIDENCE[id as keyof typeof CHINESE_BORDER_MOD_EVIDENCE]
      const tw = TRADITIONAL_CHINESE_BORDER_MOD_EVIDENCE[
        id as keyof typeof TRADITIONAL_CHINESE_BORDER_MOD_EVIDENCE
      ]
      if (zh) {
        const r = parseBorderOcrPayload(block(zh.text))
        const zhAliases = 'aliases' in zh ? (zh as { aliases: readonly string[] }).aliases : []
        if (!r.borders.includes(id)) failures.push(`${id} CN: ${zh.text} -> ${JSON.stringify(r.borders)} ${JSON.stringify(zhAliases)}`)
      } else {
        failures.push(`${id}: no CN border evidence`)
      }
      if (tw) {
        const r = parseBorderOcrPayload(block(tw.text))
        if (!r.borders.includes(id)) failures.push(`${id} TW: ${tw.text} -> ${JSON.stringify(r.borders)}`)
      } else {
        failures.push(`${id}: no TW border evidence`)
      }
    }
    expect(failures).toEqual([])
  })
})