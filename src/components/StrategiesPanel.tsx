import { useState } from 'react'
import { STRATEGIES, type StrategyDef } from '../data/strategies'
import type { Borders, ChartData } from '../types'

interface Props {
  activeId: string | null
  pool: ChartData[]
  borders: Borders
  onSelect: (id: string | null) => void
}

/** per-requirement tally of what the library can supply */
function pieceStatus(s: StrategyDef, pool: ChartData[]) {
  return (s.requirements ?? []).map((req) => {
    const have = pool.filter(
      (c) =>
        (req.modIds && c.modIds.some((id) => req.modIds!.includes(id))) ||
        (req.areaTypes && c.areaType && req.areaTypes.includes(c.areaType)),
    ).length
    return { ...req, have, missing: Math.max(0, req.count - have) }
  })
}

function Readiness({
  strategy,
  pool,
  borders,
}: {
  strategy: StrategyDef
  pool: ChartData[]
  borders: Borders
}) {
  const reqs = pieceStatus(strategy, pool)
  const borderMissing =
    strategy.requiresBorderId && !borders.includes(strategy.requiresBorderId.id)
  if (reqs.length === 0 && !strategy.requiresBorderId) return null
  const missing = reqs.filter((r) => r.missing > 0)
  if (missing.length > 0 || borderMissing) {
    const parts = [
      ...missing.map((m) => `${m.missing}× ${m.label}`),
      ...(borderMissing ? [strategy.requiresBorderId!.label] : []),
    ]
    return (
      <div className="strat-notready">
        ⚠ 你没有这些组件 - 先别跑这个航行，等一等。缺少：{parts.join('、')}。
        {strategy.waitHint ? ` ${strategy.waitHint}` : ''}
      </div>
    )
  }
  return (
    <div className="strat-ready">
      ✓ 组件已齐：{' '}
      {reqs
        .map(
          (r) =>
            `${Math.min(r.have, r.count)}/${r.count}× ${r.label}${
              r.have > r.count ? `（多 ${r.have - r.count} 张）` : ''
            }`,
        )
        .join('、')}
    </div>
  )
}

/**
 * Curated strategies. Selecting one OVERRIDES the manual reward weights and
 * adds placement rules that shape what the solver suggests. Its own section so
 * it's obvious when a strategy - not your sliders - is steering results.
 */
function RegexRow({ regex }: { regex: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="strat-regex-row">
      <span className="strat-regex-label" title="粘贴进游戏内海图搜索，以高亮此策略的存图">
        存图搜索
      </span>
      <input readOnly value={regex} onFocus={(e) => e.target.select()} />
      <button
        onClick={() => {
          navigator.clipboard.writeText(regex).catch(() => {})
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1500)
        }}
      >
        {copied ? '✓' : '复制'}
      </button>
    </div>
  )
}

export function StrategiesPanel({ activeId, pool, borders, onSelect }: Props) {
  const [expanded, setExpanded] = useState<string | null>(activeId)

  return (
    <div className="strategies">
      <div className="panel-title">
        策略
        {activeId && <span className="strat-live-badge">激活中</span>}
      </div>
      <div className="muted small-note" style={{ marginTop: 0 }}>
        精选社区策略。选择一个会覆盖你的奖励权重并引导求解器，直到你把它关掉。
      </div>

      <button
        className={`strat-card strat-none ${activeId === null ? 'active' : ''}`}
        onClick={() => onSelect(null)}
      >
        <span className="strat-name">无（手动）</span>
        <span className="strat-tagline">在下面使用你自己的奖励权重。</span>
      </button>

      {STRATEGIES.map((s) => {
        const isActive = activeId === s.id
        const isOpen = expanded === s.id
        return (
          <div key={s.id} className={`strat-card ${isActive ? 'active' : ''}`}>
            <button
              className="strat-head"
              onClick={() => setExpanded(isOpen ? null : s.id)}
              title="显示详情"
            >
              <span className="strat-name">
                {s.name}
                {s.badge && <span className="strat-badge-new">{s.badge}</span>}
              </span>
              <span className="strat-tagline">{s.tagline}</span>
            </button>
            {isOpen && (
              <div className="strat-body">
                <ul className="strat-guide">
                  {s.guide.map((g, i) => (
                    <li key={i}>{g}</li>
                  ))}
                </ul>
                {s.source.url ? (
                  <a className="strat-source" href={s.source.url} target="_blank" rel="noopener noreferrer">
                    ▶ {s.source.label}
                  </a>
                ) : (
                  <span className="strat-source">{s.source.label}</span>
                )}
                {s.extraLinks?.map((l) => (
                  <a
                    key={l.url}
                    className="strat-source strat-extra-link"
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    🔗 {l.label}
                  </a>
                ))}
              </div>
            )}
            {(isActive || isOpen) && s.searchRegex && <RegexRow regex={s.searchRegex} />}
            {(isActive || isOpen) && <Readiness strategy={s} pool={pool} borders={borders} />}
            <button
              className={`strat-use ${isActive ? 'on' : ''}`}
              onClick={() => onSelect(isActive ? null : s.id)}
            >
              {isActive ? '✓ 激活中 - 点击关闭' : '使用此策略'}
            </button>
          </div>
        )
      })}
    </div>
  )
}
