// ============================================================================
// 3.29 mod pools - from datamined mod lists (launch day, 2026-07-24).
// Reward stat mappings + heuristic values for count-based mods are ours;
// mod texts and numbers are the game's. Ranges use representative mid values.
//
// NOTE: `text` stays English (it feeds clipboard/OCR matching and the
// in-game search strings). `zh` is the Simplified-Chinese display text used
// everywhere in the UI; `short` labels are localised (display only).
//
// Chinese `aliases` provenance: entries with a 8(8-10) inline roll or a plain
// 提高 sentence are verbatim from a real CN-client chart corpus (2026-08);
// tier siblings derived from a verified template are marked by the same
// confirmed-numeric-variant rule the Korean table uses.
// ============================================================================

import type { BorderModDef, VoyageModDef } from '../types'

// ---------------------------------------------------------------------------
// Chart map-mods (magic prefix/suffix): a reward line + downside line(s).
// Only the reward line carries scoring effects; downsides are kept in text.
// One entry per family tier (Low → VeryHigh) so values stay accurate.
// ---------------------------------------------------------------------------
const chartMapMods: VoyageModDef[] = [
  // Canonical reward lines (families share these; downside lines vary and are
  // kept as raw text on import). Tiers: quantity 20/28/32/45, sulphur 30/45,
  // rarity 12/18/20/30, pack 14/16/18, gold 50/70.
  { id: 'cm-quant-20', text: '20% increased Quantity of Items found in this Area', zh: '此区域发现的物品数量增加 20%', scope: 'self', effects: [{ stat: 'quantity', percent: 20 }] },
  { id: 'cm-quant-28', text: '28% increased Quantity of Items found in this Area', zh: '此区域发现的物品数量增加 28%', scope: 'self', effects: [{ stat: 'quantity', percent: 28 }] },
  { id: 'cm-quant-32', text: '32% increased Quantity of Items found in this Area', zh: '此区域发现的物品数量增加 32%', scope: 'self', effects: [{ stat: 'quantity', percent: 32 }] },
  { id: 'cm-quant-45', text: '45% increased Quantity of Items found in this Area', zh: '此区域发现的物品数量增加 45%', scope: 'self', effects: [{ stat: 'quantity', percent: 45 }] },
  { id: 'cm-sulph-30', text: "30% increased Dead Man's Sulphur found in this Area", zh: '此区域发现的亡者硫磺增加 30%', scope: 'self', effects: [{ stat: 'sulphur', percent: 30 }] },
  { id: 'cm-sulph-45', text: "45% increased Dead Man's Sulphur found in this Area", zh: '此区域发现的亡者硫磺增加 45%', scope: 'self', effects: [{ stat: 'sulphur', percent: 45 }] },
  { id: 'cm-rarity-12', text: '12% increased Rarity of Items found in this Area', zh: '此区域发现的物品稀有度增加 12%', scope: 'self', effects: [{ stat: 'rarity', percent: 12 }] },
  { id: 'cm-rarity-18', text: '18% increased Rarity of Items found in this Area', zh: '此区域发现的物品稀有度增加 18%', scope: 'self', effects: [{ stat: 'rarity', percent: 18 }] },
  { id: 'cm-rarity-20', text: '20% increased Rarity of Items found in this Area', zh: '此区域发现的物品稀有度增加 20%', scope: 'self', effects: [{ stat: 'rarity', percent: 20 }] },
  { id: 'cm-rarity-30', text: '30% increased Rarity of Items found in this Area', zh: '此区域发现的物品稀有度增加 30%', scope: 'self', effects: [{ stat: 'rarity', percent: 30 }] },
  { id: 'cm-pack-14', text: '14% increased Pack size', zh: '怪物群规模增加 14%', scope: 'self', effects: [{ stat: 'packsize', percent: 14 }] },
  { id: 'cm-pack-16', text: '16% increased Pack size', zh: '怪物群规模增加 16%', scope: 'self', effects: [{ stat: 'packsize', percent: 16 }] },
  { id: 'cm-pack-18', text: '18% increased Pack size', zh: '怪物群规模增加 18%', scope: 'self', effects: [{ stat: 'packsize', percent: 18 }] },
  { id: 'cm-gold-50', text: '50% increased Gold found in this Area', zh: '此区域发现的金币增加 50%', scope: 'self', effects: [{ stat: 'gold', percent: 50 }] },
  { id: 'cm-gold-70', text: '70% increased Gold found in this Area', zh: '此区域发现的金币增加 70%', scope: 'self', effects: [{ stat: 'gold', percent: 70 }] },
]

// ---------------------------------------------------------------------------
// Chart implicits - Adjacent pool (revealed on charting)
// ---------------------------------------------------------------------------
// Korean aliases are either verbatim Ctrl+C lines observed in a 60-chart
// Korean-client corpus, or numeric-tier variants explicitly confirmed by that
// player to use the same localized sentence template. Tests keep those two
// provenance groups separate.
const adjacentImplicits: VoyageModDef[] = [
  { id: 'adj-ess-1', short: '+1-2 囚禁', text: 'Adjacent Areas contain 1-2 additional Imprisoned Monsters', zh: '相邻区域额外包含 1-2 个被囚禁的怪物', aliases: ['인접 지역들에 갇힌 몬스터 1(1-2)마리 추가 등장'], scope: 'adjacent', effects: [{ stat: 'essences', percent: 15 }] },
  { id: 'adj-ess-2', short: '+2-4 囚禁', text: 'Adjacent Areas contain 2-4 additional Imprisoned Monsters', zh: '相邻区域额外包含 2-4 个被囚禁的怪物', aliases: ['인접 지역들에 갇힌 몬스터 4(2-4)마리 추가 등장'], scope: 'adjacent', effects: [{ stat: 'essences', percent: 30 }] },
  { id: 'adj-ess-3', short: '+5 囚禁', text: 'Adjacent Areas contain 5 additional Imprisoned Monsters', zh: '相邻区域额外包含 5 个被囚禁的怪物', aliases: ['인접 지역들에 갇힌 몬스터 5마리 추가 등장'], scope: 'adjacent', effects: [{ stat: 'essences', percent: 50 }] },
  { id: 'adj-box-1', short: '+1 保险箱', text: 'Adjacent Areas contain an additional Strongbox', zh: '相邻区域额外包含 1 个保险箱', aliases: ['인접 지역들에 금고 1개 추가 등장'], scope: 'adjacent', effects: [{ stat: 'treasure', percent: 15 }] },
  { id: 'adj-box-2', short: '+2-4 保险箱', text: 'Adjacent Areas contain 2-4 additional Strongboxes', zh: '相邻区域额外包含 2-4 个保险箱', aliases: ['인접 지역들에 금고 3(2-4)개 추가 등장'], scope: 'adjacent', effects: [{ stat: 'treasure', percent: 35 }] },
  { id: 'adj-box-3', short: '+5 保险箱', text: 'Adjacent Areas contain 5 additional Strongboxes', zh: '相邻区域额外包含 5 个保险箱', aliases: ['인접 지역들에 금고 5개 추가 등장'], scope: 'adjacent', effects: [{ stat: 'treasure', percent: 55 }] },
  {
    id: 'adj-octo-1',
    short: '+8-10 章鱼',
    text: 'Adjacent Areas contain 8-10 additional packs of Octopi',
    zh: '相邻区域额外包含 8-10 群章鱼',
    aliases: ['인접 지역들에 문어 무리 8(8-10)개 추가 등장', '相邻区域包含 8(8-10) 个额外的章鱼群'],
    scope: 'adjacent',
    effects: [{ stat: 'packsize', percent: 25 }],
  },
  { id: 'adj-octo-2', short: '+11-14 章鱼', text: 'Adjacent Areas contain 11-14 additional packs of Octopi', zh: '相邻区域额外包含 11-14 群章鱼', aliases: ['인접 지역들에 문어 무리 11(11-14)개 추가 등장', '相邻区域包含 11(11-14) 个额外的章鱼群'], scope: 'adjacent', effects: [{ stat: 'packsize', percent: 35 }] },
  { id: 'adj-crab-1', short: '+8-10 螃蟹', text: 'Adjacent Areas contain 8-10 additional packs of Crabs', zh: '相邻区域额外包含 8-10 群螃蟹', aliases: ['인접 지역에 게 무리 8(8-10)개 추가 등장'], scope: 'adjacent', effects: [{ stat: 'packsize', percent: 25 }] },
  { id: 'adj-crab-2', short: '+11-14 螃蟹', text: 'Adjacent Areas contain 11-14 additional packs of Crabs', zh: '相邻区域额外包含 11-14 群螃蟹', aliases: ['인접 지역에 게 무리 11(11-14)개 추가 등장'], scope: 'adjacent', effects: [{ stat: 'packsize', percent: 35 }] },
  { id: 'adj-magic-1', text: '30% increased Magic Monsters', zh: '魔法怪物数量增加 30%', aliases: ['인접 지역들 내 마법 몬스터 수 30% 증가', '相邻区域的魔法怪物数量提高 30%'], scope: 'adjacent', effects: [{ stat: 'magicmonsters', percent: 30 }] },
  { id: 'adj-magic-2', text: '60% increased Magic Monsters', zh: '魔法怪物数量增加 60%', aliases: ['인접 지역들 내 마법 몬스터 수 60% 증가', '相邻区域的魔法怪物数量提高 60%'], scope: 'adjacent', effects: [{ stat: 'magicmonsters', percent: 60 }] },
  { id: 'adj-rare-1', text: '30% increased number of Rare Monsters', zh: '稀有怪物数量增加 30%', aliases: ['인접 지역들 내 희귀 몬스터 수 30% 증가', '相邻区域的稀有怪物数量提高 30%'], scope: 'adjacent', effects: [{ stat: 'rares', percent: 30 }] },
  { id: 'adj-rare-2', text: '60% increased number of Rare Monsters', zh: '稀有怪物数量增加 60%', aliases: ['인접 지역들 내 희귀 몬스터 수 60% 증가', '相邻区域的稀有怪物数量提高 60%'], scope: 'adjacent', effects: [{ stat: 'rares', percent: 60 }] },
  { id: 'adj-msg-1', short: '+1 信息', text: 'Adjacent Areas contain an additional Message in a Bottle', zh: '相邻区域额外包含 1 个瓶中信息', scope: 'adjacent', effects: [{ stat: 'treasure', percent: 12 }] },
  { id: 'adj-msg-2', short: '+2 信息', text: 'Adjacent Areas contain 2 additional Messages in Bottles', zh: '相邻区域额外包含 2 个瓶中信息', scope: 'adjacent', effects: [{ stat: 'treasure', percent: 22 }] },
  { id: 'adj-fish', short: '珍稀鱼类', text: 'Adjacent Areas contain highly prized and exotic Fish', zh: '相邻区域包含备受珍视的珍稀鱼类', scope: 'adjacent', effects: [{ stat: 'treasure', percent: 20 }] },
  { id: 'adj-wisps-1', short: '2000 精魄', text: 'Monsters have a chance to be Empowered by 2000 Wildwood Wisps', zh: '怪物有一定几率被 2000 个荒野精魄强化', aliases: ['몬스터가 일정 확률로 야생림 도깨비불 2000마리로 강화', '怪物有几率被 2000 个荒林鬼灵强化'], scope: 'adjacent', effects: [{ stat: 'wisps', percent: 30 }] },
  { id: 'adj-wisps-2', short: '4000 精魄', text: 'Monsters have a chance to be Empowered by 4000 Wildwood Wisps', zh: '怪物有一定几率被 4000 个荒野精魄强化', aliases: ['몬스터가 일정 확률로 야생림 도깨비불 4000마리로 강화', '怪物有几率被 4000 个荒林鬼灵强化'], scope: 'adjacent', effects: [{ stat: 'wisps', percent: 55 }] },
  { id: 'adj-atziri', short: '阿兹里的影响', text: "Atziri's Influence", zh: "阿兹里的影响", aliases: ['앗지리의 영향력'], scope: 'adjacent', effects: [{ stat: 'treasure', percent: 40 }] },
  {
    id: 'adj-gold-1',
    text: '40% of Equipment dropped by Monsters in Area is converted to Gold',
    zh: '区域内怪物掉落的装备有 40% 转化为金币',
    aliases: ['인접 지역 내 몬스터가 떨어뜨리는 장비의 40%가 골드로 전환'],
    scope: 'adjacent',
    effects: [{ stat: 'gold', percent: 40 }],
  },
  { id: 'adj-gold-2', text: '80% of Equipment dropped by Monsters in Area is converted to Gold', zh: '区域内怪物掉落的装备有 80% 转化为金币', aliases: ['인접 지역 내 몬스터가 떨어뜨리는 장비의 80%가 골드로 전환'], scope: 'adjacent', effects: [{ stat: 'gold', percent: 80 }] },
  { id: 'adj-spirit-1', short: '+1 幽魂牢笼', text: 'Adjacent Areas contain an additional cage of Tormented Spirits', zh: '相邻区域额外包含 1 个折磨之灵牢笼', aliases: ['인접 지역들에 고통받는 혼백의 창살 1개 추가 등장', '相邻区域包含一个额外罪魂牢笼'], scope: 'adjacent', effects: [{ stat: 'spirits', percent: 20 }] },
  { id: 'adj-spirit-2', short: '+2 幽魂牢笼', text: 'Adjacent Areas contain 2 additional cages of Tormented Spirits', zh: '相邻区域额外包含 2 个折磨之灵牢笼', aliases: ['인접 지역들에 고통받는 혼백의 창살 2개 추가 등장'], scope: 'adjacent', effects: [{ stat: 'spirits', percent: 38 }] },
  { id: 'adj-divbox-1', short: '+2 预言家保险箱', text: "Adjacent Areas contain 2 additional Diviner's Strongboxes", zh: "相邻区域额外包含 2 个预言家保险箱", aliases: ['인접 지역들에 예언자의 금고 2개 추가 등장'], scope: 'adjacent', effects: [{ stat: 'divcards', percent: 45 }] },
  { id: 'adj-divbox-2', short: '+3 预言家保险箱', text: "Adjacent Areas contain 3 additional Diviner's Strongboxes", zh: "相邻区域额外包含 3 个预言家保险箱", aliases: ['인접 지역들에 예언자의 금고 3개 추가 등장'], scope: 'adjacent', effects: [{ stat: 'divcards', percent: 65 }] },
  { id: 'adj-arcbox-1', short: '+2 秘术家保险箱', text: "Adjacent Areas contain 2 additional Arcanist's Strongboxes", zh: "相邻区域额外包含 2 个秘术家保险箱", aliases: ['인접 지역들에 신비학자의 금고 2개 추가 등장'], scope: 'adjacent', effects: [{ stat: 'currency', percent: 40 }] },
  { id: 'adj-arcbox-2', short: '+3 秘术家保险箱', text: "Adjacent Areas contain 3 additional Arcanist's Strongboxes", zh: "相邻区域额外包含 3 个秘术家保险箱", aliases: ['인접 지역들에 신비학자의 금고 3개 추가 등장'], scope: 'adjacent', effects: [{ stat: 'currency', percent: 55 }] },
  { id: 'adj-opbox-1', short: '+2 特工保险箱', text: "Adjacent Areas contain 2 additional Operative's Strongboxes", zh: "相邻区域额外包含 2 个特工保险箱", aliases: ['인접 지역들에 첩보원의 금고 2개 추가 등장'], scope: 'adjacent', effects: [{ stat: 'scarabs', percent: 40 }] },
  { id: 'adj-opbox-2', short: '+3 特工保险箱', text: "Adjacent Areas contain 3 additional Operative's Strongboxes", zh: "相邻区域额外包含 3 个特工保险箱", aliases: ['인접 지역들에 첩보원의 금고 3개 추가 등장'], scope: 'adjacent', effects: [{ stat: 'scarabs', percent: 55 }] },
  {
    id: 'adj-barrel-1',
    short: '+12-15 木桶',
    text: 'Adjacent Areas contain 12-15 additional Clusters of Barrels',
    zh: '相邻区域额外包含 12-15 组木桶',
    aliases: ['인접 지역들에 통 무더기 14(12-15)개 추가 등장', '相邻区域包含 15(12-15) 个额外木桶丛'],
    scope: 'adjacent',
    effects: [{ stat: 'treasure', percent: 15 }],
  },
  {
    id: 'adj-barrel-2',
    short: '+16-20 木桶',
    text: 'Adjacent Areas contain 16-20 additional Clusters of Mysterious Barrels',
    zh: '相邻区域额外包含 16-20 组神秘木桶',
    aliases: ['인접 지역들에 통 무더기 17(16-20)개 추가 등장', '相邻区域包含 16(16-20) 个额外木桶丛'],
    scope: 'adjacent',
    effects: [{ stat: 'treasure', percent: 22 }],
  },
  {
    id: 'adj-star-1',
    short: '+4-5 海星',
    text: 'Adjacent Areas contains 4-5 additional Giant Starfish',
    zh: '相邻区域额外包含 4-5 只巨型海星',
    aliases: ['인접 지역들에 에 거대 불가사리 4(4-5)마리 추가 등장'],
    scope: 'adjacent',
    effects: [{ stat: 'packsize', percent: 15 }],
  },
  { id: 'adj-star-2', short: '+6-7 海星', text: 'Adjacent Areas contains 6-7 additional Giant Starfish', zh: '相邻区域额外包含 6-7 只巨型海星', aliases: ['인접 지역들에 에 거대 불가사리 7(6-7)마리 추가 등장'], scope: 'adjacent', effects: [{ stat: 'packsize', percent: 20 }] },
  { id: 'adj-fracture', short: '2% 碎裂物品', text: 'Items dropped in adjacent Areas have 2% chance to be Fractured', zh: '相邻区域掉落的物品有 2% 几率碎裂', aliases: ['인접 지역들에서 떨어지는 아이템이 2% 확률로 분열된 등급', '相邻区域掉落的物品有 2% 的几率分裂'], scope: 'adjacent', effects: [] },
  { id: 'adj-lantern', short: '+4 黄金灯笼', text: 'Adjacent Areas contain 4 additional Golden Lanterns', zh: '相邻区域额外包含 4 个黄金灯笼', aliases: ['인접 지역들에 황금 등불 4개 추가 등장'], scope: 'adjacent', effects: [{ stat: 'treasure', percent: 20 }] },
  { id: 'adj-pantheon', short: '万神殿稀有怪', text: 'Rare Monsters in adjacent Areas will have a Pantheon Modifier', zh: '相邻区域的稀有怪物将拥有 1 个万神殿词缀', aliases: ['인접 지역들 내 희귀 몬스터가 판테온 속성 1개 보유'], scope: 'adjacent', effects: [{ stat: 'rares', percent: 25 }] },
  { id: 'adj-uring-1', short: '10% 暗金戒指', text: 'Rings dropped in adjacent Areas have 10% chance to instead drop as a Unique Ring', zh: '相邻区域掉落的戒指有 10% 几率改为掉落暗金戒指', aliases: ['인접 지역들에서 떨어지는 반지가 10% 확률로 고유 반지로 떨어짐'], scope: 'adjacent', effects: [{ stat: 'uniques', percent: 20 }] },
  { id: 'adj-uring-2', short: '20% 暗金戒指', text: 'Rings dropped in adjacent Areas have 20% chance to instead drop as a Unique Ring', zh: '相邻区域掉落的戒指有 20% 几率改为掉落暗金戒指', aliases: ['인접 지역들에서 떨어지는 반지가 20% 확률로 고유 반지로 떨어짐'], scope: 'adjacent', effects: [{ stat: 'uniques', percent: 40 }] },
  { id: 'adj-uamu-1', short: '10% 暗金项链', text: 'Amulets dropped in adjacent Areas have 10% chance to instead drop as a Unique Amulet', zh: '相邻区域掉落的项链有 10% 几率改为掉落暗金项链', aliases: ['인접 지역들에서 떨어지는 목걸이가 10% 확률로 고유 목걸이로 떨어짐'], scope: 'adjacent', effects: [{ stat: 'uniques', percent: 20 }] },
  { id: 'adj-uamu-2', short: '20% 暗金项链', text: 'Amulets dropped in adjacent Areas have 20% chance to instead drop as a Unique Amulet', zh: '相邻区域掉落的项链有 20% 几率改为掉落暗金项链', aliases: ['인접 지역들에서 떨어지는 목걸이가 20% 확률로 고유 목걸이로 떨어짐'], scope: 'adjacent', effects: [{ stat: 'uniques', percent: 40 }] },
  { id: 'adj-ubelt-1', short: '10% 暗金腰带', text: 'Belts dropped in adjacent Areas have 10% chance to instead drop as a Unique Belt', zh: '相邻区域掉落的腰带有 10% 几率改为掉落暗金腰带', aliases: ['인접 지역들에서 떨어지는 허리띠가 10% 확률로 고유 허리띠로 떨어짐'], scope: 'adjacent', effects: [{ stat: 'uniques', percent: 20 }] },
  { id: 'adj-ubelt-2', short: '20% 暗金腰带', text: 'Belts dropped in adjacent Areas have 20% chance to instead drop as a Unique Belt', zh: '相邻区域掉落的腰带有 20% 几率改为掉落暗金腰带', aliases: ['인접 지역들에서 떨어지는 허리띠가 20% 확률로 고유 허리띠로 떨어짐'], scope: 'adjacent', effects: [{ stat: 'uniques', percent: 40 }] },
]

// ---------------------------------------------------------------------------
// Chart implicits - Voyage (global) pool
// ---------------------------------------------------------------------------
const voyageImplicits: VoyageModDef[] = [
  { id: 'voy-soul', short: '噬魂者', text: 'Players in Area have Soul Eater', zh: '区域内的玩家拥有噬魂者', aliases: ['모든 항해 지역 내 플레이어들이 영혼 포식자 획득'], scope: 'global', effects: [] },
  { id: 'voy-pack-1', text: '5% increased Pack size', zh: '怪物群规模增加 5%', aliases: ['모든 항해 지역 내 무리 규모 5% 증가'], scope: 'global', effects: [{ stat: 'packsize', percent: 5 }] },
  { id: 'voy-pack-2', text: '7% increased Pack size', zh: '怪物群规模增加 7%', aliases: ['모든 항해 지역 내 무리 규모 7% 증가'], scope: 'global', effects: [{ stat: 'packsize', percent: 7 }] },
  { id: 'voy-quant-1', text: '8% increased Quantity of Items found in this Area', zh: '此区域发现的物品数量增加 8%', aliases: ['모든 항해 지역에서 발견하는 아이템 수량 8% 증가'], scope: 'global', effects: [{ stat: 'quantity', percent: 8 }] },
  { id: 'voy-quant-2', text: '10% increased Quantity of Items found in this Area', zh: '此区域发现的物品数量增加 10%', aliases: ['모든 항해 지역에서 발견하는 아이템 수량 10% 증가'], scope: 'global', effects: [{ stat: 'quantity', percent: 10 }] },
  { id: 'voy-rarity-1', text: '7% increased Rarity of Items found in this Area', zh: '此区域发现的物品稀有度增加 7%', aliases: ['모든 항해 지역에서 발견하는 아이템 희귀도 7% 증가'], scope: 'global', effects: [{ stat: 'rarity', percent: 7 }] },
  { id: 'voy-rarity-2', text: '9% increased Rarity of Items found in this Area', zh: '此区域发现的物品稀有度增加 9%', aliases: ['모든 항해 지역에서 발견하는 아이템 희귀도 9% 증가'], scope: 'global', effects: [{ stat: 'rarity', percent: 9 }] },
  { id: 'voy-jelly', short: '友善水母', text: 'All Voyage Areas contain Friendly Jellyfish', zh: '所有航行区域包含友善水母', aliases: ['지역에 살가운 해파리 등장'], scope: 'global', effects: [] },
  { id: 'voy-sulph-1', text: "15% increased Dead Man's Sulphur found in this Area", zh: '此区域发现的亡者硫磺增加 15%', aliases: ['모든 항해 지역에서 발견하는 망자의 유황 15% 증가'], scope: 'global', effects: [{ stat: 'sulphur', percent: 15 }] },
  { id: 'voy-sulph-2', text: "20% increased Dead Man's Sulphur found in this Area", zh: '此区域发现的亡者硫磺增加 20%', aliases: ['모든 항해 지역에서 발견하는 망자의 유황 20% 증가'], scope: 'global', effects: [{ stat: 'sulphur', percent: 20 }] },
  { id: 'voy-sulph-3', text: "25% increased Dead Man's Sulphur found in this Area", zh: '此区域发现的亡者硫磺增加 25%', aliases: ['모든 항해 지역에서 발견하는 망자의 유황 25% 증가'], scope: 'global', effects: [{ stat: 'sulphur', percent: 25 }] },
  { id: 'voy-rare', text: '25% increased number of Rare Monsters', zh: '稀有怪物数量增加 25%', aliases: ['모든 항해 지역 내 희귀 몬스터 수 25% 증가', '所有航行区域的稀有怪物数量提高 25%'], scope: 'global', effects: [{ stat: 'rares', percent: 25 }] },
  { id: 'voy-magic', text: '25% increased Magic Monsters', zh: '魔法怪物数量增加 25%', aliases: ['모든 항해 지역 내 마법 몬스터 수 25% 증가'], scope: 'global', effects: [{ stat: 'magicmonsters', percent: 25 }] },
  { id: 'voy-noequip', short: '不掉落装备', text: 'Monsters in all Voyage Areas cannot drop Equipment, Flasks or Tinctures', zh: '所有航行区域的怪物不会掉落装备、药剂或酊剂', scope: 'global', effects: [] },
  { id: 'voy-minmagic', short: '至少为魔法', text: 'Monsters in Area are at least Magic', zh: '区域内的怪物至少为魔法等级', aliases: ['모든 항해 지역 내 몬스터가 마법 이상으로 등장'], scope: 'global', effects: [{ stat: 'magicmonsters', percent: 30 }] },
  { id: 'voy-possess', short: '稀有怪被附身', text: '100% chance for Rare Monsters in Area to be Possessed', zh: '区域内的稀有怪物有 100% 几率被附身', aliases: ['모든 항해 지역 내 희귀 몬스터가 100%의 확률로 사로잡힘'], scope: 'global', effects: [{ stat: 'spirits', percent: 100 }] },
  { id: 'voy-essence', short: '稀有怪被精髓囚禁', text: 'Rare monsters that are natural inhabitants are imprisoned by Essences', zh: '区域内的稀有怪物被精髓囚禁', aliases: ['모든 항해 지역 내 자연적으로 서식하는 희귀 몬스터가 에센스에 갇힘'], scope: 'global', effects: [{ stat: 'essences', percent: 40 }] },
  { id: 'voy-fracture', short: '50% 稀有怪碎裂', text: '50% chance for Rare Monsters to Fracture on death', zh: '稀有怪物死亡时有 50% 几率碎裂', scope: 'global', effects: [{ stat: 'rares', percent: 50 }] },
  { id: 'voy-flask', short: '20% 药剂品质', text: 'Flasks found in all Voyage Areas have 100% chance to have 20% Quality', zh: '所有航行区域发现的药剂有 100% 几率拥有 20% 品质', scope: 'global', effects: [] },
]

export const VOYAGE_MODS: VoyageModDef[] = [...chartMapMods, ...adjacentImplicits, ...voyageImplicits]

// ---------------------------------------------------------------------------
// Border pool ("Corruption Currents") - applies to the touched Area
// ---------------------------------------------------------------------------
export const BORDER_MODS: BorderModDef[] = [
  { id: 'b-pack-1', short: '16% 群规模', text: '16% increased Pack Size in adjacent Areas', zh: '相邻区域怪物群规模增加 16%', effects: [{ stat: 'packsize', percent: 16 }] },
  { id: 'b-pack-2', short: '24% 群规模', text: '24% increased Pack Size in adjacent Areas', zh: '相邻区域怪物群规模增加 24%', effects: [{ stat: 'packsize', percent: 24 }] },
  { id: 'b-pack-3', short: '32% 群规模', text: '32% increased Pack Size in adjacent Areas', zh: '相邻区域怪物群规模增加 32%', effects: [{ stat: 'packsize', percent: 32 }] },
  { id: 'b-minmagic', short: '至少为魔法', text: 'Monsters in adjacent Areas are at least Magic', zh: '相邻区域的怪物至少为魔法等级', effects: [{ stat: 'magicmonsters', percent: 30 }] },
  { id: 'b-rare-1', short: '50% 稀有怪', text: '50% increased number of Rare Monsters in adjacent Areas', zh: '相邻区域稀有怪物数量增加 50%', effects: [{ stat: 'rares', percent: 50 }] },
  { id: 'b-rare-2', short: '75% 稀有怪', text: '75% increased number of Rare Monsters in adjacent Areas', zh: '相邻区域稀有怪物数量增加 75%', effects: [{ stat: 'rares', percent: 75 }] },
  { id: 'b-rare-3', short: '100% 稀有怪', text: '100% increased number of Rare Monsters in adjacent Areas', zh: '相邻区域稀有怪物数量增加 100%', effects: [{ stat: 'rares', percent: 100 }] },
  { id: 'b-beasts-1', short: '+8 海兽群', text: 'Adjacent Areas contain 8 additional packs of Sea Beasts', zh: '相邻区域额外包含 8 群海兽', effects: [{ stat: 'packsize', percent: 25 }] },
  { id: 'b-beasts-2', short: '+12 海兽群', text: 'Adjacent Areas contain 12 additional packs of Sea Beasts', zh: '相邻区域额外包含 12 群海兽', effects: [{ stat: 'packsize', percent: 35 }] },
  { id: 'b-beasts-3', short: '+16 海兽群', text: 'Adjacent Areas contain 16 additional packs of Sea Beasts', zh: '相邻区域额外包含 16 群海兽', effects: [{ stat: 'packsize', percent: 45 }] },
  { id: 'b-crabs-1', short: '+8 螃蟹群', text: 'Adjacent Areas contain 8 additional packs of Crabs', zh: '相邻区域额外包含 8 群螃蟹', effects: [{ stat: 'packsize', percent: 25 }] },
  { id: 'b-crabs-2', short: '+12 螃蟹群', text: 'Adjacent Areas contain 12 additional packs of Crabs', zh: '相邻区域额外包含 12 群螃蟹', effects: [{ stat: 'packsize', percent: 35 }] },
  { id: 'b-crabs-3', short: '+16 螃蟹群', text: 'Adjacent Areas contain 16 additional packs of Crabs', zh: '相邻区域额外包含 16 群螃蟹', effects: [{ stat: 'packsize', percent: 45 }] },
  { id: 'b-drowned-1', short: '+8 溺亡群', text: 'Adjacent Areas contain 8 additional packs of the Drowned', zh: '相邻区域额外包含 8 群溺亡者', effects: [{ stat: 'packsize', percent: 25 }] },
  { id: 'b-drowned-2', short: '+12 溺亡群', text: 'Adjacent Areas contain 12 additional packs of the Drowned', zh: '相邻区域额外包含 12 群溺亡者', effects: [{ stat: 'packsize', percent: 35 }] },
  { id: 'b-drowned-3', short: '+16 溺亡群', text: 'Adjacent Areas contain 16 additional packs of the Drowned', zh: '相邻区域额外包含 16 群溺亡者', effects: [{ stat: 'packsize', percent: 45 }] },
  { id: 'b-mag-1', short: '40% 强度', text: 'Adjacent Areas have 40% increased explicit modifier magnitudes', zh: '相邻区域的显式词缀强度增加 40%', effects: [], magnitude: 40 },
  { id: 'b-mag-2', short: '60% 强度', text: 'Adjacent Areas have 60% increased explicit modifier magnitudes', zh: '相邻区域的显式词缀强度增加 60%', effects: [], magnitude: 60 },
  { id: 'b-mag-3', short: '80% 强度', text: 'Adjacent Areas have 80% increased explicit modifier magnitudes', zh: '相邻区域的显式词缀强度增加 80%', effects: [], magnitude: 80 },
  { id: 'b-keep-1', short: '30% 保留海图', text: 'Adjacent Charts have 30% chance to not be consumed when beginning a Voyage', zh: '开始航行时相邻海图有 30% 几率不被消耗', effects: [{ stat: 'preserve', percent: 30 }] },
  { id: 'b-keep-2', short: '50% 保留海图', text: 'Adjacent Charts have 50% chance to not be consumed when beginning a Voyage', zh: '开始航行时相邻海图有 50% 几率不被消耗', effects: [{ stat: 'preserve', percent: 50 }] },
  { id: 'b-octoboss', short: 'Filthscrabble', text: 'Adjacent Areas contain Filthscrabble', zh: '相邻区域包含 Filthscrabble', effects: [{ stat: 'treasure', percent: 30 }] },
  { id: 'b-lanterns', short: '免费灯笼', text: 'Placing Lanterns does not reduce your Lantern count in adjacent Areas', zh: '在相邻区域放置灯笼不会减少你的灯笼数量', effects: [{ stat: 'sulphur', percent: 20 }] },
  { id: 'b-ancient', short: '+1 远古石掉落', text: 'Rare Monsters in adjacent Areas drop an additional Ancient Orb', zh: '相邻区域的稀有怪物额外掉落 1 个远古石', aliases: ['Rare Monsters in adjacent Areas drop 1 additional Ancient Orbs'], effects: [{ stat: 'currency', percent: 30 }] },
  { id: 'b-divine', short: '+1 神圣石掉落', text: 'Rare Monsters in adjacent Areas drop an additional Divine Orb', zh: '相邻区域的稀有怪物额外掉落 1 个神圣石', aliases: ['Rare Monsters adjacent in Areas drop 1 additional Divine Orbs'], effects: [{ stat: 'currency', percent: 120 }] },
  { id: 'b-exalt', short: '+1 崇高石掉落', text: 'Rare Monsters in adjacent Areas drop an additional Exalted Orb', zh: '相邻区域的稀有怪物额外掉落 1 个崇高石', aliases: ['Rare Monsters in adjacent Areas drop 1 additional Exalted Orbs'], effects: [{ stat: 'currency', percent: 45 }] },
  { id: 'b-annul', short: '+1 剥离石掉落', text: 'Rare Monsters in adjacent Areas drop an additional Orb of Annulment', zh: '相邻区域的稀有怪物额外掉落 1 个剥离石', aliases: ['Rare Monsters in adjacent Areas drop 1 additional Orbs of Annulment'], effects: [{ stat: 'currency', percent: 25 }] },
  { id: 'b-chaos', short: '+1 混沌石掉落', text: 'Rare Monsters in adjacent Areas drop an additional Chaos Orb', zh: '相邻区域的稀有怪物额外掉落 1 个混沌石', aliases: ['Rare Monsters in adjacent Areas drop 1 additional Chaos Orbs'], effects: [{ stat: 'currency', percent: 15 }] },
  { id: 'b-vaal', short: '+1 瓦尔宝珠掉落', text: 'Rare Monsters in adjacent Areas drop an additional Vaal Orb', zh: '相邻区域的稀有怪物额外掉落 1 个瓦尔宝珠', aliases: ['Rare Monsters in adjacent Areas drop 1 additional Vaal Orbs'], effects: [{ stat: 'currency', percent: 10 }] },
  { id: 'b-gcp', short: '+1 宝石匠棱镜掉落', text: "Rare Monsters in adjacent Areas drop an additional Gemcutter's Prism", zh: "相邻区域的稀有怪物额外掉落 1 个宝石匠棱镜", aliases: ["Rare Monsters in adjacent Areas drop 1 additional Gemcutter's Prisms"], effects: [{ stat: 'currency', percent: 12 }] },
  { id: 'b-chrome', short: '+1 幻色石掉落', text: 'Rare Monsters in adjacent Areas drop an additional Chromatic Orb', zh: '相邻区域的稀有怪物额外掉落 1 个幻色石', aliases: ['Rare Monsters in adjacent Areas drop 1 additional Chromatic Orbs'], effects: [{ stat: 'currency', percent: 3 }] },
  { id: 'b-regret', short: '+1 后悔石掉落', text: 'Rare Monsters in adjacent Areas drop an additional Orb of Regret', zh: '相邻区域的稀有怪物额外掉落 1 个后悔石', aliases: ['Rare Monsters in adjacent Areas drop 1 additional Orbs of Regret'], effects: [{ stat: 'currency', percent: 8 }] },
  { id: 'b-blessed', short: '+1 祝福石掉落', text: 'Rare Monsters in adjacent Areas drop an additional Blessed Orb', zh: '相邻区域的稀有怪物额外掉落 1 个祝福石', aliases: ['Rare Monsters in adjacent Areas drop 1 additional Blessed Orbs'], effects: [{ stat: 'currency', percent: 5 }] },
  { id: 'b-regal', short: '+1 富豪石掉落', text: 'Rare Monsters in adjacent Areas drop an additional Regal Orb', zh: '相邻区域的稀有怪物额外掉落 1 个富豪石', aliases: ['Rare Monsters in adjacent Areas drop 1 additional Regal Orbs'], effects: [{ stat: 'currency', percent: 8 }] },
  { id: 'b-support', short: '20% 辅助宝石', text: 'Rare Monsters in adjacent Areas have 20% chance to drop a Support Gem', zh: '相邻区域的稀有怪物有 20% 几率掉落辅助宝石', effects: [{ stat: 'currency', percent: 15 }] },
  { id: 'b-locker', short: '海盗储物柜', text: "Adjacent Areas contain a lost Pirate's Locker", zh: "相邻区域包含一个失落的储物柜", effects: [{ stat: 'treasure', percent: 30 }] },
  { id: 'b-pirates', short: '咸腐掠夺队', text: 'Adjacent Areas contain a Brinerot raiding party', zh: '相邻区域包含一支咸腐掠夺队', effects: [{ stat: 'packsize', percent: 20 }] },
  { id: 'b-rareconn-1', short: '50% 稀有怪/连接', text: '50% increased number of Rare monsters in adjacent Areas per connection', zh: '相邻区域的稀有怪物数量每连接增加 50%', effects: [], perConnEffects: [{ stat: 'rares', percent: 50 }] },
  { id: 'b-rareconn-2', short: '75% 稀有怪/连接', text: '75% increased number of Rare monsters in adjacent Areas per connection', zh: '相邻区域的稀有怪物数量每连接增加 75%', effects: [], perConnEffects: [{ stat: 'rares', percent: 75 }] },
  { id: 'b-quantconn-1', short: '120% 数量, -50%/连接', text: '50% reduced Quantity of Items found in adjacent Areas per connection 120% increased Quantity of Items found in adjacent Areas', zh: '相邻区域发现的物品数量每连接减少 50%，同时相邻区域发现的物品数量增加 120%', effects: [{ stat: 'quantity', percent: 120 }], perConnEffects: [{ stat: 'quantity', percent: -50 }] },
  { id: 'b-quantconn-2', short: '180% 数量, -50%/连接', text: '50% reduced Quantity of Items found in adjacent Areas per connection 180% increased Quantity of Items found in adjacent Areas', zh: '相邻区域发现的物品数量每连接减少 50%，同时相邻区域发现的物品数量增加 180%', effects: [{ stat: 'quantity', percent: 180 }], perConnEffects: [{ stat: 'quantity', percent: -50 }] },
  { id: 'b-gold-1', short: '25% 装备转金币', text: '25% of Equipment dropped by monsters in adjacent Areas is converted to Gold', zh: '相邻区域怪物掉落的装备有 25% 转化为金币', effects: [{ stat: 'gold', percent: 25 }] },
  { id: 'b-gold-2', short: '50% 装备转金币', text: '50% of Equipment dropped by monsters in adjacent Areas is converted to Gold', zh: '相邻区域怪物掉落的装备有 50% 转化为金币', effects: [{ stat: 'gold', percent: 50 }] },
  { id: 'b-decks', short: '堆叠卡组', text: 'Basic Currency items dropped by Monsters in adjacent Areas will instead drop as Stacked Decks', zh: '相邻区域怪物掉落的基础通货将改为掉落堆叠卡组', effects: [{ stat: 'divcards', percent: 40 }] },
  { id: 'b-scarabdrop', short: '+1 圣甲虫掉落', text: 'Rare Monsters in adjacent Areas drop an additional Scarab', zh: '相邻区域的稀有怪物额外掉落 1 个圣甲虫', aliases: ['Rare Monsters in adjacent Areas drop 1 additional Scarabs'], effects: [{ stat: 'scarabs', percent: 25 }] },
  { id: 'b-curr-1', short: '50% 通货', text: '50% more Currency found in adjacent Areas', zh: '相邻区域发现的通货增加 50%', effects: [{ stat: 'currency', percent: 50 }] },
  { id: 'b-curr-2', short: '75% 通货', text: '75% more Currency found in adjacent Areas', zh: '相邻区域发现的通货增加 75%', effects: [{ stat: 'currency', percent: 75 }] },
  { id: 'b-curr-3', short: '100% 通货', text: '100% more Currency found in adjacent Areas', zh: '相邻区域发现的通货增加 100%', effects: [{ stat: 'currency', percent: 100 }] },
  { id: 'b-scarab-1', short: '50% 圣甲虫', text: '50% more Scarabs found in adjacent Areas', zh: '相邻区域发现的圣甲虫增加 50%', effects: [{ stat: 'scarabs', percent: 50 }] },
  { id: 'b-scarab-2', short: '75% 圣甲虫', text: '75% more Scarabs found in adjacent Areas', zh: '相邻区域发现的圣甲虫增加 75%', effects: [{ stat: 'scarabs', percent: 75 }] },
  { id: 'b-scarab-3', short: '100% 圣甲虫', text: '100% more Scarabs found in adjacent Areas', zh: '相邻区域发现的圣甲虫增加 100%', effects: [{ stat: 'scarabs', percent: 100 }] },
  { id: 'b-rarity-1', short: '50% 稀有度', text: '50% more Rarity of Items found in adjacent Areas', zh: '相邻区域发现的物品稀有度增加 50%', effects: [{ stat: 'rarity', percent: 50 }] },
  { id: 'b-rarity-2', short: '75% 稀有度', text: '75% more Rarity of Items found in adjacent Areas', zh: '相邻区域发现的物品稀有度增加 75%', effects: [{ stat: 'rarity', percent: 75 }] },
  { id: 'b-rarity-3', short: '100% 稀有度', text: '100% more Rarity of Items found in adjacent Areas', zh: '相邻区域发现的物品稀有度增加 100%', effects: [{ stat: 'rarity', percent: 100 }] },
  { id: 'b-crabboss', short: 'Captainsbane', text: 'Adjacent Areas contain Captainsbane', zh: '相邻区域包含 Captainsbane', effects: [{ stat: 'treasure', percent: 30 }] },
  { id: 'b-exp-1', short: '100% 经验', text: 'Players in adjacent Areas gain 100% increased Experience', zh: '相邻区域的玩家获得 100% 额外经验', effects: [{ stat: 'exp', percent: 100 }] },
  { id: 'b-exp-2', short: '150% 经验', text: 'Players in adjacent Areas gain 150% increased Experience', zh: '相邻区域的玩家获得 150% 额外经验', effects: [{ stat: 'exp', percent: 150 }] },
  { id: 'b-exp-3', short: '200% 经验', text: 'Players in adjacent Areas gain 200% increased Experience', zh: '相邻区域的玩家获得 200% 额外经验', effects: [{ stat: 'exp', percent: 200 }] },
  { id: 'b-magicmods', short: '魔法怪 +1 词缀', text: 'Magic Monsters in adjacent Areas have an additional modifier', zh: '相邻区域的魔法怪物拥有 1 个额外词缀', effects: [{ stat: 'magicmonsters', percent: 20 }] },
  { id: 'b-anchor-1', short: '+2 船锚', text: 'Adjacent Areas contain 2 additional Treasure Anchors', zh: '相邻区域额外包含 2 个宝藏锚点', effects: [{ stat: 'treasure', percent: 35 }] },
  { id: 'b-anchor-2', short: '+4 船锚', text: 'Adjacent Areas contain 4 additional Treasure Anchors', zh: '相邻区域额外包含 4 个宝藏锚点', effects: [{ stat: 'treasure', percent: 65 }] },
  { id: 'b-sulphdrop', short: '稀有怪掉落硫磺', text: "Rare Monsters in adjacent Areas drop Dead Man's Sulphur", zh: "相邻区域的稀有怪物掉落亡者硫磺", effects: [{ stat: 'sulphur', percent: 35 }] },
  { id: 'b-goldlantern', short: '+4 黄金灯笼', text: 'Adjacent Areas contain 4 additional Golden Lanterns', zh: '相邻区域额外包含 4 个黄金灯笼', effects: [{ stat: 'treasure', percent: 20 }] },
  { id: 'b-izaro', short: '2 座女神祭坛', text: 'Adjacent Areas contain 2 Altars to the Goddess', zh: '相邻区域包含 2 座女神祭坛', effects: [{ stat: 'treasure', percent: 30 }] },
]

export const voyageModById = new Map(VOYAGE_MODS.map((m) => [m.id, m]))
export const borderModById = new Map(BORDER_MODS.map((m) => [m.id, m]))

/** Localised display text for a mod: Simplified Chinese when available. */
export const modText = (m: { zh?: string; text: string }): string => m.zh ?? m.text
