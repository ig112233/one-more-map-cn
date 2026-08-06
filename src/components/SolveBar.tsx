import { useState } from 'react'
import { solve, type SolverResult } from '../logic/solver'
import type { AppState } from '../logic/storage'
import type { StrategyDef } from '../data/strategies'
import { selectStrategySolvePool } from '../logic/solverPoolSelection'

interface Props {
  state: AppState
  /** curated strategy currently overriding weights, or null for manual */
  activeStrategy: StrategyDef | null
  results: SolverResult[]
  /** which result is currently loaded on the board, or null */
  appliedIdx: number | null
  onResults: (r: SolverResult[]) => void
  onApply: (r: SolverResult, idx: number) => void
  /** open the multi-voyage session planner */
  onOpenPlanner: () => void
  /** open the Solver Settings popup */
  onOpenSettings: () => void
}

/** The front-and-centre solve control: sits under the board, above
 *  "Copy into game", so solve → pick a result → copy is one straight line. */
export function SolveBar({ state, activeStrategy, results, appliedIdx, onResults, onApply, onOpenPlanner, onOpenSettings }: Props) {
  const [busy, setBusy] = useState(false)
  const [solveNote, setSolveNote] = useState('')
  const weights = activeStrategy ? activeStrategy.weights : state.weights

  const run = () => {
    setBusy(true)
    setSolveNote('')
    // let the UI paint the busy state before the (synchronous) solve
    window.setTimeout(() => {
      try {
        // locked charts sitting on the board are pinned to their exact cell -
        // the solver arranges everything else around them (issue #9)
        const locked = state.board.map((placement) => {
          if (!placement) return null
          const chart = state.pool.find((c) => c.uid === placement.chartUid)
          return chart?.preserved ? { ...placement } : null
        })
        const lockedUids = new Set(locked.filter(Boolean).map((p) => p!.chartUid))
        const { solvePool, heldBack, heldBackFor } = selectStrategySolvePool(
          state.pool,
          activeStrategy,
          state.strategyReservations,
          lockedUids,
          state.pieceKeeps,
        )
        const res = solve(solvePool, state.borders, weights, {
          mode: state.mode,
          allowRotation: state.allowRotation,
          adjacencyMode: state.adjacencyMode,
          adjacentAffectsSelf: state.adjacentAffectsSelf,
          disabledMods: new Set(state.disabledMods),
          topK: 5,
          strategyRules: activeStrategy?.rules,
          strategyLayout: activeStrategy?.layout,
          strategyLayoutPenalty: activeStrategy?.layoutPenalty,
          locked,
        })
        onResults(res)
        // loading the best result right away saves the extra click - the
        // alternatives stay one click away in the strip below
        if (res.length > 0) onApply(res[0], 0)
        const notes: string[] = []
        const lockedCount = locked.filter(Boolean).length
        if (lockedCount > 0)
          notes.push(`${lockedCount} 张锁定海图保持原位。`)
        if (heldBack > 0)
          notes.push(
            `${heldBack} 张海图为 ${heldBackFor.join('、')} 存图。可在图库的 🔖 向导中调整存图数量。`,
          )
        if (solvePool.length < 9)
          notes.push(`只有 ${solvePool.length} 张多余海图 - 不足以凑满一板。`)
        else if (res.length && !res[0].valid)
          notes.push('这些海图没有完全可运行的布局 - 展示最佳的部分布局。')
        setSolveNote(notes.join(' '))
      } finally {
        setBusy(false)
      }
    }, 30)
  }

  return (
    <div className="solve-bar">
      <div className="solve-row">
        <button className="solve-big" onClick={run} disabled={busy || state.pool.length === 0}>
          {busy ? (
            '求解中…'
          ) : (
            <>
              求解
              <span className="solve-big-sub">
                从 {state.pool.length} 张海图中找出最佳棋盘
                {activeStrategy ? ` · ${activeStrategy.name}` : ''}
              </span>
            </>
          )}
        </button>
        <button
          className="solve-settings-btn"
          onClick={onOpenPlanner}
          title="把你的整个海图库排成一系列航行"
        >
          📋<span className="solve-settings-label">计划</span>
        </button>
        <button
          className="solve-settings-btn"
          onClick={onOpenSettings}
          title="连接规则、奖励权重、海图保护、填仓航行和最佳海图正则"
        >
          ⚙<span className="solve-settings-label">设置</span>
        </button>
      </div>
      {solveNote && <div className="muted small-note solve-bar-note">{solveNote}</div>}
      {results.length > 0 && (
        <>
          <div className="solve-results">
            {results.map((r, i) => (
              <button
                key={i}
                className={`solve-result ${appliedIdx === i ? 'applied' : ''} ${r.valid ? '' : 'invalid'}`}
                onClick={() => onApply(r, i)}
                title={
                  r.valid
                    ? '把此布局载入棋盘'
                    : '无法完全运行（连接或可达性问题）- 仅供参考'
                }
              >
                <span className="sr-rank">#{i + 1}</span>
                <span className="sr-pts">{r.reward.toFixed(1)}</span>
                <span className="sr-pts-label">分</span>
                {appliedIdx === i ? (
                  <span className="sr-badge on-board">已在棋盘</span>
                ) : r.valid ? (
                  <span className="sr-badge ok">✓ 可运行</span>
                ) : (
                  <span className="sr-badge bad">✗ 不可运行</span>
                )}
              </button>
            ))}
          </div>
          <div className="muted small-note solve-bar-note">
            按你的权重排序 - 点击一个载入它，然后在下方面板点击复制进游戏。
          </div>
        </>
      )}
    </div>
  )
}
