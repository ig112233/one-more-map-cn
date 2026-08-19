import { useMemo, useState } from 'react'
import { buildBestModRegex, type RegexLang } from '../logic/regex'
import { solve, type SolverResult } from '../logic/solver'
import type { AppState } from '../logic/storage'
import type { AdjacencyMode } from '../logic/scoring'
import type { ConnectivityMode } from '../types'
import { STRATEGY_RESERVATION_OPTIONS } from '../data/strategies'
import { selectPieceBank } from '../logic/pieceKeeps'
import type { StrategyDef } from '../data/strategies'
import { GROUP_LABEL, GROUP_ORDER, REWARD_TYPES } from '../logic/rewards'
import { displayValue } from './Library'

/** how many of your best charts to hold back from a filler voyage (one full board) */
const KEEP_BEST = 9

interface Props {
  state: AppState
  /** curated strategy currently overriding weights, or null for manual */
  activeStrategy: StrategyDef | null
  onPatch: (p: Partial<AppState>) => void
  onResults: (r: SolverResult[]) => void
  /** rendered inside the settings popup - shows a Done button that calls this */
  onClose?: () => void
}

export function SolverPanel({ state, activeStrategy, onPatch, onResults, onClose }: Props) {
  const [busy, setBusy] = useState(false)
  const [regexCap, setRegexCap] = useState(50)
  const [regexLang, setRegexLang] = useState<RegexLang>('en')
  const [copied, setCopied] = useState(false)
  const [solveNote, setSolveNote] = useState('')
  // while a strategy is active it overrides the manual weights everywhere here
  const weights = activeStrategy ? activeStrategy.weights : state.weights
  // the keep-count bank applies in every mode; each toggle switches its
  // strategies' banks off wholesale (the wizard's counts stay saved)
  const availableReservations = STRATEGY_RESERVATION_OPTIONS
  const bestRegex = useMemo(
    () => buildBestModRegex(weights, regexCap, new Set(state.disabledMods), regexLang),
    [weights, regexCap, state.disabledMods, regexLang],
  )

  const copyRegex = async () => {
    try {
      await navigator.clipboard.writeText(bestRegex.regex)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* user can select the text manually */
    }
  }

  // build a throwaway "filler" voyage from your lowest-value spare charts, holding
  // back your best KEEP_BEST charts and anything you've locked (🔒) so they survive
  const runFiller = () => {
    setBusy(true)
    setSolveNote('')
    window.setTimeout(() => {
      try {
        const disabled = new Set(state.disabledMods)
        const keep = new Set<string>()
        state.pool.forEach((c) => c.preserved && keep.add(c.uid))
        // banked keeper charts (per the keep counts) are never filler
        const bank = selectPieceBank(state.pool, state.pieceKeeps, state.strategyReservations)
        state.pool.forEach((c) => bank.has(c.uid) && keep.add(c.uid))
        ;[...state.pool]
          .sort((a, b) => displayValue(b, weights, disabled) - displayValue(a, weights, disabled))
          .slice(0, KEEP_BEST)
          .forEach((c) => keep.add(c.uid))
        // locked board charts stay pinned even in a filler board (issue #9) -
        // they're preserved, so running the voyage doesn't consume them
        const locked = state.board.map((placement) => {
          if (!placement) return null
          const chart = state.pool.find((c) => c.uid === placement.chartUid)
          return chart?.preserved ? { ...placement } : null
        })
        const lockedUids = new Set(locked.filter(Boolean).map((p) => p!.chartUid))
        const fillerPool = state.pool.filter((c) => lockedUids.has(c.uid) || !keep.has(c.uid))
        if (fillerPool.length < 9) {
          onResults([])
          setSolveNote(
            `只有 ${fillerPool.length} 张多余海图 - 在最好的 ${KEEP_BEST} 张和锁定海图之外，需要 9 张才能构建填仓航行。`,
          )
          return
        }
        const res = solve(fillerPool, state.borders, weights, {
          mode: state.mode,
          allowRotation: state.allowRotation,
          adjacencyMode: state.adjacencyMode,
          adjacentAffectsSelf: state.adjacentAffectsSelf,
          disabledMods: disabled,
          topK: 5,
          minimizeReward: true,
          locked,
        })
        onResults(res)
        setSolveNote(
          res[0]?.valid
            ? '填仓航行：用你的多余海图构建的最低价值可运行棋盘（你最好的与锁定的海图不受影响）。结果在棋盘下方。'
            : '你的多余海图排不出可运行的填仓布局。',
        )
      } finally {
        setBusy(false)
      }
    }, 30)
  }

  return (
    <div className="solver">
      <div className="panel-title">
        求解设置
        {onClose && (
          <>
            <span className="spacer" />
            <button onClick={onClose}>完成</button>
          </>
        )}
      </div>

      <div className="field">
        <label>连接规则</label>
        <select
          value={state.mode}
          onChange={(e) => onPatch({ mode: e.target.value as ConnectivityMode })}
        >
          <option value="strict">连接必须对齐（真实规则）</option>
          <option value="any">忽略连接（实验）</option>
        </select>
      </div>

      <label className="check">
        <input
          type="checkbox"
          checked={state.allowRotation}
          onChange={(e) => onPatch({ allowRotation: e.target.checked })}
        />
        海图可以旋转
      </label>

      <div className="field">
        <label>相邻词缀的作用范围</label>
        <select
          value={state.adjacencyMode}
          onChange={(e) => onPatch({ adjacencyMode: e.target.value as AdjacencyMode })}
        >
          <option value="physical">任意相邻区域</option>
          <option value="connected">仅已连接的相邻区域</option>
        </select>
      </div>

      <label className="check">
        <input
          type="checkbox"
          checked={state.adjacentAffectsSelf}
          onChange={(e) => onPatch({ adjacentAffectsSelf: e.target.checked })}
        />
        相邻词缀也影响它们所在的区域
      </label>

      {activeStrategy && (
        <div className="strat-override-note">
          ⚑ <strong>{activeStrategy.name}</strong> 正在引导求解器 - 激活期间你下方的手动权重会被忽略。
        </div>
      )}

      {availableReservations.length > 0 && (
        <fieldset className="strategy-reservations">
          <legend>为其他策略保护海图</legend>
          {availableReservations.map((option) => (
            <label className="check" key={option.id}>
              <input
                type="checkbox"
                name="strategy-reservation"
                value={option.id}
                checked={state.strategyReservations[option.id]}
                onChange={(event) =>
                  onPatch({
                    strategyReservations: {
                      ...state.strategyReservations,
                      [option.id]: event.target.checked,
                    },
                  })
                }
              />
              {option.label}
            </label>
          ))}
          <div className="muted small-note">
            开启的类别会把其存图排除在求解池之外（数量在图库的 🔖 向导中设置）。策略始终可以消耗自己存的组件。
          </div>
        </fieldset>
      )}

      <details className="weights-panel">
        <summary className="panel-title small weights-summary">
          奖励权重{activeStrategy ? '（已覆盖）' : ''}
        </summary>
        <div className="muted small-note" style={{ marginTop: 0 }}>
          你的个人优先级 - 把你重视的项目调高。每种奖励单独加权。
        </div>
        <div className={`weights ${activeStrategy ? 'weights-overridden' : ''}`}>
          {GROUP_ORDER.map((group) => {
          const rows = REWARD_TYPES.filter((r) => r.group === group)
          if (rows.length === 0) return null
          return (
            <div key={group} className="weight-group">
              <div className="weight-group-title">{GROUP_LABEL[group]}</div>
              {rows.map((r) => (
                <div key={r.key} className="weight-row">
                  <span className="weight-label">{r.label}</span>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={1}
                    disabled={!!activeStrategy}
                    value={state.weights[r.key] ?? r.default}
                    onChange={(e) =>
                      onPatch({ weights: { ...state.weights, [r.key]: parseInt(e.target.value, 10) } })
                    }
                  />
                  <span className="weight-val">{state.weights[r.key] ?? r.default}</span>
                </div>
              ))}
            </div>
          )
        })}
        </div>
      </details>

      <button
        className="filler-btn"
        onClick={runFiller}
        disabled={busy || state.pool.length < 10}
        title="用你价值最低的多余海图构建一次性航行，把你的最佳和锁定海图留到正式跑图"
      >
        {busy ? '求解中…' : '🗑 填仓航行（多余海图）'}
      </button>
      {solveNote && <div className="muted small-note">{solveNote}</div>}

      <div className="panel-title small">最佳海图正则</div>
      <div className="muted small-note" style={{ marginTop: 0 }}>
        粘贴进游戏内海图搜索，以高亮值得带上的海图，依据你上面的权重。无需导入。选择你的客户端语言：
        简体/繁体版使用已录入的客户端词缀文本（相邻/航行词缀；海图自身难度词缀暂未收录客户端原文，故中文正则不覆盖它们）。实验性功能：
        游戏内搜索不一定支持此语法，上线后才知道。
      </div>
      <div className="regex-row">
        <input readOnly value={bestRegex.regex} onFocus={(e) => e.target.select()} />
        <button onClick={copyRegex}>{copied ? '✓' : '复制'}</button>
      </div>
      <div className="regex-meta">
        <span className="muted">
          {bestRegex.included.length} 个词缀 · {bestRegex.regex.length} 字符
        </span>
        <span className="spacer" />
        <label className="muted">
          语言{' '}
          <select
            value={regexLang}
            onChange={(e) => setRegexLang(e.target.value as RegexLang)}
            title="正则去匹配哪套客户端语言的海图文本"
          >
            <option value="en">英文</option>
            <option value="zh">简中</option>
            <option value="tw">繁中</option>
          </select>
        </label>
        <label className="muted">
          最大{' '}
          <select value={regexCap} onChange={(e) => setRegexCap(parseInt(e.target.value, 10))}>
            <option value={50}>50</option>
            <option value={250}>250</option>
          </select>
        </label>
      </div>
    </div>
  )
}
