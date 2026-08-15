import { BORDER_MODS } from '../data/mods'
import { KOREAN_BORDER_MOD_EVIDENCE } from '../data/borderMods.ko'
import type { TraditionalChineseBorderModEvidence } from '../data/borderMods.tw'
import { TRADITIONAL_CHINESE_BORDER_MOD_EVIDENCE } from '../data/borderMods.tw'
import type { ChineseBorderModEvidence } from '../data/borderMods.zh'
import { CHINESE_BORDER_MOD_EVIDENCE } from '../data/borderMods.zh'
import type { Borders } from '../types'
import { emptyBorders } from '../types'

const BORDER_BLOCK =
  /===\s*VOYAGE BORDER\s+(\d{1,2})\s*===\s*([\s\S]*?)===\s*END VOYAGE BORDER\s*===/gi

const normalize = (text: string): string =>
  text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[’`]/g, "'")
    // Korean client text joins counters to their number (for example `8개`).
    // Split letter/number boundaries so the numeric-tier guard below can
    // still distinguish otherwise identical border tiers.
    .replace(/(\p{L})(\p{N})/gu, '$1 $2')
    .replace(/(\p{N})(\p{L})/gu, '$1 $2')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    // the game writes "drop an additional Scarab" where datamined lists say
    // "drop 1 additional Scarabs" - treat the article as the numeral so the
    // numeric-tier guard doesn't reject the singular wording
    .replace(/\ban\b/g, '1')

interface BorderMatchVariant {
  id: string
  canonicalText: string
  matchText: string
}

const borderMatchVariants: BorderMatchVariant[] = BORDER_MODS.flatMap((mod) => {
  const korean = KOREAN_BORDER_MOD_EVIDENCE[mod.id as keyof typeof KOREAN_BORDER_MOD_EVIDENCE]
  const chinese = CHINESE_BORDER_MOD_EVIDENCE[
    mod.id as keyof typeof CHINESE_BORDER_MOD_EVIDENCE
  ] as ChineseBorderModEvidence | undefined
  const traditional = TRADITIONAL_CHINESE_BORDER_MOD_EVIDENCE[
    mod.id as keyof typeof TRADITIONAL_CHINESE_BORDER_MOD_EVIDENCE
  ] as TraditionalChineseBorderModEvidence | undefined
  const chineseAliases: readonly string[] = chinese?.aliases ?? []
  const traditionalAliases: readonly string[] = traditional?.aliases ?? []
  return [
    { id: mod.id, canonicalText: mod.text, matchText: mod.text },
    ...(mod.aliases ?? []).map((matchText) => ({
      id: mod.id,
      canonicalText: mod.text,
      matchText,
    })),
    ...(korean
      ? [{ id: mod.id, canonicalText: mod.text, matchText: korean.text }]
      : []),
    ...(chinese
      ? [
          { id: mod.id, canonicalText: mod.text, matchText: chinese.text },
          ...chineseAliases.map((matchText) => ({
            id: mod.id,
            canonicalText: mod.text,
            matchText,
          })),
        ]
      : []),
    ...(traditional
      ? [
          { id: mod.id, canonicalText: mod.text, matchText: traditional.text },
          ...traditionalAliases.map((matchText) => ({
            id: mod.id,
            canonicalText: mod.text,
            matchText,
          })),
        ]
      : []),
  ]
})

const borderTokenFrequency = new Map<string, number>()
for (const variant of borderMatchVariants) {
  const uniqueTokens = new Set(normalize(variant.matchText).split(' ').filter(Boolean))
  for (const token of uniqueTokens) {
    borderTokenFrequency.set(token, (borderTokenFrequency.get(token) ?? 0) + 1)
  }
}

function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 99
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const next = [i]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      next[j] = Math.min(next[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
    }
    prev = next
  }
  return prev[b.length]
}

function tokenMatches(expected: string, actual: string): boolean {
  if (expected === actual) return true
  if (/^\d+$/.test(expected) || /^\d+$/.test(actual)) return false
  const korean = /[\u3131-\u318e\uac00-\ud7a3]/u
  if (korean.test(expected) || korean.test(actual)) {
    if (expected.length < 2 || actual.length < 2) return false
    const allowance = expected.length >= 6 ? 2 : 1
    return editDistance(expected, actual) <= allowance
  }
  if (expected.length < 5 || actual.length < 5) return false
  const allowance = expected.length >= 9 ? 2 : 1
  return editDistance(expected, actual) <= allowance
}

function signatureToken(token: string): boolean {
  if (/^\d+$/.test(token)) return false
  const isKorean = /[\u3131-\u318e\uac00-\ud7a3]/u.test(token)
  // One-syllable Korean nouns such as `게` (Crab) are highly distinctive.
  // Keep them as exact-only signatures; tokenMatches deliberately does not
  // fuzzy-match Korean tokens shorter than two syllables.
  return token.length >= (isKorean ? 1 : 4)
}

function candidateLines(raw: string): string[] {
  const lines = raw
    .split(/\r?\n/)
    .map(normalize)
    .filter(Boolean)
  const candidates = new Set(lines)
  for (let i = 0; i < lines.length; i++) {
    if (i + 1 < lines.length) candidates.add(`${lines[i]} ${lines[i + 1]}`)
    if (i + 2 < lines.length) candidates.add(`${lines[i]} ${lines[i + 1]} ${lines[i + 2]}`)
  }
  if (lines.length === 0) {
    const whole = normalize(raw)
    if (whole) candidates.add(whole)
  }
  return [...candidates]
}

interface Match {
  id: string
  text: string
  confidence: number
  exact: boolean
  /** Scored through the CJK (keyword + bigram similarity) path. */
  cjk?: boolean
}

// ---------------------------------------------------------------------------
// Simplified-Chinese matching. The CN client renders tooltips without spaces
// between words, so the token-per-space machinery above cannot apply. We match
// in a space-free canonical form using a keyword gate (a distinctive Han
// bigram must appear) plus a bigram/unigram Dice similarity, with the same
// numeric-tier guard as the word-based path.
// ---------------------------------------------------------------------------

const HAN_RE = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/

/** CJK canonical form: NFKC + lowercase; keep Han, a-z, 0-9 only. Removing all
 * whitespace absorbs both the unspaced client text and poedb's spaced
 * rendering into one comparable form. Han numerals are folded to digits so
 * 掉落一个额外崇高石 and 掉落1个额外崇高石 compare identically (the client
 * writes counters with 一个/两个, the poedb form with 1 个). */
function cjkNormalize(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/零/g, '0')
    .replace(/一/g, '1')
    .replace(/二|两/g, '2')
    .replace(/三/g, '3')
    .replace(/四/g, '4')
    .replace(/五/g, '5')
    .replace(/六/g, '6')
    .replace(/七/g, '7')
    .replace(/八/g, '8')
    .replace(/九/g, '9')
    .replace(/[^a-z0-9\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]+/gu, '')
}

/** Tokenize a CJK-normalized string: overlapping Han bigrams, Latin words and
 * digit runs. Set-based bigrams make similarity robust to word-order and
 * measure-word differences between candidate phrasing and the real client. */
function cjkTokens(text: string): string[] {
  const out: string[] = []
  let latin = ''
  let digits = ''
  const han: string[] = []
  const flushLatin = () => {
    if (latin) out.push(latin)
    latin = ''
  }
  const flushDigits = () => {
    if (digits) out.push(digits)
    digits = ''
  }
  const flushHan = () => {
    for (let i = 0; i + 1 < han.length; i++) out.push(han[i] + han[i + 1])
    han.length = 0
  }
  for (const ch of text) {
    if (/[a-z]/.test(ch)) {
      flushDigits()
      flushHan()
      latin += ch
    } else if (/\d/.test(ch)) {
      flushLatin()
      flushHan()
      digits += ch
    } else if (HAN_RE.test(ch)) {
      flushLatin()
      flushDigits()
      han.push(ch)
    } else {
      flushLatin()
      flushDigits()
      flushHan()
    }
  }
  flushLatin()
  flushDigits()
  flushHan()
  return out
}

/** How often each Han bigram appears across all Chinese border evidence texts.
 * Bigrams seen at most three times (same cutoff spirit as the word-path
 * signature tokens) are distinctive enough to act as a keyword gate. */
const cjkBigramFrequency = new Map<string, number>()
for (const variant of borderMatchVariants) {
  if (!HAN_RE.test(variant.matchText)) continue
  const seen = new Set(cjkTokens(cjkNormalize(variant.matchText)))
  for (const token of seen) {
    if (HAN_RE.test(token)) {
      cjkBigramFrequency.set(token, (cjkBigramFrequency.get(token) ?? 0) + 1)
    }
  }
}

/** Variant-level frequency inflates bigrams shared across sibling tiers or
 * other families (量提 from 数量提高 appears in b-rare-1/2/3 and both
 * b-quantconn tiers; 有怪/稀有 are shared with the currency-drop family).
 * Count instead per distinct sentence template (digits stripped), so a
 * bigram confined to at most two families is still a usable keyword. */
const cjkFamilyFrequency = new Map<string, number>()
const cjkFamilies = new Set<string>()
for (const variant of borderMatchVariants) {
  if (!HAN_RE.test(variant.matchText)) continue
  cjkFamilies.add(cjkNormalize(variant.matchText).replace(/\d+/g, ''))
}
for (const familyKey of cjkFamilies) {
  const seen = new Set(cjkTokens(familyKey))
  for (const token of seen) {
    if (HAN_RE.test(token)) {
      cjkFamilyFrequency.set(token, (cjkFamilyFrequency.get(token) ?? 0) + 1)
    }
  }
}

const isDigitToken = (t: string) => /^\d+$/.test(t)

/** Multiset Dice over the Han characters of a CJK-normalized string. */
function hanUnigramDice(a: string, b: string): number {
  const aHan = a.replace(/[a-z0-9]/g, '')
  const bHan = b.replace(/[a-z0-9]/g, '')
  if (aHan.length === 0 || bHan.length === 0) return 0
  const count = (s: string) => {
    const m = new Map<string, number>()
    for (const ch of s) m.set(ch, (m.get(ch) ?? 0) + 1)
    return m
  }
  const aCount = count(aHan)
  const bCount = count(bHan)
  let shared = 0
  for (const [ch, n] of aCount) shared += Math.min(n, bCount.get(ch) ?? 0)
  return (2 * shared) / (aHan.length + bHan.length)
}

/** Keyword + similarity score for a Chinese tooltip against one expected
 * variant. Returns 0 when the candidate shares no distinctive keyword. */
function cjkSimilarity(expected: string, actual: string): number {
  const eTokens = cjkTokens(expected)
  const aTokens = cjkTokens(actual)
  if (eTokens.length === 0 || aTokens.length === 0) return 0

  // Keyword gate: the candidate must share at least one distinctive Han
  // bigram of the expected text (e.g. 黄金/灯笼, 秽物/攀行, 通货/圣甲虫),
  // which keeps 通货总增 and 圣甲虫总增 from cross-matching each other.
  // Two tiers: a bigram seen in at most three variants is a strong keyword;
  // families whose distinctive bigrams are inflated by sibling tiers
  // (相邻区域的稀有怪数量提高X% vs b-rareconn/b-quantconn) fall back to a
  // family-level check (at most two distinct sentence templates) and pay a
  // small confidence penalty. Candidates sharing no keyword are rejected.
  const sharedKeywords = eTokens.filter((t) => HAN_RE.test(t) && aTokens.includes(t))
  const strongKeyword = sharedKeywords.some(
    (t) => (cjkBigramFrequency.get(t) ?? 99) <= 3,
  )
  if (
    !strongKeyword &&
    !sharedKeywords.some((t) => (cjkFamilyFrequency.get(t) ?? 99) <= 2)
  ) {
    return 0
  }

  const eSet = new Set(eTokens.filter((t) => !isDigitToken(t)))
  const aSet = new Set(aTokens.filter((t) => !isDigitToken(t)))
  let sharedBigram = 0
  for (const t of eSet) if (aSet.has(t)) sharedBigram++
  const bigramDice = eSet.size + aSet.size === 0 ? 0 : (2 * sharedBigram) / (eSet.size + aSet.size)
  const unigramDice = hanUnigramDice(expected, actual)
  let confidence = 0.6 * bigramDice + 0.4 * unigramDice

  // Family-tier keywords are weaker than variant-distinctive ones, so they
  // pay a small confidence penalty (same spirit as the numeric-tier guard).
  if (!strongKeyword) confidence *= 0.9

  // Tier guard (same philosophy as the word path): never guess a tier number
  // the OCR did not read from the same tooltip line.
  const eNums = eTokens.filter(isDigitToken)
  const aNums = aTokens.filter(isDigitToken)
  if (eNums.length > 0 && !eNums.every((n) => aNums.includes(n))) confidence *= 0.6
  return confidence
}

function matchBorder(raw: string): Match | null {
  const candidates = candidateLines(raw)
  if (candidates.length === 0) return null

  // Space-free candidate forms for the Chinese path.
  const cjkCandidates = [
    ...new Set(candidates.map((candidate) => cjkNormalize(candidate))),
  ].filter((candidate) => HAN_RE.test(candidate))

  const scored = borderMatchVariants.flatMap((variant) => {
    const expected = normalize(variant.matchText)
    const expectedTokens = expected.split(' ')
    const expectedNumbers = expectedTokens.filter((token) => /^\d+$/.test(token))

    if (HAN_RE.test(variant.matchText)) {
      // CJK path: keyword + bigram similarity over space-free forms.
      const expectedCjk = cjkNormalize(variant.matchText)
      return cjkCandidates.map((candidate) => {
        const exact = candidate === expectedCjk
        return {
          id: variant.id,
          text: variant.canonicalText,
          confidence: exact ? 1 : cjkSimilarity(expectedCjk, candidate),
          exact,
          cjk: true,
        }
      })
    }

    return candidates.map((candidate) => {
      const exact = candidate === expected
      if (exact) {
        return {
          id: variant.id,
          text: variant.canonicalText,
          confidence: 1,
          exact,
          cjk: false,
        }
      }

      const actualTokens = candidate.split(' ')
      const signatureTokens = expectedTokens.filter(
        (token) =>
          signatureToken(token) &&
          (borderTokenFrequency.get(token) ?? 0) <= 3,
      )
      const hasSignatureMatch =
        signatureTokens.length === 0 ||
        signatureTokens.some((token) =>
          actualTokens.some((actual) => tokenMatches(token, actual)),
        )
      if (!hasSignatureMatch) {
        return {
          id: variant.id,
          text: variant.canonicalText,
          confidence: 0,
          exact,
          cjk: false,
        }
      }

      const matchedExpected = expectedTokens.filter((token) =>
        actualTokens.some((actual) => tokenMatches(token, actual)),
      ).length
      const matchedActual = actualTokens.filter((token) =>
        expectedTokens.some((expectedToken) => tokenMatches(expectedToken, token)),
      ).length
      const recall = matchedExpected / expectedTokens.length
      const precision = matchedActual / actualTokens.length
      let confidence =
        recall + precision === 0 ? 0 : (2 * recall * precision) / (recall + precision)

      // Tiers often differ only by a number. Never guess a tier when OCR did
      // not read that number from the same tooltip line.
      if (
        expectedNumbers.length > 0 &&
        !expectedNumbers.every((number) => actualTokens.includes(number))
      ) {
        confidence *= 0.6
      }
      return {
        id: variant.id,
        text: variant.canonicalText,
        confidence,
        exact,
        cjk: false,
      }
    })
  })

  scored.sort(
    (a, b) => Number(b.exact) - Number(a.exact) || b.confidence - a.confidence,
  )
  const best = scored[0]
  const runnerUp = scored.find((item) => item.id !== best.id)
  // The CJK translations are unverified candidates against an unspaced OCR
  // source, so their similarity scores run lower than word-level matches.
  const confidenceFloor = best.cjk ? 0.62 : 0.72
  if (best.confidence < confidenceFloor) return null
  if (!best.exact && runnerUp && best.confidence - runnerUp.confidence < 0.04) return null
  return best
}

export interface BorderOcrMatch {
  index: number
  id: string
  text: string
  confidence: number
}

export interface BorderOcrMiss {
  index: number
  raw: string
}

export interface BorderOcrParseResult {
  /** Clipboard payload with OCR blocks removed, ready for the chart parser. */
  chartText: string
  /** Only recognized positions are populated. */
  borders: Borders
  matches: BorderOcrMatch[]
  misses: BorderOcrMiss[]
  blockCount: number
}

export function parseBorderOcrPayload(source: string): BorderOcrParseResult {
  const borders = emptyBorders()
  const matches: BorderOcrMatch[] = []
  const misses: BorderOcrMiss[] = []
  let blockCount = 0

  const chartText = source.replace(BORDER_BLOCK, (_block, indexText: string, raw: string) => {
    blockCount++
    const index = Number.parseInt(indexText, 10)
    if (index < 0 || index >= 12) return '\n'

    const match = matchBorder(raw)
    if (match) {
      borders[index] = match.id
      matches.push({ index, ...match })
    } else {
      misses.push({ index, raw: raw.trim() })
    }
    return '\n'
  })

  return { chartText, borders, matches, misses, blockCount }
}
