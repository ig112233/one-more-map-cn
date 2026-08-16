// Chart item-text importer, built against the real PoE 3.29 chart format.
//
// Localization is handled at this parser boundary. Stored modifier ids and
// shape names remain canonical so scoring, strategies and saved state do not
// need to know which client language produced the clipboard text.

import { VOYAGE_MODS } from '../data/mods'
import { chartAreaTypeForText } from '../data/chartAreas'
import type { ChartClientLang, ChartData, Edges, ModEffect, Stat } from '../types'

let uidCounter = 0
export function newUid(): string {
  uidCounter += 1
  return `c${Date.now().toString(36)}-${uidCounter}`
}

interface ShapeDefinition {
  canonical: string
  edges: Edges
}

interface HeaderStat {
  re: RegExp
  stat: Stat
}

interface ClipboardDialect {
  /** game client language this dialect parses; stored on imported charts so
   *  copied search strings reuse the client's own terms */
  lang: ChartClientLang
  itemClass: RegExp
  chartClass: RegExp
  rarity: RegExp
  areaLevel: RegExp
  shape: RegExp
  shapeLabel: string
  implicitMarker: RegExp
  uncharted?: RegExp
  headerStats: HeaderStat[]
  shapes: Record<string, ShapeDefinition>
  structural: RegExp
  rewardRider: RegExp
}

/** Connector edges are [N,E,S,W]. Orientation is arbitrary because the solver
 * can rotate charts; only connector count and arrangement matter. */
const END: ShapeDefinition = { canonical: 'End', edges: [true, false, false, false] }
const CORNER: ShapeDefinition = { canonical: 'Corner', edges: [true, true, false, false] }
const STRAIGHT: ShapeDefinition = { canonical: 'Straight', edges: [true, false, true, false] }
const JUNCTION: ShapeDefinition = { canonical: 'Junction', edges: [true, true, true, false] }
const CROSSING: ShapeDefinition = { canonical: 'Crossing', edges: [true, true, true, true] }

const ENGLISH_DIALECT: ClipboardDialect = {
  lang: 'en',
  itemClass: /^[ \t]*Item Class\s*[:：]/im,
  chartClass: /^[ \t]*Item Class\s*[:：]\s*Chart[ \t]*$/im,
  rarity: /^Rarity\s*[:：]/i,
  areaLevel: /^Area Level\s*[:：]\s*(\d+)\s*$/im,
  shape: /^Chart Shape\s*[:：]\s*(.+?)\s*$/im,
  shapeLabel: 'Chart Shape',
  implicitMarker: /^\{\s*Implicit Modifier\s*\}$/i,
  uncharted: /Voyage Modifier will be revealed once Charted/i,
  headerStats: [
    { re: /Item Quantity:\s*\+?(\d+)%/i, stat: 'quantity' },
    { re: /Item Rarity:\s*\+?(\d+)%/i, stat: 'rarity' },
    { re: /Gold Found:\s*\+?(\d+)%/i, stat: 'gold' },
    { re: /Dead Man's Sulphur:\s*\+?(\d+)%/i, stat: 'sulphur' },
    { re: /Pack Size:\s*\+?(\d+)%/i, stat: 'packsize' },
    { re: /Scarabs Found:\s*\+?(\d+)%/i, stat: 'scarabs' },
    { re: /Currency Found:\s*\+?(\d+)%/i, stat: 'currency' },
  ],
  shapes: {
    end: END,
    corner: CORNER,
    straight: STRAIGHT,
    junction: JUNCTION,
    crossing: CROSSING,
    crossroads: CROSSING,
    cross: CROSSING,
  },
  structural:
    /^(?:Item Class\s*[:：]|Rarity\s*[:：]|Area Level\s*[:：]|Item Level\s*[:：]|Requires|Chart Shape\s*[:：]|Take this item|Seafloor|Abyssal|Undersea|Anchorfield|Kishara)/i,
  rewardRider: /found in this Area/i,
}

const KOREAN_DIALECT: ClipboardDialect = {
  lang: 'ko',
  itemClass: /^[ \t]*아이템 종류\s*[:：]/im,
  chartClass: /^[ \t]*아이템 종류\s*[:：]\s*해도[ \t]*$/im,
  rarity: /^아이템 희귀도\s*[:：]/i,
  areaLevel: /^지역 레벨\s*[:：]\s*(\d+)\s*$/im,
  shape: /^해도 형태\s*[:：]\s*(.+?)\s*$/im,
  shapeLabel: '해도 형태',
  implicitMarker: /^\{\s*고정 속성 부여\s*\}$/i,
  uncharted: /^해도를 기록하면 항해 속성이 드러남$/im,
  headerStats: [
    { re: /아이템 수량\s*[:：]\s*\+?(\d+)%/i, stat: 'quantity' },
    { re: /아이템 희귀도\s*[:：]\s*\+?(\d+)%/i, stat: 'rarity' },
    { re: /골드 발견량\s*[:：]\s*\+?(\d+)%/i, stat: 'gold' },
    { re: /망자의 유황\s*[:：]\s*\+?(\d+)%/i, stat: 'sulphur' },
    { re: /몬스터 무리 규모\s*[:：]\s*\+?(\d+)%/i, stat: 'packsize' },
  ],
  shapes: {
    끄트머리: END,
    모서리: CORNER,
    직선: STRAIGHT,
    접점: JUNCTION,
    교차: CROSSING,
  },
  structural:
    /^(?:아이템 종류\s*[:：]|아이템 희귀도\s*[:：]|지역 레벨\s*[:：]|아이템 레벨\s*[:：]|요구사항\s*[:：]?|레벨\s*[:：]\s*\d+|해도 형태\s*[:：]|이 지역을 해도로 기록하려면)/i,
  rewardRider: /^이 지역에서 발견하는 .*\d+%\s*증가$/i,
}

// ---------------------------------------------------------------------------
// Traditional-Chinese (TW / Garena 台服) dialect.
//
// Structural labels verified against a real TW-client chart copy (2026-08,
// provided by a TW player): the item header renders 物品種類: 海图 with a
// MIXED script (種類 traditional, 海图 simplified - the TW client embeds
// some simplified strings), Rarity is 稀有度 (not letter-spaced), the header
// stat for the league currency is 亡者硫酸, the implicit marker is
// { 固定詞綴 }, shapes are 終點/角落/…, and reward riders are front-loaded
// (增加 45% 此區域中找到的亡者硫酸). 物品類別/海圖 forms are kept as
// candidates in case other regions of the client render them traditional.
// Modifier lines (the { 固定詞綴 } body) are matched via the poedb.tw aliases
// on the mod defs; poedb.tw renders directly from the TW client's
// stat_descriptions.txt, but like the CN corpus the in-game Ctrl+C roll
// format (1(1-2)) differs from poedb's (1—2) - normalizeAliasText collapses
// both forms.
// ---------------------------------------------------------------------------
const TRADITIONAL_CHINESE_DIALECT: ClipboardDialect = {
  lang: 'tw',
  itemClass: /^[ \t]*物品(?:類別|種類)\s*[:：]/im,
  chartClass: /^[ \t]*物品(?:類別|種類)\s*[:：]\s*海[圖图][ \t]*$/im,
  rarity: /^稀\s*有\s*度\s*[:：]/i,
  areaLevel: /^區域等級\s*[:：]\s*(\d+)\s*$/im,
  shape: /^海圖形狀\s*[:：]\s*(.+?)\s*$/im,
  shapeLabel: '海圖形狀',
  implicitMarker: /^\{\s*(?:基底屬性|固定詞綴|固定屬性|固有詞綴)\s*\}$/i,
  uncharted: /航程詞綴(?:將|會)(?:於|在)(?:完成)?測繪後(?:揭露|揭示|顯現)/i,
  headerStats: [
    { re: /物品數量\s*[:：]\s*\+?(\d+)%/i, stat: 'quantity' },
    { re: /物品稀有度\s*[:：]\s*\+?(\d+)%/i, stat: 'rarity' },
    { re: /金幣(?:發現量)?\s*[:：]\s*\+?(\d+)%/i, stat: 'gold' },
    { re: /亡者(?:硫酸|硫磺)\s*[:：]\s*\+?(\d+)%/i, stat: 'sulphur' },
    { re: /怪物群大小\s*[:：]\s*\+?(\d+)%/i, stat: 'packsize' },
    { re: /聖甲蟲(?:發現量)?\s*[:：]\s*\+?(\d+)%/i, stat: 'scarabs' },
    { re: /通貨(?:發現量)?\s*[:：]\s*\+?(\d+)%/i, stat: 'currency' },
  ],
  // 角落/交叉/直線/節點 follow the verified CN client shapes; 終點 (End),
  // 交界處 (Junction) and 十字口 (Crossing) are confirmed on real TW-client
  // copies (2026-08); 交會處/交匯處/交叉路口/轉角/十字/三岔/端點/盡頭 are
  // candidate forms.
  shapes: {
    角落: CORNER,
    轉角: CORNER,
    轉彎: CORNER,
    交叉: CROSSING,
    十字: CROSSING,
    十字口: CROSSING,
    十字路口: CROSSING,
    交叉路口: CROSSING,
    節點: JUNCTION,
    交界處: JUNCTION,
    交會處: JUNCTION,
    交匯處: JUNCTION,
    三岔: JUNCTION,
    交叉點: JUNCTION,
    直線: STRAIGHT,
    末端: END,
    終點: END,
    端點: END,
    盡頭: END,
  },
  structural:
    /^(?:物品(?:類別|種類)\s*[:：]|稀\s*有\s*度\s*[:：]|區域等級\s*[:：]|物品等級\s*[:：]|需求\s*[:：]?|等級\s*[:：]\s*\d+|海圖形狀\s*[:：]|將此物品帶給|（)/i,
  rewardRider:
    /^(?:此區域|該區域|相鄰區域)(?:中|內|裡|内)?(?:找到|發現|掉落)?的?.{0,20}?(?:提高|增加|總增|降低|減少)\s*\d+%|^(?:增加|提高)\s*\d+%\s*(?:此區域|該區域|相鄰區域)(?:中|內|裡|内)?(?:找到|發現|掉落)?的?/i,
}

// ---------------------------------------------------------------------------
// Simplified-Chinese dialect.
//
// Structural labels verified against real CN-client chart copies (2026-08,
// CN player corpus): the item header is 物品类别, Rarity renders as 稀 有 度
// (letter-spaced!), the header stat for Pack size is 怪物群大小, the implicit
// marker is { 基底属性 }, shapes are 角落/交叉/节点/…, and reward riders read
// 此区域中找到的…提高 X%. Chart Shape names were confirmed from the same
// corpus; any name not seen yet keeps a translated candidate so future charts
// still parse. Modifier lines (the { 基底属性 } body) are matched via aliases
// on the mod defs; unaliased ones keep their verbatim text.
// ---------------------------------------------------------------------------
const CHINESE_DIALECT: ClipboardDialect = {
  lang: 'zh',
  itemClass: /^[ \t]*物品(?:类别|种类)\s*[:：]/im,
  chartClass: /^[ \t]*物品(?:类别|种类)\s*[:：]\s*海图[ \t]*$/im,
  rarity: /^稀\s*有\s*度\s*[:：]/i,
  areaLevel: /^区域等级\s*[:：]\s*(\d+)\s*$/im,
  shape: /^海图形状\s*[:：]\s*(.+?)\s*$/im,
  shapeLabel: '海图形状',
  implicitMarker: /^\{\s*(?:基底属性|固定词缀|固定属性|固有词缀)\s*\}$/i,
  uncharted: /航行词缀将在完成测绘后揭示|完成测绘(?:后|之)?会揭(?:示|露)/i,
  headerStats: [
    { re: /物品数量\s*[:：]\s*\+?(\d+)%/i, stat: 'quantity' },
    { re: /物品稀有度\s*[:：]\s*\+?(\d+)%/i, stat: 'rarity' },
    { re: /金币(?:发现量)?\s*[:：]\s*\+?(\d+)%/i, stat: 'gold' },
    { re: /亡者硫磺\s*[:：]\s*\+?(\d+)%/i, stat: 'sulphur' },
    { re: /怪物群大小\s*[:：]\s*\+?(\d+)%/i, stat: 'packsize' },
    { re: /圣甲虫(?:发现量)?\s*[:：]\s*\+?(\d+)%/i, stat: 'scarabs' },
    { re: /通货(?:发现量)?\s*[:：]\s*\+?(\d+)%/i, stat: 'currency' },
  ],
  // 角落/交叉/节点 confirmed from the CN corpus; the rest are candidates.
  shapes: {
    角落: CORNER,
    拐角: CORNER,
    转角: CORNER,
    交叉: CROSSING,
    十字: CROSSING,
    十字路口: CROSSING,
    节点: JUNCTION,
    三岔: JUNCTION,
    交叉点: JUNCTION,
    直线: STRAIGHT,
    末端: END,
    端点: END,
    尽头: END,
  },
  structural:
    /^(?:物品(?:类别|种类)\s*[:：]|稀\s*有\s*度\s*[:：]|区域等级\s*[:：]|物品等级\s*[:：]|需求\s*[:：]?|等级\s*[:：]\s*\d+|海图形状\s*[:：]|将此物品带给|（)/i,
  rewardRider:
    /^(?:此区域|该区域|相邻区域)(?:中|内|里)?(?:找到|发现|掉落)的?.{0,20}?(?:提高|增加|总增|降低|减少)\s*\d+%/i,
}

const DIALECTS = [ENGLISH_DIALECT, KOREAN_DIALECT, CHINESE_DIALECT, TRADITIONAL_CHINESE_DIALECT]
const ITEM_START_RE = /(?=^[ \t]*(?:Item Class|아이템 종류|物品(?:类别|种类|類別|種類))\s*[:：])/gim
const SEPARATOR_RE = /^-{3,}$/

function normalizeClipboardText(text: string): string {
  return text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
}

function normalizeLookupText(text: string): string {
  return text.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim()
}

/** Alias matching ignores a rolled value when the clipboard also includes
 * its invariant range (for example, both 8(8-10) and 9(8-10) become 8-10),
 * and collapses a bare parenthesised range the same way ((8—10) becomes 8-10)
 * so poedb-style text and in-game inline rolls compare identically. Chinese
 * aliases/lines are compared without whitespace because clients may render
 * numbers with or without surrounding spaces (相鄰區域內含有額外(8—10)群章魚 vs
 * 相鄰區域內含有額外 8(8-10) 群章魚); space-separated Korean/English aliases are
 * left untouched. Keep this separate from general lookup normalization: shape
 * lookup and the verbatim implicit text must not be changed by roll
 * normalization. */
const HAN_RE_ALIAS = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/
function normalizeAliasText(text: string): string {
  const normalized = normalizeLookupText(text)
  const compact = HAN_RE_ALIAS.test(normalized)
    ? normalized.replace(/\s+/g, '')
    : normalized
  return compact
    .replace(
      /\d+(?:\.\d+)?\s*\(\s*(\d+(?:\.\d+)?)\s*[-‐‑‒–—―−~～]\s*(\d+(?:\.\d+)?)\s*\)/g,
      '$1-$2',
    )
    .replace(
      /\(\s*(\d+(?:\.\d+)?)\s*[-‐‑‒–—―−~～]\s*(\d+(?:\.\d+)?)\s*\)/g,
      '$1-$2',
    )
}

function dialectForItem(item: string): ClipboardDialect | undefined {
  return DIALECTS.find((dialect) => dialect.itemClass.test(item))
}

/** True when clipboard text contains an English or Korean Chart class header. */
export function isChartClipboardText(text: string): boolean {
  const normalized = normalizeClipboardText(text)
  return DIALECTS.some((dialect) => dialect.chartClass.test(normalized))
}

// Common filler words dropped when matching, so wording/pluralisation/number
// differences between the game text and our stored English text do not block a
// match.
const STOP = new Set(
  (
    'a an the of in on to be by and or per this that all are is it as at with for ' +
    'additional adjacent area areas contain contains contained chance found more less ' +
    'increased reduced number numbers dropped drop drops gain gains will would have has ' +
    'natural inhabitants monster monsters players player instead'
  ).split(/\s+/),
)
const stem = (w: string): string => w.replace(/(es|s)$/, '')

/** Levenshtein distance, capped early - used to tolerate the game's own typos
 * (e.g. the "Qauntity of Items" voyage mod is misspelled in-game). */
function editDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (Math.abs(m - n) > 2) return 99
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
    }
    prev = cur
  }
  return prev[n]
}

/** Does the line contain this mod keyword, allowing a near-miss for long words? */
function fuzzyHas(lineWords: Set<string>, w: string): boolean {
  if (lineWords.has(w)) return true
  if (w.length < 5) return false
  for (const lw of lineWords) {
    if (Math.abs(lw.length - w.length) > 2) continue
    if (editDistance(lw, w) <= 2) return true
  }
  return false
}

/** Distinctive English keywords of a mod line (stemmed, filler removed). */
function sigWords(s: string): string[] {
  const out = new Set<string>()
  for (const w of s
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z ]+/g, ' ')
    .split(/\s+/)) {
    if (w.length >= 3 && !STOP.has(w)) out.add(stem(w))
  }
  return [...out]
}

function matchLocalizedAlias(line: string): string | null {
  const normalized = normalizeAliasText(line)
  const matchingIds = new Set<string>()
  for (const mod of VOYAGE_MODS) {
    if (mod.scope === 'self') continue
    if (mod.aliases?.some((alias) => normalizeAliasText(alias) === normalized)) {
      matchingIds.add(mod.id)
    }
  }
  return matchingIds.size === 1 ? [...matchingIds][0] : null
}

/** Match a revealed implicit line against localized aliases first, then retain
 * the existing English fuzzy matcher and its tie-breaking behaviour. */
function matchImplicit(line: string): string | null {
  const aliasId = matchLocalizedAlias(line)
  if (aliasId) return aliasId

  const lineWords = new Set(sigWords(line))
  if (lineWords.size === 0) return null
  const lineNum = parseFloat(line.replace(/\([^)]*\)/g, ' ').match(/\d+/)?.[0] ?? '')
  const scored = VOYAGE_MODS.filter((m) => m.scope !== 'self')
    .map((m) => {
      const mw = sigWords(m.text)
      const covered = mw.filter((w) => fuzzyHas(lineWords, w)).length
      return { m, mwLen: mw.length, ratio: mw.length ? covered / mw.length : 0 }
    })
    .filter((x) => x.ratio >= 0.6)
  if (scored.length === 0) return null
  scored.sort((a, b) => {
    if (b.ratio !== a.ratio) return b.ratio - a.ratio
    if (b.mwLen !== a.mwLen) return b.mwLen - a.mwLen
    if (!isNaN(lineNum)) {
      const an = parseFloat(a.m.text.match(/\d+/)?.[0] ?? 'NaN')
      const bn = parseFloat(b.m.text.match(/\d+/)?.[0] ?? 'NaN')
      return (isNaN(an) ? 1e9 : Math.abs(an - lineNum)) - (isNaN(bn) ? 1e9 : Math.abs(bn - lineNum))
    }
    return 0
  })
  return scored[0].m.id
}

export interface ParseResult {
  charts: ChartData[]
  /** uncharted / unrecognised items skipped, with a reason */
  rejected: { name: string; reason: string }[]
}

export function parseChartText(text: string): ParseResult {
  const items = normalizeClipboardText(text)
    .split(ITEM_START_RE)
    .map((s) => s.trim())
    .filter(Boolean)

  const charts: ChartData[] = []
  const rejected: { name: string; reason: string }[] = []

  for (const item of items) {
    const dialect = dialectForItem(item)
    const lines = item.split('\n').map((line) => line.trim())
    const nameIdx = dialect ? lines.findIndex((line) => dialect.rarity.test(line)) : -1

    // Rare chart names span two lines (rare name + base type); Magic and Normal
    // chart names occupy one line. Keep every line up to the first separator.
    const nameLineIdxs: number[] = []
    if (nameIdx >= 0) {
      for (let i = nameIdx + 1; i < lines.length && !SEPARATOR_RE.test(lines[i]); i++) {
        if (lines[i]) nameLineIdxs.push(i)
      }
    }
    const name = nameLineIdxs.length
      ? nameLineIdxs.map((index) => lines[index]).join(' ')
      : 'Unknown Chart'

    if (!dialect || !dialect.chartClass.test(item)) {
      rejected.push({ name, reason: 'not a Chart item' })
      continue
    }

    if (dialect.uncharted?.test(item)) {
      rejected.push({ name, reason: 'not charted yet (run it first to reveal its modifier)' })
      continue
    }

    // Preserve the existing fallback for malformed/older English input.
    const level = parseInt(item.match(dialect.areaLevel)?.[1] ?? '80', 10)

    const rewards: ModEffect[] = []
    for (const { re, stat } of dialect.headerStats) {
      const match = item.match(re)
      if (match) rewards.push({ stat, percent: parseInt(match[1], 10) })
    }

    const shapeMatch = item.match(dialect.shape)
    const shapeName = shapeMatch?.[1].trim() ?? ''
    if (!shapeName) {
      rejected.push({ name, reason: `missing ${dialect.shapeLabel}` })
      continue
    }
    const shape = dialect.shapes[normalizeLookupText(shapeName)]
    if (!shape) {
      rejected.push({ name, reason: `unknown ${dialect.shapeLabel}: ${shapeName}` })
      continue
    }

    // The revealed implicit is the line under the locale's modifier marker.
    // Unknown modifiers are still imported with their verbatim text preserved.
    const modIds: string[] = []
    let implicitText: string | undefined
    const implicitIdx = lines.findIndex((line) => dialect.implicitMarker.test(line))
    if (implicitIdx >= 0) {
      let implicitLine = lines[implicitIdx + 1] ?? ''
      // The TW client appends "— 無法使用的值" (unusable rolled value) to a
      // mod line when the rolled value falls outside its valid range; strip
      // it so the mod still matches its alias (TW chart corpus, 2026-08).
      implicitLine = implicitLine
        .replace(/[-—–]\s*無法使用的值\s*$/u, '')
        .replace(/[-—–]\s*无法使用的值\s*$/u, '')
        .trim()
      if (implicitLine && !SEPARATOR_RE.test(implicitLine)) {
        implicitText = implicitLine
        const id = matchImplicit(implicitLine)
        if (id) modIds.push(id)
      }
    }

    const areaLevelIdx = lines.findIndex((line) => dialect.areaLevel.test(line))
    const areaTypeLineIndexes = new Set<number>()
    for (let i = areaLevelIdx - 1; i >= 0; i--) {
      if (SEPARATOR_RE.test(lines[i])) {
        for (let j = i + 1; j < areaLevelIdx; j++) {
          if (lines[j]) areaTypeLineIndexes.add(j)
        }
        break
      }
    }
    const areaTypeText = [...areaTypeLineIndexes]
      .map((index) => lines[index])
      .join(' ')
    const areaType = chartAreaTypeForText(areaTypeText)

    // Keep explicit downside lines as raw text. Header fields, localized area
    // names and self-reward riders are structural and should not be duplicated.
    const nameLineSet = new Set(nameLineIdxs)
    const rawLines = lines.filter(
      (line, index) =>
        line &&
        !nameLineSet.has(index) &&
        !areaTypeLineIndexes.has(index) &&
        index !== implicitIdx + 1 &&
        !SEPARATOR_RE.test(line) &&
        !dialect.structural.test(line) &&
        !/^\{.*\}$/.test(line) &&
        !line.startsWith('(') &&
        !/[:：]\s*\+?\d+%/.test(line) &&
        !dialect.rewardRider.test(line) &&
        !(dialect.uncharted?.test(line) ?? false),
    )

    charts.push({
      uid: newUid(),
      name,
      clientLang: dialect.lang,
      level,
      edges: shape.edges,
      areaType,
      modIds,
      implicitText,
      rewards: rewards.length ? rewards : undefined,
      shape: shape.canonical,
      rawText: rawLines.length ? rawLines.join('\n') : undefined,
    })
  }

  return { charts, rejected }
}
