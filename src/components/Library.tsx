import { useMemo, useState } from 'react'
import { VOYAGE_MODS, modText, voyageModById } from '../data/mods'
import type { StrategyReservationPreferences } from '../data/strategies'
import { selectPieceBank, type PieceType } from '../logic/pieceKeeps'
import { voyageRewardKey } from '../logic/rewards'
import { newUid } from '../logic/parser'
import type { Board, ChartData, Edges, Weights } from '../types'
import { STAT_LABELS, STAT_SHORT } from '../types'
import { EdgeGlyph } from './icons'
import { tooltipProps } from './Tooltip'

interface Props {
  pool: ChartData[]
  board: Board
  weights: Weights
  disabledMods: Set<string>
  /** keeper protections - decide which charts show the 🔒 "saved for" badge */
  reservations: StrategyReservationPreferences
  /** per-piece-type keep counts (missing entries use the recommended default) */
  pieceKeeps: Record<string, number>
  selected: string | null
  onSelect: (uid: string) => void
  onAdd: (charts: ChartData[]) => void
  onRemove: (uid: string) => void
  onUpdate: (chart: ChartData) => void
  onClearCharts: () => void
  /** open the guided "save charts for strategies" wizard */
  onOpenSaveWizard?: () => void
}

/** which strategy this chart is banked for, per the keep counts */
function fuelLock(chart: ChartData, bank: Map<string, PieceType>): string | null {
  const piece = bank.get(chart.uid)
  return piece ? `为 ${piece.strategyName} 存图 - ${piece.label}` : null
}

const SCOPE_REACH = { self: 1, adjacent: 3, global: 9 } as const

/** heuristic worth of a chart under the current weights, for sorting */
function chartValue(chart: ChartData, weights: Weights, disabled: Set<string>): number {
  let v = 0
  for (const id of chart.modIds) {
    if (disabled.has(id)) continue
    const mod = voyageModById.get(id)
    if (!mod) continue
    const w = weights[voyageRewardKey(mod)] ?? 0
    for (const e of mod.effects) v += w * e.percent * SCOPE_REACH[mod.scope]
  }
  // header reward sub-stats are shown but not scored; a chart's worth is its implicit
  return v
}

type SortMode = 'value' | 'level' | 'name'
type ViewMode = 'grid' | 'list'

/** compact display value: weighted worth scaled to a friendly 0–99ish number */
export function displayValue(chart: ChartData, weights: Weights, disabled: Set<string>): number {
  return Math.round(chartValue(chart, weights, disabled) / 100)
}

const EDGE_LABELS = ['N', 'E', 'S', 'W'] as const

function ChartEditor({ chart, onUpdate }: { chart: ChartData; onUpdate: (c: ChartData) => void }) {
  const toggleEdge = (i: number) => {
    const edges = [...chart.edges] as Edges
    edges[i] = !edges[i]
    onUpdate({ ...chart, edges })
  }
  return (
    <div className="chart-editor" onClick={(e) => e.stopPropagation()}>
      <div className="row">
        <input
          value={chart.name}
          onChange={(e) => onUpdate({ ...chart, name: e.target.value })}
          placeholder="海图名称"
        />
        <input
          type="number"
          className="lvl"
          value={chart.level}
          min={1}
          max={100}
          onChange={(e) => onUpdate({ ...chart, level: parseInt(e.target.value || '1', 10) })}
        />
      </div>
      {(() => {
        const isSelf = (id: string) => voyageModById.get(id)?.scope === 'self'
        const selfIds = chart.modIds.filter(isSelf)
        const implicitId = chart.modIds.find((id) => !isSelf(id)) ?? ''
        const commit = (s0: string, s1: string, imp: string) =>
          onUpdate({ ...chart, modIds: [s0, s1, imp].filter(Boolean) })
        const selfPool = VOYAGE_MODS.filter((m) => m.scope === 'self')
        return (
          <>
            {[0, 1].map((slot) => (
              <select
                key={slot}
                value={selfIds[slot] ?? ''}
                onChange={(e) => {
                  const next = [selfIds[0] ?? '', selfIds[1] ?? '']
                  next[slot] = e.target.value
                  commit(next[0], next[1], implicitId)
                }}
              >
                <option value="">区域词缀 {slot + 1}：无</option>
                {selfPool.map((m) => (
                  <option key={m.id} value={m.id}>
                    {modText(m)}
                  </option>
                ))}
              </select>
            ))}
            <select
              value={implicitId}
              onChange={(e) => commit(selfIds[0] ?? '', selfIds[1] ?? '', e.target.value)}
            >
              <option value="">隐式词缀：无</option>
              <optgroup label="相邻">
                {VOYAGE_MODS.filter((m) => m.scope === 'adjacent').map((m) => (
                  <option key={m.id} value={m.id}>
                    {modText(m)}
                  </option>
                ))}
              </optgroup>
              <optgroup label="全航行">
                {VOYAGE_MODS.filter((m) => m.scope === 'global').map((m) => (
                  <option key={m.id} value={m.id}>
                    {modText(m)}
                  </option>
                ))}
              </optgroup>
            </select>
          </>
        )
      })()}
      <div className="row edges-row">
        <span className="muted">连接口：</span>
        {EDGE_LABELS.map((l, i) => (
          <button
            key={l}
            className={`edge-btn ${chart.edges[i] ? 'on' : ''}`}
            onClick={() => toggleEdge(i)}
          >
            {l}
          </button>
        ))}
      </div>
      {chart.rawText && (
        <div className="raw-text" title="导入时未能识别的词缀行已保留">
          {chart.rawText}
        </div>
      )}
    </div>
  )
}

export function Library(props: Props) {
  const [editing, setEditing] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortMode>('value')
  const [view, setView] = useState<ViewMode>(
    () => (localStorage.getItem('library-view') as ViewMode) || 'grid',
  )
  const setViewPersist = (v: ViewMode) => {
    setView(v)
    try {
      localStorage.setItem('library-view', v)
    } catch {
      /* ignore */
    }
  }
  const onBoard = new Set(props.board.filter(Boolean).map((p) => p!.chartUid))
  const bank = useMemo(
    () => selectPieceBank(props.pool, props.pieceKeeps, props.reservations),
    [props.pool, props.pieceKeeps, props.reservations],
  )

  const addBlank = () => {
    const chart: ChartData = {
      uid: newUid(),
      name: `海图 ${props.pool.length + 1}`,
      level: 80,
      edges: [true, true, true, true],
      modIds: [],
    }
    props.onAdd([chart])
    setEditing(chart.uid)
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = props.pool
    if (q) {
      list = list.filter((c) => {
        if (c.name.toLowerCase().includes(q)) return true
        return c.modIds.some((id) =>
          (() => {
            const m = voyageModById.get(id)
            return m && (modText(m).toLowerCase().includes(q) || m.text.toLowerCase().includes(q))
          })(),
        )
      })
    }
    return [...list].sort((a, b) => {
      if (sort === 'level') return b.level - a.level
      if (sort === 'name') return a.name.localeCompare(b.name)
      return (
        chartValue(b, props.weights, props.disabledMods) -
        chartValue(a, props.weights, props.disabledMods)
      )
    })
  }, [props.pool, props.weights, props.disabledMods, query, sort])

  return (
    <div className="library">
      <div className="panel-title">
        海图库{' '}
        <span className="muted">
          ({query ? `${visible.length}/` : ''}
          {props.pool.length})
        </span>
        <span className="spacer" />
        <button onClick={addBlank}>+ 添加海图</button>
        {props.pool.length > 0 && (
          <button
            className="clear-charts"
            onClick={props.onClearCharts}
            title="从海图库移除所有海图并清空棋盘（边框和权重会保留）"
          >
            全部清空
          </button>
        )}
      </div>
      {props.pool.length > 0 && (
        <div className="library-tools">
          <input
            placeholder="按名称或词缀筛选…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select value={sort} onChange={(e) => setSort(e.target.value as SortMode)}>
            <option value="value">最佳价值</option>
            <option value="level">最高等级</option>
            <option value="name">名称</option>
          </select>
          <button
            title={view === 'grid' ? '列表视图（编辑海图）' : '网格视图'}
            onClick={() => setViewPersist(view === 'grid' ? 'list' : 'grid')}
          >
            {view === 'grid' ? '☰' : '⊞'}
          </button>
        </div>
      )}
      {props.pool.length > 0 && props.onOpenSaveWizard && (
        <div className="savefor-bar">
          <button
            onClick={props.onOpenSaveWizard}
            title="引导式向导：把海图预留给某个策略，这样其它操作（手动求解和填仓）都不会消耗它们"
          >
            🔖 为策略存图…
          </button>
        </div>
      )}
      {props.pool.length === 0 && (
        <div className="muted pad">
          还没有海图。手动添加，或从下方游戏内粘贴。
        </div>
      )}
      {view === 'grid' && (
        <div className="chart-grid">
          {visible.map((c) => {
            const mods = c.modIds.map((id) => voyageModById.get(id)).filter(Boolean)
            // lead with the implicit (adjacent/voyage) - it's the strategic mod
            const mod = mods.find((m) => m!.scope !== 'self') ?? mods[0] ?? null
            const val = displayValue(c, props.weights, props.disabledMods)
            const lock = fuelLock(c, bank)
            const lines = [
              { text: `区域等级：${c.level}${c.shape ? ` · ${c.shape}` : ''}`, cls: 'muted' },
              ...(c.rewards ?? []).map((e) => ({
                text: `+${e.percent}% ${STAT_LABELS[e.stat]}`,
                cls: 'scope-self',
              })),
              ...mods.map((m) => ({ text: modText(m!), cls: `scope-${m!.scope}` })),
              { text: `加权价值：${val}`, cls: 'val' },
              ...(lock
                ? [{ text: `🔒 ${lock} - 其它求解不会消耗它`, cls: 'muted' }]
                : []),
              ...(onBoard.has(c.uid) ? [{ text: '当前在棋盘上', cls: 'muted' }] : []),
            ]
            return (
              <div
                key={c.uid}
                className={`chart-sq ${props.selected === c.uid ? 'selected' : ''} ${onBoard.has(c.uid) ? 'on-board' : ''} ${mod ? `sscope-${mod.scope}` : ''}`}
                onClick={() => props.onSelect(c.uid)}
                {...tooltipProps({ title: c.name, lines })}
              >
                {mod?.short ? (
                  <span className={`sq-reward-text scope-${mod.scope}`}>
                    <span className="sq-shortname">{mod.short}</span>
                  </span>
                ) : mod?.effects[0] ? (
                  <span className={`sq-reward-text scope-${mod.scope}`}>
                    <span className="sq-pct">+{mod.effects[0].percent}%</span>
                    <span className="sq-statname">{STAT_SHORT[mod.effects[0].stat]}</span>
                  </span>
                ) : c.implicitText ? (
                  <span className="sq-reward-text scope-global">
                    <span className="sq-shortname sq-rawimplicit">{c.implicitText}</span>
                  </span>
                ) : (
                  <EdgeGlyph edges={c.edges} size={26} />
                )}
                {mod && (
                  <span className="sq-shape">
                    <EdgeGlyph edges={c.edges} size={15} />
                  </span>
                )}
                {lock && (
                  <span className="sq-lock" title={lock}>
                    🔒
                  </span>
                )}
                <span className="sq-val">{val}</span>
                <span className="sq-lvl">L:{c.level}</span>
                <button
                  className="sq-del"
                  title="删除"
                  onClick={(e) => {
                    e.stopPropagation()
                    props.onRemove(c.uid)
                  }}
                >
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      )}
      {view === 'list' && (
      <div className="chart-list">
        {visible.map((c) => {
          const allMods = c.modIds.map((id) => voyageModById.get(id)).filter(Boolean)
          const mod = allMods.find((m) => m!.scope !== 'self') ?? allMods[0] ?? null
          const lock = fuelLock(c, bank)
          return (
            <div
              key={c.uid}
              className={`chart-card ${props.selected === c.uid ? 'selected' : ''} ${onBoard.has(c.uid) ? 'on-board' : ''}`}
              onClick={() => props.onSelect(c.uid)}
            >
              <div className="chart-card-head">
                <EdgeGlyph edges={c.edges} />
                <span className="chart-name">{c.name}</span>
                <span className="chart-level">lv {c.level}</span>
                {lock && (
                  <span className="badge lock" title={`${lock} - 其它求解不会消耗它`}>
                    🔒
                  </span>
                )}
                {onBoard.has(c.uid) && <span className="badge">在棋盘上</span>}
                <span className="spacer" />
                <button
                  title="编辑"
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditing(editing === c.uid ? null : c.uid)
                  }}
                >
                  ✎
                </button>
                <button
                  title="删除"
                  onClick={(e) => {
                    e.stopPropagation()
                    props.onRemove(c.uid)
                  }}
                >
                  ✕
                </button>
              </div>
              {mod && (
                <div
                  className={`chart-mod scope-${mod.scope}`}
                  {...tooltipProps({
                    title: c.name,
                    lines: [
                      { text: `区域等级：${c.level}`, cls: 'muted' },
                      ...allMods.map((m) => ({ text: modText(m!), cls: `scope-${m!.scope}` })),
                    ],
                  })}
                >
                  {allMods.map((m) => (
                    <div key={m!.id} className={`scope-${m!.scope}`}>
                      {modText(m!)}
                    </div>
                  ))}
                </div>
              )}
              {editing === c.uid && <ChartEditor chart={c} onUpdate={props.onUpdate} />}
            </div>
          )
        })}
      </div>
      )}
    </div>
  )
}
