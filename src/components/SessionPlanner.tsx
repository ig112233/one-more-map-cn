import { useMemo } from 'react'
import { planSession } from '../logic/sessionPlan'
import type { StrategyReservationPreferences } from '../data/strategies'
import type { Borders, ChartData } from '../types'

interface Props {
  pool: ChartData[]
  borders: Borders
  reservations: StrategyReservationPreferences
  pieceKeeps: Record<string, number>
  onUseStrategy: (id: string) => void
  onClose: () => void
}

/** Overlay that sequences the whole library into a session of voyages. */
export function SessionPlanner({ pool, borders, reservations, pieceKeeps, onUseStrategy, onClose }: Props) {
  const plan = useMemo(
    () => planSession(pool, borders, reservations, pieceKeeps),
    [pool, borders, reservations, pieceKeeps],
  )
  const ready = plan.entries.filter((e) => e.status === 'ready')
  const waiting = plan.entries.filter((e) => e.status === 'waiting')
  let step = 0

  return (
    <div className="onboard-backdrop" onClick={onClose}>
      <div className="onboard session-plan" onClick={(e) => e.stopPropagation()}>
        <div className="panel-title">
          会话计划
          <span className="spacer" />
          <button onClick={onClose}>完成</button>
        </div>
        <p className="onboard-intro" style={{ marginBottom: 10 }}>
          你的整个海图库，排好顺序：从上到下依次跑，每把之间按完成航行。每一条只使用上面各条剩下来的海图。
        </p>
        {pool.length < 9 && (
          <div className="muted pad">海图少于 9 张 - 先导入一些。</div>
        )}
        <div className="plan-list">
          {ready.map((e) => {
            step += e.runs
            return (
              <div key={e.strategyId} className="plan-row ready">
                <span className="plan-step">
                  {e.runs > 1 ? `${step - e.runs + 1}-${step}` : step}
                </span>
                <span className="plan-name">
                  {e.name}
                  {e.runs > 1 && <span className="plan-runs"> ×{e.runs}</span>}
                </span>
                <span className="plan-note muted">{e.note}</span>
                <span className="spacer" />
                <button
                  onClick={() => {
                    onUseStrategy(e.strategyId)
                    onClose()
                  }}
                  title="激活此策略并关闭计划"
                >
                  使用
                </button>
              </div>
            )
          })}
          {ready.length === 0 && pool.length >= 9 && (
            <div className="muted pad">
              还没有什么可以跑的 - 看看下面每个策略在等什么。
            </div>
          )}
        </div>
        {waiting.length > 0 && (
          <>
            <div className="panel-title small">等待组件</div>
            <div className="plan-list">
              {waiting.map((e) => (
                <div key={e.strategyId} className="plan-row waiting">
                  <span className="plan-step">⏳</span>
                  <span className="plan-name">{e.name}</span>
                  <span className="plan-note muted">{e.note}</span>
                </div>
              ))}
            </div>
          </>
        )}
        <div className="muted small-note">
          {plan.allocated} 张海图已分配 ·{' '}
          {plan.leftover} 张剩余（保留的燃料和零头）。求解设置中的保护项决定每个策略可以消耗什么。
        </div>
      </div>
    </div>
  )
}
