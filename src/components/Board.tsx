import { useState, type ReactNode } from 'react'
import { BORDER_MODS, borderModById, modText, voyageModById } from '../data/mods'
import { rotateEdges } from '../logic/connectivity'
import { buildSingleChartSearch } from '../logic/regex'
import type { Board, Borders, ChartData, Placement } from '../types'
import { START_CELL, STAT_LABELS, STAT_SHORT } from '../types'
import { tooltipProps } from './Tooltip'

interface Props {
  board: Board
  borders: Borders
  charts: Map<string, ChartData>
  perTile: number[]
  selectedCell: number | null
  highlightUid: string | null
  /** only flag connector mismatches as errors under the strict rule */
  strictMode: boolean
  placingChart: ChartData | null
  onCellClick: (i: number) => void
  onRemove: (i: number) => void
  onRotate: (i: number) => void
  onBorderChange: (segment: number, id: string | null) => void
  onTogglePreserve: (uid: string) => void
  onFinishVoyage: () => void
  onCopySequence: () => void
  voyageMsg: string
  /** a copy/preserve step-through is active - hide the action buttons to avoid confusion */
  sequenceActive?: boolean
  /** the solve control, rendered front-and-centre above "Copy into game" */
  solveSlot?: ReactNode
}

function BorderSelect({
  value,
  onChange,
  seg,
}: {
  value: string | null
  onChange: (id: string | null) => void
  seg: number
  vertical?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const mod = value ? borderModById.get(value) : null
  const eff = mod?.effects[0]
  const filtered = BORDER_MODS.filter((m) => m.text.toLowerCase().includes(q.toLowerCase()))
  // keep the popover on-screen: right-column segments align right, left-column align left
  const align = seg >= 3 && seg <= 5 ? 'right' : seg >= 9 ? 'left' : 'center'

  const pick = (id: string | null) => {
    onChange(id)
    setOpen(false)
  }

  return (
    <span
      className={`bslot ${mod ? 'filled' : ''}`}
      title={modText(mod ?? { text: '边框段：点击搜索' })}
      onClick={() => {
        setQ('')
        setOpen(true)
      }}
    >
      {mod ? (
        <span>
          {mod.short ??
            (eff ? `+${eff.percent}% ${STAT_SHORT[eff.stat]}` : mod.magnitude ? `${mod.magnitude}% 强度` : '✦')}
        </span>
      ) : (
        <span className="bslot-empty">·</span>
      )}
      {open && (
        <>
          <span
            className="bpop-backdrop"
            onClick={(e) => {
              e.stopPropagation()
              setOpen(false)
            }}
          />
          <span className={`bpop bpop-${align}`} onClick={(e) => e.stopPropagation()}>
            <input
              autoFocus
              placeholder="搜索边框词缀…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setOpen(false)
                if (e.key === 'Enter' && filtered.length > 0) pick(filtered[0].id)
              }}
            />
            <span className="bpop-list">
              <button className="bpop-item muted" onClick={() => pick(null)}>
                无边框
              </button>
              {filtered.map((m) => (
                <button
                  key={m.id}
                  className={`bpop-item ${m.id === value ? 'active' : ''}`}
                  onClick={() => pick(m.id)}
                >
                  {m.short && <span className="bpop-short">{m.short}</span>}
                  <span className="bpop-full">{modText(m)}</span>
                </button>
              ))}
              {filtered.length === 0 && <span className="bpop-none">无匹配</span>}
            </span>
          </span>
        </>
      )}
    </span>
  )
}

type EdgeStatus = 'none' | 'connected' | 'open' | 'mismatch'

function Tile({
  placement,
  chart,
  score,
  selected,
  highlighted,
  placing,
  isStart,
  edgeStatus,
  onClick,
  onRemove,
  onRotate,
  onTogglePreserve,
}: {
  placement: Placement | null
  chart: ChartData | null
  score: number
  selected: boolean
  highlighted: boolean
  placing: boolean
  isStart: boolean
  edgeStatus: EdgeStatus[]
  onClick: () => void
  onRemove: () => void
  onRotate: () => void
  onTogglePreserve: () => void
}) {
  const [copied, setCopied] = useState(false)
  const startBadge = isStart ? (
    <span className="tile-start" title="航行从这里开始">
      ⚓ 起点
    </span>
  ) : null
  if (!placement || !chart) {
    return (
      <div className={`tile empty ${placing ? 'placing' : ''}`} onClick={onClick}>
        {startBadge}
        {placing ? '放在这里' : ''}
      </div>
    )
  }
  const edges = rotateEdges(chart.edges, placement.rotation)
  const mods = chart.modIds.map((id) => voyageModById.get(id)).filter(Boolean)
  const scopeLabel = { self: '本区域', adjacent: '相邻区域', global: '整个航行' }
  const tt = tooltipProps({
    title: chart.name,
    lines: [
      { text: `区域等级：${chart.level}${chart.shape ? ` · ${chart.shape}` : ''}`, cls: 'muted' },
      ...(chart.rewards ?? []).map((e) => ({
        text: `+${e.percent}% ${STAT_LABELS[e.stat]}`,
        cls: 'scope-self',
      })),
      ...mods.map((m) => ({
        text: `${modText(m!)}  (${scopeLabel[m!.scope]})`,
        cls: `scope-${m!.scope}`,
      })),
    ],
  })
  // show the implicit (adjacent/voyage) on the tile - it's the strategic mod
  const primary = mods.find((m) => m!.scope !== 'self') ?? mods[0]
  return (
    <div
      className={`tile ${selected ? 'selected' : ''} ${highlighted ? 'highlighted' : ''} ${chart.preserved ? 'preserved' : ''} ${primary ? `tscope-${primary.scope}` : ''}`}
      onClick={onClick}
      {...tt}
    >
      {(['n', 'e', 's', 'w'] as const).map((d, i) =>
        edges[i] ? <span key={d} className={`path-bar ${d} ${edgeStatus[i]}`} /> : null,
      )}
      {primary &&
        (primary.short ? (
          <div className="tile-duo">
            <span className="tile-duo-col">
              <span className={`tile-duo-pct scope-${primary.scope}`}>{primary.short}</span>
              <span className="tile-duo-label">
                {primary.scope === 'self'
                  ? '本区域'
                  : primary.scope === 'adjacent'
                    ? '相邻区域'
                    : '整个航行'}
              </span>
            </span>
          </div>
        ) : primary.effects[0] ? (
          <div className="tile-duo">
            <span className="tile-duo-col">
              <span className={`tile-duo-pct scope-${primary.scope}`}>
                +{primary.effects[0].percent}% {STAT_SHORT[primary.effects[0].stat]}
              </span>
              <span className="tile-duo-label">
                {primary.scope === 'self'
                  ? '本区域'
                  : primary.scope === 'adjacent'
                    ? '相邻区域'
                    : '整个航行'}
              </span>
            </span>
          </div>
        ) : (
          <div className={`tile-duo-text scope-${primary.scope}`}>{modText(primary)}</div>
        ))}
      {!primary && chart.implicitText && (
        <div className="tile-duo-text scope-global">{chart.implicitText}</div>
      )}
      {chart.preserved && (
        <span className="tile-preserved-badge" title="已保留：完成航行时不会消耗">
          🔒 保留
        </span>
      )}
      <div className="tile-actions">
        <button
          className={chart.preserved ? 'active' : ''}
          title={chart.preserved ? '已保留：取消标记以允许消耗' : '保留：完成航行时保留这张海图'}
          onClick={(e) => {
            e.stopPropagation()
            onTogglePreserve()
          }}
        >
          {chart.preserved ? '🔒' : '🔓'}
        </button>
        <button
          title="复制游戏内搜索串（名称+词缀）以找到这张精确的海图"
          onClick={(e) => {
            e.stopPropagation()
            navigator.clipboard.writeText(buildSingleChartSearch(chart)).catch(() => {})
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1200)
          }}
        >
          {copied ? '✓' : '⧉'}
        </button>
        <button
          title="旋转"
          onClick={(e) => {
            e.stopPropagation()
            onRotate()
          }}
        >
          ⟳
        </button>
        <button
          title="移除"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
        >
          ✕
        </button>
      </div>
      {startBadge}
      <span className="tile-lvl">lv {chart.level}</span>
      <div className="tile-score">{score.toFixed(1)}</div>
    </div>
  )
}

const DIRS = [
  { dr: -1, dc: 0, opp: 2 }, // N
  { dr: 0, dc: 1, opp: 3 }, // E
  { dr: 1, dc: 0, opp: 0 }, // S
  { dr: 0, dc: -1, opp: 1 }, // W
]

export function BoardView(props: Props) {
  const { board, borders, charts } = props

  const edgesAt = (i: number) => {
    const p = board[i]
    if (!p) return null
    const c = charts.get(p.chartUid)
    return c ? rotateEdges(c.edges, p.rotation) : null
  }

  const edgeStatusFor = (i: number): EdgeStatus[] => {
    const e = edgesAt(i)
    if (!e) return ['none', 'none', 'none', 'none']
    const r = Math.floor(i / 3)
    const c = i % 3
    return DIRS.map((d, k) => {
      if (!e[k]) return 'none' as EdgeStatus
      const nr = r + d.dr
      const nc = c + d.dc
      if (nr < 0 || nr > 2 || nc < 0 || nc > 2) return 'open' as EdgeStatus
      const ne = edgesAt(nr * 3 + nc)
      if (!ne) return 'open' as EdgeStatus
      if (ne[d.opp]) return 'connected' as EdgeStatus
      return (props.strictMode ? 'mismatch' : 'open') as EdgeStatus
    })
  }

  const tile = (i: number) => {
    const p = board[i]
    return (
      <Tile
        key={i}
        placement={p}
        chart={p ? charts.get(p.chartUid) ?? null : null}
        score={props.perTile[i]}
        selected={props.selectedCell === i}
        highlighted={!!p && p.chartUid === props.highlightUid}
        placing={!!props.placingChart && !p}
        isStart={i === START_CELL}
        edgeStatus={edgeStatusFor(i)}
        onClick={() => props.onCellClick(i)}
        onRemove={() => props.onRemove(i)}
        onRotate={() => props.onRotate(i)}
        onTogglePreserve={() => p && props.onTogglePreserve(p.chartUid)}
      />
    )
  }
  const border = (seg: number, vertical?: boolean) => (
    <BorderSelect
      key={`b${seg}`}
      value={borders[seg]}
      seg={seg}
      vertical={vertical}
      onChange={(id) => props.onBorderChange(seg, id)}
    />
  )

  const randomize = () => {
    for (let seg = 0; seg < 12; seg++) {
      const m = BORDER_MODS[Math.floor(Math.random() * BORDER_MODS.length)]
      props.onBorderChange(seg, m.id)
    }
  }
  const clearBorders = () => {
    for (let seg = 0; seg < 12; seg++) props.onBorderChange(seg, null)
  }

  return (
    <div className="board-wrap">
      <div className="board-toolbar">
        <span className="board-title">航行棋盘</span>
        <span className="spacer" />
        <button onClick={randomize} title="模拟一次边框重洗">
          🎲 随机边框
        </button>
        <button onClick={clearBorders}>清空边框</button>
      </div>
      <div className="board-grid">
        <div className="corner" />
        {border(0)}
        {border(1)}
        {border(2)}
        <div className="corner" />

        {border(9, true)}
        {tile(0)}
        {tile(1)}
        {tile(2)}
        {border(3, true)}

        {border(10, true)}
        {tile(3)}
        {tile(4)}
        {tile(5)}
        {border(4, true)}

        {border(11, true)}
        {tile(6)}
        {tile(7)}
        {tile(8)}
        {border(5, true)}

        <div className="corner" />
        {border(6)}
        {border(7)}
        {border(8)}
        <div className="corner" />
      </div>
      <div className="board-hint">
        角落有 2 个边框词缀、边上有 1 个、中心 0 个。先点图库中的海图再点格子放置；点两个已放置的格子可交换。
      </div>
      <div className="legend">
        <span className="legend-item scope-self">■ 本区域</span>
        <span className="legend-item scope-adjacent">■ 相邻</span>
        <span className="legend-item scope-global">■ 整个航行</span>
      </div>
      {!props.sequenceActive && props.solveSlot}
      {!props.sequenceActive && (
        <div className="voyage-finish">
          <button
            className="copy-into-game"
            disabled={board.every((p) => !p)}
            onClick={props.onCopySequence}
            title="按游戏内放置顺序（先左下）逐步遍历每个格子，复制对应海图，以便你按正确顺序 Ctrl+左键点击放入。"
          >
            📋 复制进游戏
          </button>
          <button
            className="finish-voyage"
            disabled={board.every((p) => !p)}
            onClick={props.onFinishVoyage}
            title="消耗棋盘上的海图（用掉它们），保留你标记为保留（🔒）的海图。清空棋盘准备下一次航行。"
          >
            🌊 完成航行
          </button>
          {props.voyageMsg && <span className="voyage-msg">{props.voyageMsg}</span>}
        </div>
      )}
    </div>
  )
}
