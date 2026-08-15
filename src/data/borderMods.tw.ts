import type { BORDER_MODS } from './mods'

export type TraditionalChineseBorderEvidenceSource =
  | 'poedb-datamined'
  | 'confirmed-numeric-variant'
  | 'translated-candidate'

export interface TraditionalChineseBorderModEvidence {
  text: string
  source: TraditionalChineseBorderEvidenceSource
  derivedFrom?: string
  /** Secondary client wordings that must also resolve to this border id. */
  aliases?: string[]
}

type BorderModId = (typeof BORDER_MODS)[number]['id']

/**
 * Traditional-Chinese (TW / Garena 台服) border-mod wording.
 *
 * `poedb-datamined` rows are verbatim from poedb.tw Maiden_Voyage "Deep Water
 * Border Mods /65" (2026-08, https://poedb.tw/tw/Maiden_Voyage#DeepWaterBorderMods),
 * which renders the TW client's own stat_descriptions.txt, so the sentence
 * templates are the game's real ones - unspaced or spaced OCR both resolve
 * through the space-free CJK matcher.
 *
 * `confirmed-numeric-variant` rows reuse the same rule as the Korean/CN
 * tables: when only the numeric tier changes, the poedb template stays exact.
 *
 * `translated-candidate` rows (b-octoboss alias wording, etc.) await client
 * verification; the poedb row that would confirm them is either absent from
 * the TW table (the CN table shows a count-less crab sentence there instead)
 * or phrased with keyword links that poedb strips.
 *
 * Table quirks observed on poedb (keep for future corpus checks):
 *   - The 65-row TW table has one row with an empty description (position 60
 *     after b-magicmods, before the treasure-anchor tiers) that maps to no
 *     app mod; the CN table has the same empty row.
 *   - Row ordering differs between TW and CN: the TW table's Filthscrabble
 *     row (相鄰區域內含有一個垢爪怪) sits where the CN table shows the
 *     count-less corrupted-crab sentence (相邻区域包含污秽蟹群, which the CN
 *     evidence table already maps to b-crabs-1 as an alias).
 *   - TW renders Dead Man's Sulphur as 亡者硫酸 and the b-sulphdrop border as
 *     被擊殺時會掉落亡者硫酸; CN uses 亡者硫磺 for the header but 死者硫磺
 *     on that border.
 *
 * The TW client renders these tooltips WITHOUT spaces between words, exactly
 * like the CN client, so the OCR matcher compares space-free forms.
 */
export const TRADITIONAL_CHINESE_BORDER_MOD_EVIDENCE = {
  'b-pack-1': {
    text: '增加 16% 相鄰區域的怪物群大小',
    source: 'poedb-datamined',
  },
  'b-pack-2': {
    text: '增加 24% 相鄰區域的怪物群大小',
    source: 'poedb-datamined',
  },
  'b-pack-3': {
    text: '增加 32% 相鄰區域的怪物群大小',
    source: 'poedb-datamined',
  },
  'b-minmagic': {
    text: '相鄰區域的所有怪物至少為魔法',
    source: 'poedb-datamined',
  },
  'b-rare-1': {
    text: '增加 50% 相鄰區域找到的稀有怪物數量',
    source: 'poedb-datamined',
  },
  'b-rare-2': {
    text: '增加 75% 相鄰區域找到的稀有怪物數量',
    source: 'poedb-datamined',
  },
  'b-rare-3': {
    text: '增加 100% 相鄰區域找到的稀有怪物數量',
    source: 'poedb-datamined',
  },
  'b-beasts-1': {
    text: '相鄰區域內含有額外8群海洋野獸',
    source: 'poedb-datamined',
  },
  'b-beasts-2': {
    text: '相鄰區域內含有額外12群海洋野獸',
    source: 'poedb-datamined',
  },
  'b-beasts-3': {
    text: '相鄰區域內含有額外16群海洋野獸',
    source: 'poedb-datamined',
  },
  'b-crabs-1': {
    text: '相鄰區域內含有額外8群螃蟹',
    source: 'poedb-datamined',
  },
  'b-crabs-2': {
    text: '相鄰區域內含有額外12群螃蟹',
    source: 'poedb-datamined',
  },
  'b-crabs-3': {
    text: '相鄰區域內含有額外16群螃蟹',
    source: 'poedb-datamined',
  },
  'b-drowned-1': {
    text: '相鄰區域內含有額外8群浮屍',
    source: 'poedb-datamined',
  },
  'b-drowned-2': {
    text: '相鄰區域內含有額外12群浮屍',
    source: 'poedb-datamined',
  },
  'b-drowned-3': {
    text: '相鄰區域內含有額外16群浮屍',
    source: 'poedb-datamined',
  },
  'b-mag-1': {
    text: '相鄰區域增加 40% 固定詞綴幅度',
    source: 'poedb-datamined',
  },
  'b-mag-2': {
    text: '相鄰區域增加 60% 固定詞綴幅度',
    source: 'poedb-datamined',
  },
  'b-mag-3': {
    text: '相鄰區域增加 80% 固定詞綴幅度',
    source: 'poedb-datamined',
  },
  'b-keep-1': {
    text: '相鄰海圖在啟航時有 30% 機率不會被消耗',
    source: 'poedb-datamined',
  },
  'b-keep-2': {
    text: '相鄰海圖在啟航時有 50% 機率不會被消耗',
    source: 'poedb-datamined',
  },
  'b-octoboss': {
    text: '相鄰區域內含有一個垢爪怪',
    source: 'poedb-datamined',
  },
  'b-lanterns': {
    text: '在相鄰區域放置燈籠時不會減少你的燈籠數量',
    source: 'poedb-datamined',
  },
  'b-ancient': {
    text: '相鄰區域內的稀有怪物掉落額外 1 個古變石',
    source: 'poedb-datamined',
  },
  'b-divine': {
    text: '相鄰區域內的稀有怪物掉落額外 1 個神聖石',
    source: 'poedb-datamined',
  },
  'b-exalt': {
    text: '相鄰區域內的稀有怪物掉落額外 1 個崇高石',
    source: 'poedb-datamined',
  },
  'b-annul': {
    text: '相鄰區域內的稀有怪物掉落額外 1 個無效石',
    source: 'poedb-datamined',
  },
  'b-chaos': {
    text: '相鄰區域內的稀有怪物掉落額外 1 個混沌石',
    source: 'poedb-datamined',
  },
  'b-vaal': {
    text: '相鄰區域內的稀有怪物掉落額外 1 個瓦爾寶珠',
    source: 'poedb-datamined',
  },
  'b-gcp': {
    text: '相鄰區域內的稀有怪物掉落額外 1 個寶石匠的稜鏡',
    source: 'poedb-datamined',
  },
  'b-chrome': {
    text: '相鄰區域內的稀有怪物掉落額外 1 個幻色石',
    source: 'poedb-datamined',
  },
  'b-regret': {
    text: '相鄰區域內的稀有怪物掉落額外 1 個後悔石',
    source: 'poedb-datamined',
  },
  'b-blessed': {
    text: '相鄰區域內的稀有怪物掉落額外 1 個祝福石',
    source: 'poedb-datamined',
  },
  'b-regal': {
    text: '相鄰區域內的稀有怪物掉落額外 1 個富豪石',
    source: 'poedb-datamined',
  },
  'b-support': {
    text: '相鄰區域內的稀有怪物有 20% 機率掉落一個輔助寶石',
    source: 'poedb-datamined',
  },
  'b-locker': {
    text: '相鄰區域內含有一個失落的海盜鎖櫃',
    source: 'poedb-datamined',
  },
  'b-pirates': {
    text: '相鄰區域內含有一個布琳洛特洗劫團夥',
    source: 'poedb-datamined',
  },
  'b-rareconn-1': {
    text: '相鄰區域每與一個區域相連，即增加 50% 稀有怪物數量',
    source: 'poedb-datamined',
  },
  'b-rareconn-2': {
    text: '相鄰區域每與一個區域相連，即增加 75% 稀有怪物數量',
    source: 'poedb-datamined',
  },
  'b-quantconn-1': {
    text: '相鄰區域每與一個區域相連，即減少 50% 找到的物品數量\n增加 120% 相鄰區域找到的物品數量',
    source: 'poedb-datamined',
  },
  'b-quantconn-2': {
    text: '相鄰區域每與一個區域相連，即減少 50% 找到的物品數量\n增加 180% 相鄰區域找到的物品數量',
    source: 'poedb-datamined',
  },
  'b-gold-1': {
    text: '相鄰區域內的怪物掉落的裝備有 25% 會改為掉落金幣',
    source: 'poedb-datamined',
  },
  'b-gold-2': {
    text: '相鄰區域內的怪物掉落的裝備有 50% 會改為掉落金幣',
    source: 'poedb-datamined',
  },
  'b-decks': {
    text: '相鄰區域內怪物所掉落的基礎通貨會改為豐裕牌組',
    source: 'poedb-datamined',
  },
  'b-scarabdrop': {
    text: '相鄰區域內的稀有怪物掉落額外 1 個聖甲蟲',
    source: 'poedb-datamined',
  },
  'b-curr-1': {
    text: '相鄰區域內找到 50% 更多通貨',
    source: 'poedb-datamined',
  },
  'b-curr-2': {
    text: '相鄰區域內找到 75% 更多通貨',
    source: 'poedb-datamined',
  },
  'b-curr-3': {
    text: '相鄰區域內找到 100% 更多通貨',
    source: 'poedb-datamined',
  },
  'b-scarab-1': {
    text: '相鄰區域內找到 50% 更多聖甲蟲',
    source: 'poedb-datamined',
  },
  'b-scarab-2': {
    text: '相鄰區域內找到 75% 更多聖甲蟲',
    source: 'poedb-datamined',
  },
  'b-scarab-3': {
    text: '相鄰區域內找到 100% 更多聖甲蟲',
    source: 'poedb-datamined',
  },
  'b-rarity-1': {
    text: '相鄰區域有 50% 更多找到的物品稀有度',
    source: 'poedb-datamined',
  },
  'b-rarity-2': {
    text: '相鄰區域有 75% 更多找到的物品稀有度',
    source: 'poedb-datamined',
  },
  'b-rarity-3': {
    text: '相鄰區域有 100% 更多找到的物品稀有度',
    source: 'poedb-datamined',
  },
  'b-crabboss': {
    text: '相鄰區域內含有一個船長之災',
    source: 'poedb-datamined',
  },
  'b-exp-1': {
    text: '相鄰區域內的玩家增加 100% 獲取的經驗值',
    source: 'poedb-datamined',
  },
  'b-exp-2': {
    text: '相鄰區域內的玩家增加 150% 獲取的經驗值',
    source: 'poedb-datamined',
  },
  'b-exp-3': {
    text: '相鄰區域內的玩家增加 200% 獲取的經驗值',
    source: 'poedb-datamined',
  },
  'b-magicmods': {
    text: '相鄰區域內的魔法怪物額外擁有一條詞綴',
    source: 'poedb-datamined',
  },
  'b-anchor-1': {
    text: '相鄰區域內含有額外 2 個寶藏船錨',
    source: 'poedb-datamined',
  },
  'b-anchor-2': {
    text: '相鄰區域內含有額外 4 個寶藏船錨',
    source: 'poedb-datamined',
  },
  'b-sulphdrop': {
    text: '相鄰區域內的稀有怪物被擊殺時會掉落亡者硫酸',
    source: 'poedb-datamined',
  },
  'b-goldlantern': {
    text: '相鄰區域內含有額外 4 個黃金燈籠',
    source: 'poedb-datamined',
  },
  'b-izaro': {
    text: '相鄰區域內含有 2 座女神的祭壇',
    source: 'poedb-datamined',
  },
} as const satisfies Partial<Record<BorderModId, TraditionalChineseBorderModEvidence>>
