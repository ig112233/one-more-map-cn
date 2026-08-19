// Build a compact search string for the in-game chart inventory search box
// ("Type keywords here..."), to highlight exactly the charts a solved board
// uses. Uses shortest-unique-substring per chart name (poe.re style) so the
// string stays short.
// LAUNCH-DAY TODO: confirm what fields the in-game search matches (name, mod
// text, level?) and whether it supports regex alternation `|` - adjust here.

import { VOYAGE_MODS, voyageModById } from '../data/mods'
import { voyageRewardKey } from './rewards'
import type { ChartData, VoyageModDef, Weights } from '../types'

const HANGUL_RE = /[\uac00-\ud7a3]/
const HAN_RE = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/

// Traditional-only characters common in TW-client chart text. The TW client
// renders a MIXED script (e.g. 物品種類: 海图), so any traditional char is
// enough to identify it; fully-simplified CN text contains none of these.
// Only used to disambiguate charts that predate the recorded clientLang.
const TW_ONLY_HAN_RE =
  /[區圖級詞綴數測繪顯現記錄與後體質獲該對為這點邊靈寶險響屬進遠淵淺環島灣鄰傷機電凍緩觸術擊運亂澤溝灘曠儲給艦隊長難殘敗發沒遺墳頭額聖蟲隱覺壇籠鑰鯨龜盜鏽]/

// Traditional-only characters used to classify a localized alias as TW-client
// text. Starts from the hand-curated TW_ONLY_HAN_RE set (which drives chart
// language guessing) and adds the supplementary characters observed in the
// TW voyage-mod corpus (voyage-mods.tw.tsv) whose simplified forms differ
// (個備傳價劑奧幣帶擁於會條機滿為無燈眾茲藥裝質錮鍊關隻項類魚黃).
// Fully-simplified CN text contains none of these, so a single hit identifies
// the line as Traditional Chinese.
export const TW_CLIENT_CHAR_RE =
  /[區圖級詞綴數測繪顯現記錄與後體質獲該對為這點邊靈寶險響屬進遠淵淺環島灣鄰傷機電凍緩觸術擊運亂澤溝灘曠儲給艦隊長難殘敗發沒遺墳頭額聖蟲隱覺壇籠鑰鯨龜盜鏽個備傳價劑奧幣帶擁於會條機滿為無燈眾茲藥裝質錮鍊關隻項類魚黃]/

/** In-game "Area Level:" term in the chart's client language. Recorded
 * imports use their exact language; manual/legacy charts fall back to text
 * heuristics (TW first via traditional chars, then CN, else Korean/English). */
function levelTermFor(chart: ChartData): string {
  switch (chart.clientLang) {
    case 'ko':
      return '지역 레벨'
    case 'tw':
      return '區域等級'
    case 'zh':
      return '区域等级'
    case 'en':
      return 'Level'
  }
  const sourceText = [chart.implicitText, chart.rawText, chart.name]
    .filter(Boolean)
    .join('\n')
  if (HANGUL_RE.test(sourceText)) return '지역 레벨'
  if (HAN_RE.test(sourceText)) return TW_ONLY_HAN_RE.test(sourceText) ? '區域等級' : '区域等级'
  return 'Level'
}

/**
 * Build the search text used to find one exact chart in the in-game inventory.
 * Imported charts keep their client-language verbatim fields (name, implicit)
 * and the level term follows the recorded client language - a TW import gets
 * 區域等級, a CN import 区域等级 - so the paste matches the user's own client.
 */
export function buildSingleChartSearch(chart: ChartData): string {
  const implicit =
    chart.implicitText ??
    chart.modIds
      .map((id) => voyageModById.get(id))
      .find((mod) => mod && mod.scope !== 'self')?.text ??
    ''
  return [chart.name, implicit, `${levelTermFor(chart)} ${chart.level}`]
    .filter(Boolean)
    .join(' ')
}

/** Which client language the best-chart search regex should match against. */
export type RegexLang = 'en' | 'zh' | 'tw'

/**
 * Verbatim client text for a voyage mod in the requested language, when the
 * data has one: EN uses the canonical `text`; CN/TW use the recorded client
 * aliases (corpus-verified or poedb-datamined, sometimes both). Self map-mod
 * families (cm-*) only carry the paraphrased Simplified `zh` display text,
 * which the in-game search would not match (e.g. zh 额外包含 vs the CN client
 * 包含…额外的), so they are deliberately excluded from the CN/TW regex.
 */
function clientTextFor(m: VoyageModDef, lang: RegexLang): string | undefined {
  if (lang === 'en') return m.text
  for (const alias of m.aliases ?? []) {
    if (lang === 'tw') {
      if (TW_CLIENT_CHAR_RE.test(alias)) return alias
    } else if (HAN_RE.test(alias) && !TW_CLIENT_CHAR_RE.test(alias) && !HANGUL_RE.test(alias)) {
      return alias
    }
  }
  return undefined
}

/**
 * Build a paste-into-game regex that highlights the BEST charts given the
 * user's reward weights - no import needed. Mods are ranked by weighted value
 * times scope reach (a global mod touches 9 areas, adjacent ~3, self 1), then
 * greedily added as shortest-unique text fragments until the length cap.
 * `lang` picks which client language the fragments are written in: EN uses
 * letters/spaces only (so rolled numeric values don't break matching), CN/TW
 * fold each mod down to a space-free Han run (the CN/TW client renders chart
 * tooltips without spaces, and the game search matches their unspaced text).
 */
export function buildBestModRegex(
  weights: Weights,
  cap = 50,
  disabledMods?: Set<string>,
  lang: RegexLang = 'en',
): { regex: string; included: VoyageModDef[] } {
  const reach = { self: 1, adjacent: 3, global: 9 } as const
  const lettersOnly = (s: string) =>
    s.toLowerCase().replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim()
  // CJK client text is unspaced; drop digits/percent/ranges/spaces so tier
  // variants collapse into one family and fragments match the unspaced tooltip
  const hanOnly = (s: string) => s.replace(/[^\p{Script=Han}]+/gu, '')
  const fold = lang === 'en' ? lettersOnly : hanOnly

  // group tier variants into families (identical text once numbers are stripped);
  // a family's value is its best tier's value
  const families = new Map<string, { m: VoyageModDef; v: number }>()
  for (const m of VOYAGE_MODS) {
    if (disabledMods?.has(m.id)) continue
    const w = weights[voyageRewardKey(m)] ?? 0
    const v = m.effects.reduce((s, e) => s + w * e.percent, 0) * reach[m.scope]
    if (v <= 0) continue
    const text = clientTextFor(m, lang)
    if (text === undefined) continue
    const key = fold(text)
    if (!key) continue
    const existing = families.get(key)
    if (!existing || v > existing.v) families.set(key, { m, v })
  }
  const scored = [...families.entries()]
    .map(([key, { m, v }]) => ({ key, m, v }))
    .sort((a, b) => b.v - a.v)

  const token = (key: string, otherKeys: string[]): string => {
    for (let len = 3; len <= key.length; len++) {
      for (let i = 0; i + len <= key.length; i++) {
        const sub = key.slice(i, i + len)
        if (sub !== sub.trim()) continue
        if (!otherKeys.some((t) => t.includes(sub))) return sub
      }
    }
    return key
  }

  const included: VoyageModDef[] = []
  const tokens: string[] = []
  for (const { key, m } of scored) {
    const otherKeys = [...families.keys()].filter((k) => k !== key)
    const t = token(key, otherKeys)
    const candidate = [...tokens, t].join('|')
    if (candidate.length > cap) {
      if (tokens.length === 0) continue // skip an oversized top family, try the next
      break
    }
    tokens.push(t)
    included.push(m)
  }
  return { regex: tokens.join('|'), included }
}

export function buildChartSearch(targets: string[], otherPoolNames: string[]): string {
  const targetSet = new Set(targets.map((t) => t.toLowerCase()))
  const others = otherPoolNames.map((s) => s.toLowerCase()).filter((o) => !targetSet.has(o))

  // CJK chart names (CN client) carry no spaces between words, and the game
  // search matches their unspaced text; strip spaces before fragmenting so
  // fragments stay matchable. English names keep spaces so fragments never
  // span a word boundary.
  const fold = (s: string) => (HAN_RE.test(s) ? s.replace(/\s+/g, '') : s)
  const foldedTargets = new Set([...targetSet].map(fold))
  const foldedOthers = others.map(fold)

  const parts: string[] = []
  for (const name of foldedTargets) {
    let best: string | null = null
    for (let len = 3; len <= name.length && !best; len++) {
      for (let i = 0; i + len <= name.length; i++) {
        const sub = name.slice(i, i + len)
        if (sub !== sub.trim()) continue
        if (!foldedOthers.some((o) => o.includes(sub))) {
          best = sub
          break
        }
      }
    }
    parts.push(best ?? name)
  }
  return [...new Set(parts)].join('|')
}
