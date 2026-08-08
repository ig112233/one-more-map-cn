import type { BORDER_MODS } from './mods'

export type ChineseBorderEvidenceSource =
  | 'client-screenshot'
  | 'confirmed-numeric-variant'
  | 'translated-candidate'

export interface ChineseBorderModEvidence {
  text: string
  source: ChineseBorderEvidenceSource
  derivedFrom?: string
  /** Secondary client wordings that must also resolve to this border id.
   * Used where two client renditions of the same mod coexist (e.g. the
   * 稀有怪/稀有怪物 rare-count variants, or the count-less 污秽蟹群
   * crab sentence). Every alias is matched through the same CJK matcher. */
  aliases?: string[]
}

type BorderModId = (typeof BORDER_MODS)[number]['id']

/**
 * Simplified-Chinese border-mod wording.
 *
 * `client-screenshot` rows are verbatim from a real CN-client corpus (2026-08,
 * provided by a CN player): border tooltips copied from the Voyage Board plus
 * chart Ctrl+C copies.
 *
 * `confirmed-numeric-variant` rows use the same rule as the Korean table: when
 * only the numeric tier changes, the player-confirmed sentence template stays
 * exact (e.g. 相邻区域的怪物群规模提高 X%).
 *
 * `translated-candidate` rows are AI/manual translations from the canonical
 * English, aligned to the sentence patterns confirmed by the corpus below;
 * they still await client verification.
 *
 * Confirmed CN-client sentence patterns (from the corpus):
 *   - 相邻区域的X提高Y%            (b-pack-2, b-mag-1)
 *   - 相邻区域的稀有怪数量提高Y%    (b-rare-1, player-verified 2026-08; the
 *                                    b-rareconn wording 稀有怪物数量 is a
 *                                    different mod, do not copy it here. The
 *                                    怪物 form 相邻区域的稀有怪物数量提高Y%
 *                                    still resolves via the fuzzy CJK path but
 *                                    is deliberately NOT an alias row, to keep
 *                                    the 的/中 b-rare vs b-rareconn split)
 *   - 相邻区域的稀有怪物掉落一个额外X (b-exalt/b-divine/b-scarabdrop,
 *                                    player-reported 2026-08 verbatim client
 *                                    wording; the older 额外掉落 1 个X form is
 *                                    kept as an alias)
 *   - 相邻区域包含污秽蟹群          (b-crabs-1 alias, player-reported 2026-08:
 *                                    the count-less Corrupted-Crab sentence the
 *                                    client shows for the crab-pack border)
 *   - 相邻区域中找到的X总增Y%       (b-curr-2)
 *   - 相邻区域包括Y个额外的X        (b-crabs-1)
 *   - 相邻区域中X按每条连接提高Y%   (b-rareconn-2)
 *   - 相邻区域内的玩家获得的X提高Y% (b-exp-1)
 *   - 相邻海图在开始航行时有Y%的几率不被消耗 (b-keep-1)
 *   - 相邻区域包含一个X            (b-locker)
 *
 * Still unverified (may drift from the client): the rest of the currency-drop
 * family (b-ancient…b-chaos/b-vaal/b-gcp/b-chrome/b-regret/b-blessed/b-regal,
 * b-support), b-izaro/b-anchor measure words, b-decks/b-pirates/b-magicmods/
 * b-minmagic/b-octoboss/b-crabboss/b-sulphdrop. The verified 掉落一个额外X
 * template most likely carries across that family.
 *
 * Note the CN client renders these tooltips WITHOUT spaces between words
 * (相邻区域中找到的通货总增75%), so the OCR matcher compares space-free forms.
 */
export const CHINESE_BORDER_MOD_EVIDENCE = {
  'b-pack-1': {
    text: '相邻区域的怪物群规模提高16%',
    source: 'confirmed-numeric-variant',
    derivedFrom: 'b-pack-2',
  },
  'b-pack-2': {
    text: '相邻区域的怪物群规模提高24%',
    source: 'client-screenshot',
  },
  'b-pack-3': {
    text: '相邻区域的怪物群规模提高32%',
    source: 'confirmed-numeric-variant',
    derivedFrom: 'b-pack-2',
  },
  'b-minmagic': {
    text: '相邻区域的怪物至少为魔法',
    source: 'translated-candidate',
  },
  'b-rare-1': {
    text: '相邻区域的稀有怪数量提高50%',
    source: 'client-screenshot',
  },
  'b-rare-2': {
    text: '相邻区域的稀有怪数量提高75%',
    source: 'confirmed-numeric-variant',
    derivedFrom: 'b-rare-1',
  },
  'b-rare-3': {
    text: '相邻区域的稀有怪数量提高100%',
    source: 'confirmed-numeric-variant',
    derivedFrom: 'b-rare-1',
  },
  'b-beasts-1': {
    text: '相邻区域包括8个额外的海兽群',
    source: 'translated-candidate',
  },
  'b-beasts-2': {
    text: '相邻区域包括12个额外的海兽群',
    source: 'translated-candidate',
    derivedFrom: 'b-beasts-1',
  },
  'b-beasts-3': {
    text: '相邻区域包括16个额外的海兽群',
    source: 'translated-candidate',
    derivedFrom: 'b-beasts-1',
  },
  'b-crabs-1': {
    text: '相邻区域包括8个额外的螃蟹群',
    source: 'client-screenshot',
    // The client also shows the count-less 污秽蟹群 (Corrupted Crab packs)
    // sentence for the crab-pack border mod (player-reported 2026-08). No
    // count survives OCR, so the tier cannot be known; the matcher resolves
    // it to the base tier like the other count-less unique sentences.
    aliases: ['相邻区域包含污秽蟹群'],
  },
  'b-crabs-2': {
    text: '相邻区域包括12个额外的螃蟹群',
    source: 'confirmed-numeric-variant',
    derivedFrom: 'b-crabs-1',
  },
  'b-crabs-3': {
    text: '相邻区域包括16个额外的螃蟹群',
    source: 'confirmed-numeric-variant',
    derivedFrom: 'b-crabs-1',
  },
  'b-drowned-1': {
    text: '相邻区域包括8个额外的溺亡者群',
    source: 'translated-candidate',
  },
  'b-drowned-2': {
    text: '相邻区域包括12个额外的溺亡者群',
    source: 'translated-candidate',
    derivedFrom: 'b-drowned-1',
  },
  'b-drowned-3': {
    text: '相邻区域包括16个额外的溺亡者群',
    source: 'translated-candidate',
    derivedFrom: 'b-drowned-1',
  },
  'b-mag-1': {
    text: '相邻区域的词缀数值提高40%',
    source: 'client-screenshot',
  },
  'b-mag-2': {
    text: '相邻区域的词缀数值提高60%',
    source: 'confirmed-numeric-variant',
    derivedFrom: 'b-mag-1',
  },
  'b-mag-3': {
    text: '相邻区域的词缀数值提高80%',
    source: 'confirmed-numeric-variant',
    derivedFrom: 'b-mag-1',
  },
  'b-keep-1': {
    text: '相邻海图在开始航行时有30%的几率不被消耗',
    source: 'client-screenshot',
  },
  'b-keep-2': {
    text: '相邻海图在开始航行时有50%的几率不被消耗',
    source: 'confirmed-numeric-variant',
    derivedFrom: 'b-keep-1',
  },
  'b-octoboss': {
    text: '相邻区域包含秽物攀行者',
    source: 'translated-candidate',
  },
  'b-lanterns': {
    text: '在相邻区域放置灯笼不会减少你的灯笼数量',
    source: 'client-screenshot',
  },
  'b-ancient': {
    text: '相邻区域的稀有怪物额外掉落 1 个远古石',
    source: 'translated-candidate',
  },
  'b-divine': {
    text: '相邻区域的稀有怪物掉落一个额外神圣石',
    source: 'client-screenshot',
    aliases: ['相邻区域的稀有怪物额外掉落 1 个神圣石'],
  },
  'b-exalt': {
    // Player-reported client wording (2026-08): 掉落一个额外崇高石. The old
    // translated form 额外掉落 1 个崇高石 is kept as an alias for imports
    // made before the wording was confirmed.
    text: '相邻区域的稀有怪物掉落一个额外崇高石',
    source: 'client-screenshot',
    aliases: ['相邻区域的稀有怪物额外掉落 1 个崇高石'],
  },
  'b-annul': {
    text: '相邻区域的稀有怪物额外掉落 1 个剥离石',
    source: 'translated-candidate',
  },
  'b-chaos': {
    text: '相邻区域的稀有怪物额外掉落 1 个混沌石',
    source: 'translated-candidate',
  },
  'b-vaal': {
    text: '相邻区域的稀有怪物额外掉落 1 个瓦尔宝珠',
    source: 'translated-candidate',
  },
  'b-gcp': {
    text: '相邻区域的稀有怪物额外掉落 1 个宝石匠棱镜',
    source: 'translated-candidate',
  },
  'b-chrome': {
    text: '相邻区域的稀有怪物额外掉落 1 个幻色石',
    source: 'translated-candidate',
  },
  'b-regret': {
    text: '相邻区域的稀有怪物额外掉落 1 个后悔石',
    source: 'translated-candidate',
  },
  'b-blessed': {
    text: '相邻区域的稀有怪物额外掉落 1 个祝福石',
    source: 'translated-candidate',
  },
  'b-regal': {
    text: '相邻区域的稀有怪物额外掉落 1 个富豪石',
    source: 'translated-candidate',
  },
  'b-support': {
    text: '相邻区域的稀有怪物有 20% 的几率掉落辅助宝石',
    source: 'translated-candidate',
  },
  'b-locker': {
    text: '相邻区域包含一个失落的海贼储物箱',
    source: 'client-screenshot',
  },
  'b-pirates': {
    text: '相邻区域包含一支咸腐掠夺队',
    source: 'translated-candidate',
  },
  'b-rareconn-1': {
    text: '相邻区域中稀有怪物数量按每条连接提高50%',
    source: 'confirmed-numeric-variant',
    derivedFrom: 'b-rareconn-2',
  },
  'b-rareconn-2': {
    text: '相邻区域中稀有怪物数量按每条连接提高75%',
    source: 'client-screenshot',
  },
  'b-quantconn-1': {
    text: '相邻区域发现的物品数量按每条连接降低50%\n相邻区域发现的物品数量提高120%',
    source: 'translated-candidate',
  },
  'b-quantconn-2': {
    text: '相邻区域发现的物品数量按每条连接降低50%\n相邻区域发现的物品数量提高180%',
    source: 'translated-candidate',
    derivedFrom: 'b-quantconn-1',
  },
  'b-gold-1': {
    text: '相邻区域怪物掉落装备的25%转化为金币',
    source: 'translated-candidate',
  },
  'b-gold-2': {
    text: '相邻区域怪物掉落装备的50%转化为金币',
    source: 'translated-candidate',
    derivedFrom: 'b-gold-1',
  },
  'b-decks': {
    text: '相邻区域怪物掉落的基础通货将改为掉落堆叠卡组',
    source: 'translated-candidate',
  },
  'b-scarabdrop': {
    text: '相邻区域的稀有怪物掉落一个额外圣甲虫',
    source: 'client-screenshot',
    aliases: ['相邻区域的稀有怪物额外掉落 1 个圣甲虫'],
  },
  'b-curr-1': {
    text: '相邻区域中找到的通货总增50%',
    source: 'confirmed-numeric-variant',
    derivedFrom: 'b-curr-2',
  },
  'b-curr-2': {
    text: '相邻区域中找到的通货总增75%',
    source: 'client-screenshot',
  },
  'b-curr-3': {
    text: '相邻区域中找到的通货总增100%',
    source: 'confirmed-numeric-variant',
    derivedFrom: 'b-curr-2',
  },
  'b-scarab-1': {
    text: '相邻区域中找到的圣甲虫总增50%',
    source: 'translated-candidate',
  },
  'b-scarab-2': {
    text: '相邻区域中找到的圣甲虫总增75%',
    source: 'translated-candidate',
    derivedFrom: 'b-scarab-1',
  },
  'b-scarab-3': {
    text: '相邻区域中找到的圣甲虫总增100%',
    source: 'translated-candidate',
    derivedFrom: 'b-scarab-1',
  },
  'b-rarity-1': {
    text: '相邻区域中找到的物品稀有度总增50%',
    source: 'translated-candidate',
  },
  'b-rarity-2': {
    text: '相邻区域中找到的物品稀有度总增75%',
    source: 'translated-candidate',
    derivedFrom: 'b-rarity-1',
  },
  'b-rarity-3': {
    text: '相邻区域中找到的物品稀有度总增100%',
    source: 'translated-candidate',
    derivedFrom: 'b-rarity-1',
  },
  'b-crabboss': {
    text: '相邻区域包含船长灾星',
    source: 'translated-candidate',
  },
  'b-exp-1': {
    text: '相邻区域内的玩家获得的经验值提高100%',
    source: 'client-screenshot',
  },
  'b-exp-2': {
    text: '相邻区域内的玩家获得的经验值提高150%',
    source: 'confirmed-numeric-variant',
    derivedFrom: 'b-exp-1',
  },
  'b-exp-3': {
    text: '相邻区域内的玩家获得的经验值提高200%',
    source: 'confirmed-numeric-variant',
    derivedFrom: 'b-exp-1',
  },
  'b-magicmods': {
    text: '相邻区域的魔法怪物拥有 1 个额外词缀',
    source: 'translated-candidate',
  },
  'b-anchor-1': {
    text: '相邻区域包含 2 个额外宝藏锚点',
    source: 'translated-candidate',
  },
  'b-anchor-2': {
    text: '相邻区域包含 4 个额外宝藏锚点',
    source: 'translated-candidate',
    derivedFrom: 'b-anchor-1',
  },
  'b-sulphdrop': {
    text: '相邻区域的稀有怪物掉落亡者硫磺',
    source: 'translated-candidate',
  },
  'b-goldlantern': {
    text: '相邻区域包含 4 个额外黄金灯笼',
    source: 'translated-candidate',
  },
  'b-izaro': {
    text: '相邻区域包含 2 座女神祭坛',
    source: 'translated-candidate',
  },
} as const satisfies Partial<Record<BorderModId, ChineseBorderModEvidence>>
