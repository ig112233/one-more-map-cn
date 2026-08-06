// Curated strategies. Each one overrides the user's reward weights and adds
// position rules that shape what the solver suggests while it is active.
//
// First set is from Milkybk_'s "Curse of the Allflame Buffs and My Strategy"
// (https://www.youtube.com/watch?v=gVKQhYxeavk) - transcribed and encoded
// 2026-07-28. His approach is deliberately all-or-nothing: run the speedrun
// board with spare charts until you've collected the pieces for a juiced one.

import type { ChartAreaType, Edges, Stat, Weights } from '../types'

export const STRATEGY_RESERVATION_OPTIONS = [
  { id: 'divine', label: '神圣石策略' },
  { id: 'meatfish', label: 'Meatfish（肉鱼）' },
  { id: 'ethereal', label: '魔法虚无（Magic Ethereal）' },
] as const

export type StrategyReservationId = (typeof STRATEGY_RESERVATION_OPTIONS)[number]['id']
export type StrategyReservationPreferences = Record<StrategyReservationId, boolean>

export const defaultStrategyReservations = (): StrategyReservationPreferences => ({
  divine: true,
  meatfish: true,
  ethereal: true,
})

export interface StrategyReservationGroup {
  id: StrategyReservationId
  label: string
  modIds?: string[]
  areaTypes?: ChartAreaType[]
}

export interface PositionRule {
  /** board cells this rule targets (row-major, 4 = centre) */
  cells?: number[]
  /** or resolve cells dynamically: tiles touched by border segments rolled
   *  with this border mod id (e.g. put a chart ON the Divine-border tile) */
  nearBorderId?: string
  /** with nearBorderId: target the NEIGHBOURS of the border tile instead */
  adjacentToBorder?: boolean
  /** chart implicit mod ids that satisfy the rule */
  modIds?: string[]
  /** or match one of these canonical Chart destination/area types */
  areaTypes?: ChartAreaType[]
  /** or a header reward stat, scored as percent/100 × per */
  rewardStat?: { stat: Stat; per: number }
  /** objective bonus per matching placement */
  bonus: number
}

export interface StrategyDef {
  id: string
  name: string
  /** highlight chip on the strategy card (e.g. 'NEW') */
  badge?: string
  tagline: string
  source: { label: string; url: string }
  /** the video's guidance, shown on the expanded card */
  guide: string[]
  /** reward-weight override while active (unlisted rewards count as 0) */
  weights: Weights
  rules: PositionRule[]
  /** exact connector layout to build (effective edges [N,E,S,W] per cell after
   *  rotation) - the solver treats any deviation as a heavy penalty */
  layout?: Edges[]
  /** per-cell cost of deviating from the layout. Default is strict (300);
   *  a small value makes the lines a soft preference that yields to the
   *  position rules (piece locations matter more than exact lines) */
  layoutPenalty?: number
  /** Optional keeper groups excluded while this strategy is active. Users can
   *  enable each group independently in the solver controls. */
  reservationGroups?: StrategyReservationGroup[]
  /** pieces the strategy needs before it's worth running; if the library
   *  can't supply them the UI says to avoid this voyage and wait */
  requirements?: {
    modIds?: string[]
    areaTypes?: ChartAreaType[]
    count: number
    label: string
  }[]
  /** explicit 🔖 keep-wizard chart types; when present they replace the
   *  requirement-derived ones, so banking can be more granular than
   *  readiness (issue #21: split Starfish from boxes, box types from each
   *  other, voyage rares from adjacent rares). keep = default bank count. */
  bankTypes?: {
    label: string
    modIds?: string[]
    areaTypes?: ChartAreaType[]
    keep: number
  }[]
  /** a border roll the strategy hinges on (readiness warns if not entered) */
  requiresBorderId?: { id: string; label: string }
  /** what to do instead while pieces are missing */
  waitHint?: string
  /** this strategy is allowed to place rare-implicit charts (Divine strats) */
  allowRareImplicits?: boolean
  /** this strategy is allowed to place Rare Fracture charts (Meatfish) */
  allowFractureCharts?: boolean
  /** Milky's in-game search string highlighting this strategy's keeper charts */
  searchRegex?: string
  /** extra links shown on the card (trade searches, guides) */
  extraLinks?: { label: string; url: string }[]
}

/** rare-monster implicit charts are Divine-strategy fuel: nothing else may
 *  use them (the solver holds them back everywhere except the Divine strats) */
export const RARE_IMPLICITS = ['adj-rare-1', 'adj-rare-2', 'voy-rare'] as const

/** Rare Fracture charts are Meatfish fuel: fracturing multiplies the giga-rare
 *  farm, so only Meatfish may spend them (held back everywhere else) */
export const MEATFISH_FUEL = ['voy-fracture'] as const

/** Milky's master keeper regex - every mod worth saving, across all strats */
export const ALL_GOOD_MODS_REGEX =
  '"at least|cannot drop|poss|fract|bottle|divine|arca|oper|star|pantheon|belt|lantern|4000 w|strongbo|rare monsters in all voy|sulphur found in all"'

const CENTER = [4]
const EDGES = [1, 3, 5, 7]

// Milky's exact Meatfish board (from his planner, screenshotted 2026-07-28):
// corners at 0/2/7... rendered as effective edges [N,E,S,W] per cell.
// 10 connections, all linked to the ⚓ start; cell 6's south arm dangles off-board.
const T = true
const F = false
const MEATFISH_LAYOUT: Edges[] = [
  [F, T, T, F], // 0 corner
  [F, T, T, T], // 1 T-junction
  [F, F, T, T], // 2 corner
  [T, F, T, F], // 3 straight
  [T, T, T, F], // 4 T-junction
  [T, F, T, T], // 5 T-junction
  [T, F, T, F], // 6 straight (start; south dangles off-board)
  [T, T, F, F], // 7 corner
  [T, F, F, T], // 8 corner
]

// Milky's exact Magic Ethereal board: a full cross at centre, 11 connections;
// cells 6 and 7 have south arms dangling off-board.
const ETHEREAL_LAYOUT: Edges[] = [
  [F, T, T, F], // 0 corner
  [F, T, T, T], // 1 T-junction
  [F, F, T, T], // 2 corner
  [T, T, T, F], // 3 T-junction
  [T, T, T, T], // 4 crossing
  [T, F, T, T], // 5 T-junction
  [T, F, T, F], // 6 straight (start)
  [T, T, T, F], // 7 T-junction
  [T, F, F, T], // 8 corner
]

// the ONE chart Speedrun puts in the centre: Diviner's / Operative's boxes or
// Messages in a Bottle (Arcanist's and generic boxes don't qualify)
export const SPEEDRUN_CENTER_MODS = [
  'adj-divbox-1', 'adj-divbox-2',
  'adj-opbox-1', 'adj-opbox-2',
  'adj-msg-1', 'adj-msg-2',
]
const NOT_CENTER = [0, 1, 2, 3, 5, 6, 7, 8]

const MEATFISH_RESERVATION: StrategyReservationGroup = {
  id: 'meatfish',
  label: 'Meatfish（肉鱼）',
  modIds: [
    'adj-star-1',
    'adj-star-2',
    'adj-pantheon',
    'adj-lantern',
    'voy-possess',
    'voy-fracture',
    'voy-noequip',
    'adj-wisps-1',
    'adj-wisps-2',
  ],
  areaTypes: ['sea-pillars'],
}

const ETHEREAL_RESERVATION: StrategyReservationGroup = {
  id: 'ethereal',
  label: '魔法虚无（Magic Ethereal）',
  modIds: [
    'adj-lantern',
    'voy-noequip',
    'adj-wisps-1',
    'adj-wisps-2',
    'adj-magic-1',
    'adj-magic-2',
    'voy-minmagic',
  ],
}

const DIVINE_RESERVATION_MODS = [
  ...RARE_IMPLICITS,
  'adj-star-1',
  'adj-star-2',
  'adj-box-1',
  'adj-box-2',
  'adj-box-3',
]

const divineReservation = (includeSpeedrunCentres: boolean): StrategyReservationGroup => ({
  id: 'divine',
  label: '神圣石策略',
  modIds: includeSpeedrunCentres
    ? [...DIVINE_RESERVATION_MODS, ...SPEEDRUN_CENTER_MODS]
    : DIVINE_RESERVATION_MODS,
  areaTypes: ['sea-pillars', 'pelagic-abyss'],
})

// "Alc & Go" highway: three vertical lanes capped at the top,
// joined along the bottom row. 8 connections, all reaching the ⚓ start.
const ALC_GO_LAYOUT: Edges[] = [
  [F, F, T, F], // 0 end (lane cap)
  [F, F, T, F], // 1 end
  [F, F, T, F], // 2 end
  [T, F, T, F], // 3 straight
  [T, F, T, F], // 4 straight
  [T, F, T, F], // 5 straight
  [T, T, F, F], // 6 corner (start)
  [T, T, F, T], // 7 T-junction
  [T, F, F, T], // 8 corner
]

export const STRATEGIES: StrategyDef[] = [
  {
    id: 'alc-and-go',
    name: '点金就跑（Alc & Go）',
    tagline: '烧掉没人要的海图 - 单车道高速公路，祈祷随机遭遇。',
    source: { label: 'Milky 的策略', url: '' },
    guide: [
      '只使用其他策略都不需要的海图 - 默认会保留各策略的存图，也可在“求解设置”中独立开关保护。',
      '组成单车道高速公路（三条车道沿底部连接）- 或者随形状怎么都能摆。',
      '不在乎格子上是什么：你只是为了零散战利品、硫磺和随机遭遇。',
      '点金、出发、放满灯笼、点光一切、走人。在正式跑图之间反复循环。',
    ],
    weights: {
      'self:quant': 2,
      'self:sulph': 2,
      'voyage:sulph': 2,
      'voyage:quant': 2,
    },
    rules: [],
    layout: ALC_GO_LAYOUT,
    layoutPenalty: 15, // a preference, not a law - "whatever works"
    reservationGroups: [divineReservation(true), MEATFISH_RESERVATION, ETHEREAL_RESERVATION],
  },
  {
    id: 'anchorfield-fishing',
    name: '锚地钓鱼（ANCHORFIELD FISHING）',
    badge: 'NEW',
    tagline:
      '钓取混沌→神圣祝福，然后打开锚地 - 要么中大奖要么下一把。',
    source: { label: '社区策略', url: '' },
    guide: [
      '放入 ONE 张锚地海图 - 随便哪张，只要把它洗成不错的物品数量即可。一张就够。',
      '其余格子放增加物品数量的海图，并用混沌石把垃圾海图洗成高数量。',
      '洗出了“每稀有怪 +1 混沌石掉落”边框？考虑改用增加稀有怪物海图代替数量图（相邻稀有怪图默认可以自由消耗）。',
      '正常跑图，只求 ONE 个祝福：混沌石变成神圣石。探索除锚地以外的所有区域 - 锚地直接碾过去，先不要开里面的沉没战利品。',
      '找到祝福了？冲刺回锚地，打开每一个沉没战利品 - 每个都掉几个混沌石，20% 的混沌→神圣转化把它们变成神圣石。',
      '没找到祝福且灯笼还剩 6 个左右？还是把锚地战利品开了换点零碎，或者直接走人进下一把 - 你钓的是头奖，不是平民战利品。',
    ],
    weights: {
      'self:quant': 10,
      'voyage:quant': 8,
      'border:chaos': 6,
      'border:quantconn': 5,
      'self:pack': 2,
      'voyage:sulph': 1,
    },
    rules: [
      // the ONE Anchorfield chart can sit anywhere - it just has to be aboard
      { cells: [0, 1, 2, 3, 4, 5, 6, 7, 8], areaTypes: ['anchorfield'], bonus: 40 },
    ],
    requirements: [
      { areaTypes: ['anchorfield'], count: 1, label: '锚地海图' },
    ],
    waitHint: '先跑点金就跑或竞速保险箱，直到掉落一张锚地海图 - 任何稀有度都行。',
    searchRegex: '"anchorfield|m q.*(1[2-9].|[2-9]..)%"',
  },
  {
    id: 'milky-speedrun',
    name: '竞速保险箱（Speedrun Strongboxes）',
    tagline: 'Milky 的过渡farm - 烧掉多余海图，开保险箱，进图出图。',
    source: { label: 'Milkybk_ - 万火诅咒增益与我的策略', url: 'https://www.youtube.com/watch?v=gVKQhYxeavk' },
    guide: [
      '在正中心放 ONE 张特工图 - 它是最好的（每把几个神圣的圣甲虫）；预言家图或瓶中信息是稳定的备选。',
      '跑图前先把海图洗到 110%+ 物品数量 - 跑完之后没法再洗，而数量会放大保险箱。',
      '把最高物品数量的海图放四边。',
      '其余都是其他策略不需要的垃圾 - 角落只是让连接线对齐。',
      '带点金、重铸和崇高石进去，开箱前给每个保险箱上增益。',
      '如果出现 Filthscrabble 边框（约 4,000 硫磺的 boss），求解器会把你的最高硫磺海图固定到那块格子上。',
      '速度至上：放灯笼、点光一切、开箱、走人。就算垃圾图也能掉出一两个神圣的零散战利品。',
      '神圣石、Meatfish 和魔法虚无的存图默认会被保留；不想保留的保护项可在“求解设置”中单独关闭。',
    ],
    weights: {
      'adjacent:opbox': 10,
      'adjacent:divbox': 7,
      'adjacent:msg': 7,
      'self:quant': 8,
      'voyage:quant': 5,
      'voyage:sulph': 3,
      'self:sulph': 3,
      'border:quantconn': 6,
      'border:divine': 4,
      'border:exalt': 3,
      'border:ancient': 3,
    },
    reservationGroups: [divineReservation(false), MEATFISH_RESERVATION, ETHEREAL_RESERVATION],
    rules: [
      // one centre chart, never a second one wasted elsewhere. Operative's
      // outranks the fallbacks (Milky: "won't yield as much, but consistent")
      { cells: CENTER, modIds: ['adj-opbox-1', 'adj-opbox-2'], bonus: 55 },
      { cells: CENTER, modIds: ['adj-divbox-1', 'adj-divbox-2', 'adj-msg-1', 'adj-msg-2'], bonus: 40 },
      { cells: NOT_CENTER, modIds: SPEEDRUN_CENTER_MODS, bonus: -40 },
      // 150%+ quant charts adjacent to the centre (continuous: higher = better)
      { cells: EDGES, rewardStat: { stat: 'quantity', per: 6 }, bonus: 0 },
      // Filthscrabble border: park the highest-sulphur chart on its tile
      { nearBorderId: 'b-octoboss', rewardStat: { stat: 'sulphur', per: 8 }, bonus: 0 },
    ],
    requirements: [
      { modIds: SPEEDRUN_CENTER_MODS, count: 1, label: '预言家/特工/信息图（中心）' },
    ],
    waitHint: '先手动跑图直到掉落一张。',
    searchRegex: '"bottle|divine|oper"',
  },
  {
    id: 'milky-meatfish',
    name: 'Meatfish（肉鱼）',
    tagline: 'Milky 的大杀器 - 被附身、万神殿加持的巨型海星稀有怪，暗金如雨下。',
    source: { label: 'Milkybk_ - 万火诅咒增益与我的策略', url: 'https://www.youtube.com/watch?v=gVKQhYxeavk' },
    guide: [
      'Milky 的完整阵容（他的表）：2× 海星、1× 万神殿、2× 海柱（角落）、2× 黄金灯笼、1× 被附身稀有怪、1× 不掉落装备。',
      '海星永远在上中和下中；万神殿只放右中；黄金灯笼最好居中 - 任意海图形状都行。',
      '“怪物不会掉落装备”是头奖组件 - 稀有怪碎裂作为备选。可选：把万神殿换成 4k 精魄。',
      '收集航程中所有灯笼：约 280% 数量、840 稀有度。杀光巨型稀有怪。获得猎首/法血。',
      '风险极高，全押或全输 - 不要稀释它。先跑竞速保险箱直到凑齐组件。',
    ],
    weights: {
      'adjacent:star': 10,
      'adjacent:pantheon': 10,
      'adjacent:lantern': 10,
      'voyage:possess': 10,
      'voyage:fracture': 8,
      'border:rare': 9,
      'self:quant': 4,
      'self:rarity': 3,
    },
    rules: [
      // Placement rules: Starfish ALWAYS top/bottom-middle, Pantheon
      // ONLY right-middle, Golden Lantern preferably centre - any chart shape.
      // Bonuses outweigh the (soft) layout so location wins over exact lines;
      // negative bonuses keep the locked pieces out of every other square.
      { cells: [1, 7], modIds: ['adj-star-1', 'adj-star-2'], bonus: 80 },
      { cells: [0, 2, 3, 4, 5, 6, 8], modIds: ['adj-star-1', 'adj-star-2'], bonus: -80 },
      { cells: [5], modIds: ['adj-pantheon'], bonus: 80 },
      { cells: [0, 1, 2, 3, 4, 6, 7, 8], modIds: ['adj-pantheon'], bonus: -80 },
      { cells: [4], modIds: ['adj-lantern'], bonus: 40 },
      // Sea-Pillars belong in the corners (their rain juices their own tile)
      { cells: [0, 2, 6, 8], areaTypes: ['sea-pillars'], bonus: 40 },
      { cells: [1, 3, 4, 5, 7], areaTypes: ['sea-pillars'], bonus: -40 },
    ],
    layout: MEATFISH_LAYOUT,
    // soft: a full-board layout deviation (9 cells × 6) must still cost less
    // than any single piece bonus, so lines always yield to piece locations
    layoutPenalty: 6,
    requirements: [
      // Milky's sheet composition (2+1+2+2+1+1 = 9 charts)
      { modIds: ['adj-star-1', 'adj-star-2'], count: 2, label: '巨型海星图' },
      { modIds: ['adj-pantheon', 'adj-wisps-1', 'adj-wisps-2'], count: 1, label: '万神殿（或 4k 精魄）图' },
      { areaTypes: ['sea-pillars'], count: 2, label: '海柱图（角落）' },
      { modIds: ['adj-lantern'], count: 2, label: '黄金灯笼图' },
      { modIds: ['voy-possess'], count: 1, label: '被附身稀有怪图' },
      { modIds: ['voy-noequip', 'voy-fracture'], count: 1, label: '不掉落装备（或碎裂）图' },
    ],
    waitHint: '期间先跑竞速保险箱。',
    searchRegex: '"cannot|poss|lantern|pantheon"',
    allowFractureCharts: true,
  },
  {
    id: 'milky-ethereal',
    name: '魔法虚无（Magic Ethereal）',
    tagline: 'Milky 的魔法怪物变体 - 精魄、灯笼，一切至少为魔法等级。',
    source: { label: 'Milkybk_ - 万火诅咒增益与我的策略', url: 'https://www.youtube.com/watch?v=gVKQhYxeavk' },
    guide: [
      '⚠ 实战反馈目前差强人意（Palsteron 跑了约 5 神圣）- Milky 已转向稀有怪build（Meatfish）。保留供参考。',
      '还原 Milky 的精确棋盘布局：3 个角落、4 个 T 型、1 个十字、1 个直通 - 11 条连接。',
      '精魄图放四边，黄金灯笼放角落，十字图正中间。',
      '不堆稀有怪，改堆魔法怪物：所有怪物至少魔法 + 增加魔法怪物。',
      '使用虫群浸染的深海潜水器区域 - 那里会生成多得多的怪物可供转化。',
      '比 Meatfish 更依赖“怪物不会掉落装备” - 这里它是最大的倍率。',
    ],
    weights: {
      'adjacent:wisps': 10,
      'voyage:minmagic': 10,
      'adjacent:magic': 9,
      'voyage:magic': 9,
      'adjacent:lantern': 8,
      'border:minmagic': 8,
      'self:quant': 4,
      'self:pack': 3,
    },
    rules: [
      // icon cells from Milky's planner: wisps on the cross, lanterns on corners
      { cells: EDGES, modIds: ['adj-wisps-1', 'adj-wisps-2'], bonus: 6 },
      { cells: [0, 2, 8], modIds: ['adj-lantern'], bonus: 5 },
      { cells: CENTER, modIds: ['adj-magic-1', 'adj-magic-2', 'adj-wisps-1', 'adj-wisps-2'], bonus: 5 },
    ],
    layout: ETHEREAL_LAYOUT,
    requirements: [
      { modIds: ['adj-wisps-1', 'adj-wisps-2'], count: 4, label: '荒野精魄图' },
      { modIds: ['adj-lantern'], count: 3, label: '黄金灯笼图' },
    ],
    waitHint: '期间先跑竞速保险箱。',
  },
  {
    id: 'divine-border-rares',
    name: '神圣石边框稀有怪',
    tagline:
      '洗出神圣石边框，把海柱图放在上面，让那块格子淹没在稀有怪中 - 每个稀有怪掉一个神圣石。',
    source: { label: 'Milky 的策略', url: '' },
    guide: [
      '用亡者硫磺重洗边框直到出现“每稀有怪 +1 神圣石掉落” - 这是该机制两个真正的头奖之一。',
      '在棋盘上输入你的边框 - 求解器把你的海柱图固定到神圣石格子上（它的海柱会把额外稀有怪浇进那块区域）。',
      '喂怪图是“+5 保险箱”相邻图：把保险箱本身洗出“怪物之流”（+4 稀有怪）和“稀有度”（+3）- 每箱 7 稀有怪，各一个神圣石。一张 +5 图 ≈ 35 神圣；围绕格子放三张 ≈ 105。',
      '海星图在保险箱图不足时也可以喂。',
      '5× 增加稀有怪物图填满其余 - 那块格子上的每个稀有怪都是一次神圣石掉落。',
    ],
    weights: {
      'adjacent:rare': 10,
      'voyage:rare': 10,
      'border:rare': 10,
      'adjacent:star': 8,
      'adjacent:box': 8,
      'voyage:possess': 6,
      'border:divine': 10,
      'self:pack': 3,
    },
    rules: [
      // the Sea-Pillar chart sits ON whichever tile the Divine border touches
      { nearBorderId: 'b-divine', areaTypes: ['sea-pillars'], bonus: 100 },
      // feeders shoot INTO the Divine tile from beside it. "+5 Strongboxes"
      // (7 rares per box when rolled = 35 divines) outranks lower tiers/starfish
      { nearBorderId: 'b-divine', adjacentToBorder: true, modIds: ['adj-box-3'], bonus: 35 },
      { nearBorderId: 'b-divine', adjacentToBorder: true, modIds: ['adj-box-1', 'adj-box-2'], bonus: 22 },
      { nearBorderId: 'b-divine', adjacentToBorder: true, modIds: ['adj-star-1', 'adj-star-2'], bonus: 15 },
    ],
    requirements: [
      { areaTypes: ['sea-pillars'], count: 1, label: '海柱图' },
      {
        modIds: ['adj-star-1', 'adj-star-2', 'adj-box-1', 'adj-box-2', 'adj-box-3'],
        count: 3,
        label: '海星或保险箱图',
      },
      { modIds: ['adj-rare-1', 'adj-rare-2', 'voy-rare'], count: 5, label: '增加稀有怪图' },
    ],
    // banking is more granular than readiness (issue #21): only the big
    // generic boxes (+2-4/+5) are Divine-mandatory - typed boxes cap at +3
    // and stay free for Speedrun; voyage-wide rares outrank adjacent ones
    bankTypes: [
      { label: '海柱图', areaTypes: ['sea-pillars'], keep: 1 },
      { label: '巨型海星图', modIds: ['adj-star-1', 'adj-star-2'], keep: 3 },
      { label: '保险箱图（+2-4 / +5）', modIds: ['adj-box-2', 'adj-box-3'], keep: 3 },
      { label: '保险箱图（+1）', modIds: ['adj-box-1'], keep: 0 },
      { label: '增加稀有怪图（全航行）', modIds: ['voy-rare'], keep: 6 },
      { label: '增加稀有怪图（相邻）', modIds: ['adj-rare-1', 'adj-rare-2'], keep: 0 },
    ],
    requiresBorderId: { id: 'b-divine', label: '“+1 神圣石”边框词缀（先输入你的边框）' },
    waitHint: '先跑竞速保险箱，直到凑齐组件并洗出神圣石边框。',
    searchRegex: '"rare monsters in all voy|strongbox"',
    allowRareImplicits: true,
  },
  {
    id: 'cutedog-divine-boxes',
    name: '神圣石保险箱',
    tagline:
      'cutedog_ 的神圣石边框变体 - 远洋深渊放在神圣石格子上，任意保险箱喂它，每个洗好的保险箱 7 个神圣石。',
    source: { label: 'cutedog_（Twitch）', url: 'https://www.twitch.tv/cutedog_' },
    guide: [
      '需要“每稀有怪 +1 神圣石掉落”边框。把高 % 怪物群规模的远洋深渊图放在那块格子上。',
      '神圣石格子旁边放 3× 保险箱相邻图（任意类型）- 每张射进来的保险箱最多 7 个必掉神圣石。',
      '洗保险箱：“额外 3 个稀有怪”前缀 = 3 神圣，“怪物之流”前缀 = 4。同一个箱子上两个都有 = 7，很难洗。',
      '其余所有格子：全航行增加稀有怪物。',
      '在交易站低价买好图（下方链接）- 私聊 “fastge”。浏览时用 120%+ 数量正则。',
    ],
    weights: {
      'voyage:rare': 10,
      'adjacent:rare': 8,
      'border:rare': 10,
      'adjacent:box': 9,
      'adjacent:divbox': 8,
      'adjacent:arcbox': 8,
      'adjacent:opbox': 8,
      'border:divine': 10,
      'self:pack': 6,
    },
    rules: [
      // Pelagic Abyss (high pack size) sits ON the Divine-border tile
      { nearBorderId: 'b-divine', areaTypes: ['pelagic-abyss'], bonus: 80 },
      { nearBorderId: 'b-divine', rewardStat: { stat: 'packsize', per: 8 }, bonus: 0 },
      // any strongbox adjacent charts feed the Divine tile from beside it
      {
        nearBorderId: 'b-divine',
        adjacentToBorder: true,
        modIds: [
          'adj-box-1', 'adj-box-2', 'adj-box-3',
          'adj-divbox-1', 'adj-divbox-2',
          'adj-arcbox-1', 'adj-arcbox-2',
          'adj-opbox-1', 'adj-opbox-2',
        ],
        bonus: 25,
      },
    ],
    requirements: [
      {
        areaTypes: ['pelagic-abyss'],
        count: 1,
        label: '远洋深渊图（高怪物群规模）',
      },
      {
        modIds: [
          'adj-box-1', 'adj-box-2', 'adj-box-3',
          'adj-divbox-1', 'adj-divbox-2',
          'adj-arcbox-1', 'adj-arcbox-2',
          'adj-opbox-1', 'adj-opbox-2',
        ],
        count: 3,
        label: '保险箱相邻图（任意类型）',
      },
      { modIds: ['voy-rare'], count: 5, label: '增加稀有怪（全航行）图' },
    ],
    bankTypes: [
      { label: '远洋深渊图（高怪物群规模）', areaTypes: ['pelagic-abyss'], keep: 1 },
      { label: '保险箱图（+2-4 / +5）', modIds: ['adj-box-2', 'adj-box-3'], keep: 3 },
      { label: '预言家保险箱图', modIds: ['adj-divbox-1', 'adj-divbox-2'], keep: 0 },
      { label: '秘术家保险箱图', modIds: ['adj-arcbox-1', 'adj-arcbox-2'], keep: 0 },
      { label: '特工保险箱图', modIds: ['adj-opbox-1', 'adj-opbox-2'], keep: 0 },
      { label: '增加稀有怪图（全航行）', modIds: ['voy-rare'], keep: 6 },
    ],
    requiresBorderId: { id: 'b-divine', label: '“+1 神圣石”边框词缀（先输入你的边框）' },
    waitHint: '先跑竞速保险箱，直到凑齐组件并洗出神圣石边框。',
    searchRegex: '"m q.*(1[2-9].|[2-9]..)%"',
    allowRareImplicits: true,
    extraLinks: [
      { label: '交易搜索：便宜好图', url: 'https://www.pathofexile.com/trade/search/Allflame/9zRn7YLRHK' },
    ],
  },
]

export const strategyById = new Map(STRATEGIES.map((s) => [s.id, s]))
