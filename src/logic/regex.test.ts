import { describe, expect, it } from 'vitest'
import type { ChartData } from '../types'
import englishChartText from './__fixtures__/charted.en.txt?raw'
import koreanChartText from './__fixtures__/charted.ko.txt?raw'
import chineseChartText from './__fixtures__/charted.zh.txt?raw'
import twChartText from './__fixtures__/charted.tw.txt?raw'
import { VOYAGE_MODS, voyageModById } from '../data/mods'
import { DEFAULT_WEIGHTS } from './rewards'
import { parseChartText } from './parser'
import {
  buildBestModRegex,
  buildChartSearch,
  buildSingleChartSearch,
  type RegexLang,
} from './regex'

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

const HAN_ONLY = /^\p{Script=Han}+$/u

// Re-derive the alias classifier the same way regex.ts does, to prove the
// emitted fragments are substrings of the recorded CN/TW client aliases and
// not of the paraphrased zh display text.
const TW_CHAR_RE =
  /[區圖級詞綴數測繪顯現記錄與後體質獲該對為這點邊靈寶險響屬進遠淵淺環島灣鄰傷機電凍緩觸術擊運亂澤溝灘曠儲給艦隊長難殘敗發沒遺墳頭額聖蟲隱覺壇籠鑰鯨龜盜鏽個備傳價劑奧幣帶擁於會條機滿為無燈眾茲藥裝質錮鍊關隻項類魚黃]/
const HAN_RESRC = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/
const HANGUL_RE = /[\uac00-\ud7a3]/
const hanOnly = (s: string) => s.replace(/[^\p{Script=Han}]+/gu, '')

function assertFragmentsComeFromAliases(
  regex: string,
  included: { id: string; aliases?: readonly string[]; zh?: string; text: string }[],
  lang: 'zh' | 'tw',
) {
  const fragments = regex.split('|')
  expect(fragments).toHaveLength(included.length)
  included.forEach((m, i) => {
    const alias = (m.aliases ?? []).find(
      (a) =>
        lang === 'tw'
          ? TW_CHAR_RE.test(a)
          : HAN_RESRC.test(a) && !TW_CHAR_RE.test(a) && !HANGUL_RE.test(a),
    )
    expect(alias, `${m.id} lacks a ${lang} alias`).toBeTruthy()
    expect(hanOnly(alias!), `${m.id} fragment ${fragments[i]} not in its ${lang} alias`).toContain(
      fragments[i],
    )
  })
}

function zeroWeights(): Record<string, number> {
  return Object.fromEntries(Object.keys(DEFAULT_WEIGHTS).map((k) => [k, 0]))
}

describe('buildBestModRegex language support', () => {
  it('stays English letters/spaces by default', () => {
    const { regex, included } = buildBestModRegex(DEFAULT_WEIGHTS, 250)

    expect(regex).toBeTruthy()
    expect(regex).toMatch(/^[a-z |]+$/)
    expect(included.length).toBeGreaterThan(0)
    // self map-mod families (cm-*) have verbatim English, so they stay included
    expect(included.some((m) => m.scope === 'self')).toBe(true)
  })

  it('builds a Simplified-Chinese regex from the recorded CN client aliases', () => {
    const { regex, included } = buildBestModRegex(DEFAULT_WEIGHTS, 250, undefined, 'zh')

    expect(included.length).toBeGreaterThan(0)
    // fragments are pure Han runs with no numbers/punct/spaces - the CN client
    // tooltip text is unspaced, so roomless fragments can match it
    expect(regex.split('|').every((f) => HAN_ONLY.test(f))).toBe(true)
    // 一个 real CN-corpus fragment is present (adj-atziri 阿兹里之息 is classified CN)
    expect(regex).toContain('阿兹里')
    // self map-mod families (cm-*) only have paraphrased zh text, so they drop out
    expect(included.some((m) => m.scope === 'self')).toBe(false)
    assertFragmentsComeFromAliases(regex, included, 'zh')
  })

  it('builds a Traditional-Chinese regex from the recorded TW client aliases', () => {
    const { regex, included } = buildBestModRegex(DEFAULT_WEIGHTS, 250, undefined, 'tw')

    expect(included.length).toBeGreaterThan(0)
    expect(regex.split('|').every((f) => HAN_ONLY.test(f))).toBe(true)
    // traditional-script fragments appear (區域/額外/個…); includes the TW alias
    // 阿茲里之息 which has no char in the old TW_ONLY_HAN_RE heuristic alone
    expect(regex).toContain('阿茲里')
    expect(regex).toMatch(/[區域額外個無機滿關]/)
    // the same family is not duplicated across scripts
    expect(regex).not.toContain('阿兹里')
    // self families are excluded here too
    expect(included.some((m) => m.scope === 'self')).toBe(false)
    assertFragmentsComeFromAliases(regex, included, 'tw')
  })

  it('respects the length cap in every language', () => {
    for (const lang of ['en', 'zh', 'tw'] as RegexLang[]) {
      const cap = 50
      const { regex } = buildBestModRegex(DEFAULT_WEIGHTS, cap, undefined, lang)
      expect(regex.length).toBeLessThanOrEqual(cap)
    }
  })

  it('drops families that have no verbatim client text in the chosen language', () => {
    const weights = { ...zeroWeights(), 'self:quant': 10 }
    // only quantity self-mod families have value; they have verbatim English,
    // but only a paraphrased zh display text - so they survive in EN only
    const en = buildBestModRegex(weights, 250, undefined, 'en')
    expect(en.regex).toBeTruthy()
    expect(en.included[0]?.scope).toBe('self')
    expect(buildBestModRegex(weights, 250, undefined, 'zh').regex).toBe('')
    expect(buildBestModRegex(weights, 250, undefined, 'tw').regex).toBe('')
  })
})

describe('buildBestModRegex alias classification coverage', () => {
  it('every adjacent/global mod has both CN and TW client text recorded', () => {
    const missing: Record<string, string[]> = {}
    for (const m of VOYAGE_MODS) {
      if (m.scope === 'self') continue
      for (const lang of ['zh', 'tw'] as RegexLang[]) {
        const alias = (m.aliases ?? []).find(
          (a) =>
            lang === 'tw'
              ? TW_CHAR_RE.test(a)
              : HAN_RESRC.test(a) && !TW_CHAR_RE.test(a) && !HANGUL_RE.test(a),
        )
        if (!alias) missing[m.id] = [...(missing[m.id] ?? []), lang]
      }
    }
    expect(missing).toEqual({})
  })

  it('classifies every CJK alias into exactly one language', () => {
    const misclassified: string[] = []
    for (const m of VOYAGE_MODS) {
      for (const alias of m.aliases ?? []) {
        if (!HAN_RESRC.test(alias)) continue
        const isTw = TW_CHAR_RE.test(alias)
        const isCn = !isTw && !HANGUL_RE.test(alias)
        if (!isTw && !isCn) misclassified.push(`${m.id}: ${alias}`)
      }
    }
    expect(misclassified).toEqual([])
  })
})
