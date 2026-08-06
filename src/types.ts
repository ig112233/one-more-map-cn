// Core data model for the Voyage Board solver.
// NOTE: built pre-launch from reveal coverage - field shapes are designed to be
// easy to adjust once real in-game data is available (see RESEARCH.md).

/** Reward dimensions a modifier can affect (from the datamined 3.29 mod pools). */
export type Stat =
  | 'currency'
  | 'gold'
  | 'scarabs'
  | 'divcards'
  | 'essences' // Imprisoned Monsters
  | 'spirits' // Tormented Spirits
  | 'wisps' // Wildwood Wisp empowerment
  | 'rares'
  | 'magicmonsters'
  | 'sulphur'
  | 'packsize'
  | 'quantity'
  | 'rarity'
  | 'uniques' // unique ring/amulet/belt conversion
  | 'treasure' // lootable-object spawns: strongboxes, anchors, lockers, barrels, messages, fish, lanterns, altars
  | 'exp' // experience gain
  | 'preserve' // chance charts aren't consumed

export const ALL_STATS: Stat[] = [
  'currency',
  'gold',
  'scarabs',
  'divcards',
  'essences',
  'spirits',
  'wisps',
  'rares',
  'magicmonsters',
  'sulphur',
  'packsize',
  'quantity',
  'rarity',
  'uniques',
  'treasure',
  'exp',
  'preserve',
]

/** compact labels for tight UI spots (tiles, pills, grid squares) */
export const STAT_SHORT: Record<Stat, string> = {
  currency: '通货',
  gold: '金币',
  scarabs: '圣甲虫',
  divcards: '预言卡',
  essences: '精髓',
  spirits: '幽魂',
  wisps: '精魄',
  rares: '稀有怪',
  magicmonsters: '魔法怪',
  sulphur: '硫磺',
  packsize: '群规模',
  quantity: '数量',
  rarity: '稀有度',
  uniques: '暗金',
  treasure: '宝藏',
  exp: '经验',
  preserve: '保留',
}

export const STAT_LABELS: Record<Stat, string> = {
  currency: '通货',
  gold: '金币',
  scarabs: '圣甲虫',
  divcards: '预言卡',
  essences: '被囚禁的怪物（精髓）',
  spirits: '折磨之灵',
  wisps: '荒野精魄',
  rares: '稀有怪物',
  magicmonsters: '魔法怪物',
  sulphur: '亡者硫磺',
  packsize: '怪物群规模',
  quantity: '物品数量',
  rarity: '物品稀有度',
  uniques: '暗金物品',
  treasure: '宝藏',
  exp: '经验',
  preserve: '海图保留',
}

/** What each reward axis covers, shown as a hover tooltip on the weight sliders. */
export const STAT_DESC: Record<Stat, string> = {
  currency: '通货宝珠 - 来自秘术家保险箱与边框掉落宝珠的词缀（神圣石、崇高石、混沌石…）',
  gold: '金币 - 来自装备转金币词缀与地面效果海图',
  scarabs: '圣甲虫 - 来自特工保险箱与圣甲虫边框词缀',
  divcards: '预言卡 - 来自预言家保险箱与堆叠卡组边框',
  essences: '被囚禁的怪物（精髓） - 相邻区域中额外被精髓囚禁的怪物',
  spirits: '折磨之灵 - 相邻区域中额外的幽魂牢笼',
  wisps: '荒野精魄 - 怪物强化（更肥的收益，更难打的战斗）',
  rares: '稀有怪物 - 增加稀有怪数量、群组与稀有怪掉落边框',
  magicmonsters: '魔法怪物 - 增加魔法怪物数量',
  sulphur: "亡者硫磺 - 本联赛的工艺通货",
  packsize: '怪物群规模 - 每个区域更多怪物（螃蟹、章鱼、海兽、溺亡者）',
  quantity: '物品数量 - 增加掉落物品的数量',
  rarity: '物品稀有度 - 增加掉落物品的稀有度',
  uniques: '暗金物品 - 戒指/项链/腰带以暗金掉落的几率',
  treasure:
    '宝藏 - 区域中额外生成的可拾取物件：保险箱、宝藏锚点、海盗储物柜、木桶、瓶中信息、珍稀鱼类、黄金灯笼、祭坛与宝藏小头目',
  exp: '经验 - 来自经验边框的额外经验获取',
  preserve: '海图保留 - 开始航行时不消耗相邻海图的几率',
}

/** Who a voyage modifier applies to. */
export type Scope = 'self' | 'adjacent' | 'global'

export interface ModEffect {
  stat: Stat
  /** percentage value; treated multiplicatively as (1 + percent/100) */
  percent: number
}

/** A voyage modifier definition (on a chart). */
export interface VoyageModDef {
  id: string
  text: string
  /** Simplified-Chinese display text (fallback to text when absent) */
  zh?: string
  /** localized clipboard lines that map to this canonical modifier id */
  aliases?: readonly string[]
  /** compact label for count-based mods where the scored percent is only a heuristic */
  short?: string
  scope: Scope
  effects: ModEffect[]
  /** some mods scale per connection the chart has (or reward fewer connections) */
  scaling?: 'connections' | 'inverse-connections'
}

/** A border modifier definition (rolled on the 12 board edge segments). */
export interface BorderModDef {
  id: string
  text: string
  /** Simplified-Chinese display text (fallback to text when absent) */
  zh?: string
  /** alternate live or legacy tooltip text accepted by the border OCR matcher */
  aliases?: readonly string[]
  /** compact display label for the border pill */
  short?: string
  effects: ModEffect[]
  /** meta-mod: % increased magnitude of the touched chart's own modifiers */
  magnitude?: number
  /** effects applied per matched connection the touched chart has (can be negative) */
  perConnEffects?: ModEffect[]
}

/** Edge connectors, clockwise from North: [N, E, S, W]. */
export type Edges = [boolean, boolean, boolean, boolean]

/** Canonical destination/area type printed between a Chart name and Area Level. */
export type ChartAreaType =
  | 'anchorfield'
  | 'brine-kings-domain'
  | 'clam-infested-shelf'
  | 'diving-shoals'
  | 'eldritch-depths'
  | 'hazardous-depths'
  | 'infested-bathyspheres'
  | 'lost-ruins'
  | 'abyssal-plain'
  | 'pelagic-abyss'
  | 'seafloor-ridges'
  | 'sea-pillars'
  | 'sunken-totems'
  | 'undersea-groves'
  | 'kisharas-rest'

/** A chart instance owned by the player. */
export interface ChartData {
  uid: string
  name: string
  level: number
  edges: Edges
  /** locale-independent destination/area type used by curated strategies */
  areaType?: ChartAreaType
  /** ids into VOYAGE_MODS; the revealed implicit (adjacent/voyage) mod */
  modIds: string[]
  /** the revealed implicit line verbatim, shown even if it matched no known mod */
  implicitText?: string
  /** the chart's own area reward stats, read from the item header (self-scope) */
  rewards?: ModEffect[]
  /** canonical chart connector shape name (Straight/Corner/Junction/End/Crossing) */
  shape?: string
  /** unparsed mod lines kept from import so nothing is silently lost */
  rawText?: string
  /** marked to survive "Finish Voyage" (won't be consumed) */
  preserved?: boolean
}

/** A chart placed on the board. */
export interface Placement {
  chartUid: string
  /** 90° clockwise rotations applied to the chart's edges (0–3) */
  rotation: number
}

/** 9 cells, row-major (index = row * 3 + col). null = empty. */
export type Board = (Placement | null)[]

/**
 * 12 border segments, each touching exactly one tile:
 * indices 0–2 top (cols 0–2), 3–5 right (rows 0–2),
 * 6–8 bottom (cols 0–2), 9–11 left (rows 0–2).
 * Value is a BorderModDef id or null.
 */
export type Borders = (string | null)[]

/** Connectivity rule - the real rule is unconfirmed pre-launch, so it's a setting. */
export type ConnectivityMode = 'any' | 'connected' | 'strict'

/** user reward priorities, keyed by reward-type key (see logic/rewards.ts) */
export type Weights = Record<string, number>

/** the Voyage starts at the bottom-left square (row 2, col 0) */
export const START_CELL = 6

export const emptyBoard = (): Board => Array(9).fill(null)
export const emptyBorders = (): Borders => Array(12).fill(null)

/** Which tile does border segment i touch? Returns board cell index. */
export function borderTouches(i: number): number {
  if (i < 3) return i // top row
  if (i < 6) return (i - 3) * 3 + 2 // right col
  if (i < 9) return 6 + (i - 6) // bottom row
  return (i - 9) * 3 // left col
}
