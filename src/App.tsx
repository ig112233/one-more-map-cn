import { useEffect, useMemo, useRef, useState } from 'react'
import { BoardView } from './components/Board'
import { ModBrowser } from './components/ModBrowser'
import { Onboarding } from './components/Onboarding'
import { TooltipLayer } from './components/Tooltip'
import { generateDemoCharts } from './logic/demo'
import { buildChartSearch, buildSingleChartSearch } from './logic/regex'
import { ImportPanel } from './components/ImportPanel'
import { Library } from './components/Library'
import { SolverPanel } from './components/SolverPanel'
import { SolveBar } from './components/SolveBar'
import { UpdatesLog } from './components/UpdatesLog'
import { LATEST_UPDATE_DATE } from './data/updates'
import { SessionPlanner } from './components/SessionPlanner'
import { SaveWizard } from './components/SaveWizard'
import { Tutorial } from './components/Tutorial'
import { borderModById, modText, voyageModById } from './data/mods'
import { strategyById } from './data/strategies'
import { StrategiesPanel } from './components/StrategiesPanel'
import { scoreBoard } from './logic/scoring'
import { checkConnectivity } from './logic/connectivity'
import type { SolverResult } from './logic/solver'
import { decodeShare, defaultState, encodeShare, loadLocal, saveLocal, type AppState } from './logic/storage'
import type { ChartData } from './types'
import { ALL_STATS, STAT_LABELS, borderTouches, emptyBoard } from './types'

/** discrete/guaranteed effects (drops, spawns, conversions) rather than plain % scalars */
const isNotable = (text: string) => !/^\d+% (increased|more|reduced) /i.test(text)

const ISSUES_URL = 'https://github.com/one-more-map/one-more-map.github.io/issues'

/** bump the key to show a fresh announcement banner */
const ANNOUNCE_KEY = 'announce-ocr-borders'

function initialState(): AppState {
  const hash = window.location.hash.replace(/^#/, '')
  if (hash.length > 20) {
    const shared = decodeShare(hash)
    if (shared) return shared
  }
  return loadLocal() ?? defaultState()
}

export default function App() {
  const [state, setState] = useState<AppState>(initialState)
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    try {
      return !localStorage.getItem('onboarding-seen')
    } catch {
      return false
    }
  })
  const closeOnboarding = () => {
    setShowOnboarding(false)
    try {
      localStorage.setItem('onboarding-seen', '1')
    } catch {
      /* ignore */
    }
  }
  const [showMods, setShowMods] = useState(false)
  const [showSolverSettings, setShowSolverSettings] = useState(false)
  const [showPlanner, setShowPlanner] = useState(false)
  const [showSaveWizard, setShowSaveWizard] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)
  const [showUpdates, setShowUpdates] = useState(false)
  const [updatesSeen, setUpdatesSeen] = useState<string>(() => {
    try {
      return localStorage.getItem('updates-seen') ?? ''
    } catch {
      return ''
    }
  })
  const openUpdates = () => {
    setShowUpdates(true)
    setUpdatesSeen(LATEST_UPDATE_DATE)
    try {
      localStorage.setItem('updates-seen', LATEST_UPDATE_DATE)
    } catch {
      /* ignore */
    }
  }
  const [showAnnounce, setShowAnnounce] = useState<boolean>(() => {
    try {
      return !localStorage.getItem(ANNOUNCE_KEY)
    } catch {
      return false
    }
  })
  const [voyageMsg, setVoyageMsg] = useState('')
  const [preserveConfirm, setPreserveConfirm] = useState<{
    charts: ChartData[]
    index: number
    kept: string[]
  } | null>(null)
  // guided "copy into game": walk the board in the in-game Ctrl+click fill order
  // (bottom-left, then right, then up a row): board cells 6,7,8, 3,4,5, 0,1,2
  const [copySeq, setCopySeq] = useState<{ order: number[]; step: number } | null>(null)
  const [harvestTheme, setHarvestTheme] = useState(() =>
    document.body.classList.contains('theme-harvest'),
  )
  const toggleTheme = () => {
    const next = !harvestTheme
    setHarvestTheme(next)
    document.body.classList.toggle('theme-harvest', next)
    try {
      localStorage.setItem('theme', next ? 'harvest' : 'allflame')
    } catch {
      /* ignore */
    }
  }
  const [selectedChart, setSelectedChart] = useState<string | null>(null)
  const [selectedCell, setSelectedCell] = useState<number | null>(null)
  const [results, setResults] = useState<SolverResult[]>([])
  // which solver result is currently loaded on the board (highlights its card)
  const [appliedIdx, setAppliedIdx] = useState<number | null>(null)
  const [shareMsg, setShareMsg] = useState('')
  const saveTimer = useRef<number>()

  // debounced autosave
  useEffect(() => {
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => saveLocal(state), 300)
  }, [state])

  const chartMap = useMemo(() => new Map(state.pool.map((c) => [c.uid, c])), [state.pool])
  const disabledSet = useMemo(() => new Set(state.disabledMods), [state.disabledMods])
  // active curated strategy: while set, its weights override the manual sliders
  const activeStrategy = state.strategyId ? strategyById.get(state.strategyId) ?? null : null
  const effectiveWeights = activeStrategy ? activeStrategy.weights : state.weights
  const score = useMemo(
    () =>
      scoreBoard(state.board, state.borders, chartMap, effectiveWeights, {
        adjacencyMode: state.adjacencyMode,
        adjacentAffectsSelf: state.adjacentAffectsSelf,
        disabledMods: disabledSet,
      }),
    [
      state.board,
      state.borders,
      chartMap,
      effectiveWeights,
      state.adjacencyMode,
      state.adjacentAffectsSelf,
      disabledSet,
    ],
  )
  const conn = useMemo(
    () => checkConnectivity(state.board, chartMap, state.mode),
    [state.board, chartMap, state.mode],
  )

  // jackpot detection (Milky: the mechanic's only two real jackpots) - flag
  // them loudly and offer the matching strategy in one click
  const jackpots = useMemo(() => {
    const out: { label: string; strategyId: string }[] = []
    if (state.pool.some((c) => c.modIds.includes('voy-noequip')))
      out.push({
        label: '你的图库里有“怪物不会掉落装备”海图 - 围绕它构建稀有怪板',
        strategyId: 'milky-meatfish',
      })
    if (state.borders.includes('b-divine'))
      out.push({
        label: '洗出了“每稀有怪 +1 神圣石掉落”边框 - 放一张海柱图上去并喂它保险箱',
        strategyId: 'divine-border-rares',
      })
    return out.filter((j) => j.strategyId !== state.strategyId)
  }, [state.pool, state.borders, state.strategyId])

  // breakdown of the implicit mods currently on the board, by scope
  const modCount = useMemo(() => {
    let self = 0
    let adjacent = 0
    let global = 0
    for (const p of state.board) {
      if (!p) continue
      const chart = chartMap.get(p.chartUid)
      if (!chart) continue
      for (const id of chart.modIds) {
        const mod = voyageModById.get(id)
        if (!mod) continue
        if (mod.scope === 'adjacent') adjacent++
        else if (mod.scope === 'global') global++
        else self++
      }
    }
    return { self, adjacent, global, total: self + adjacent + global }
  }, [state.board, chartMap])

  // guaranteed/notable effects active on this board, with counts
  const notables = useMemo(() => {
    const counts = new Map<string, { label: string; full: string; count: number }>()
    const add = (key: string, label: string, full: string) => {
      const cur = counts.get(key)
      if (cur) cur.count++
      else counts.set(key, { label, full, count: 1 })
    }
    state.borders.forEach((id, seg) => {
      if (!id || !state.board[borderTouches(seg)]) return
      const mod = borderModById.get(id)
      if (mod && isNotable(mod.text)) add(mod.id, mod.short ?? modText(mod), modText(mod))
    })
    state.board.forEach((p) => {
      if (!p) return
      const chart = chartMap.get(p.chartUid)
      if (!chart) return
      for (const modId of chart.modIds) {
        const mod = voyageModById.get(modId)
        if (mod && isNotable(mod.text)) add(mod.id, modText(mod), modText(mod))
      }
    })
    return [...counts.values()]
  }, [state.borders, state.board, chartMap])

  const patch = (p: Partial<AppState>) => setState((s) => ({ ...s, ...p }))

  const toggleMod = (id: string, off: boolean) =>
    setState((s) => {
      const set = new Set(s.disabledMods)
      if (off) set.add(id)
      else set.delete(id)
      return { ...s, disabledMods: [...set] }
    })
  const bulkMods = (ids: string[], off: boolean) =>
    setState((s) => {
      const set = new Set(s.disabledMods)
      for (const id of ids) (off ? set.add(id) : set.delete(id))
      return { ...s, disabledMods: [...set] }
    })

  const addCharts = (charts: ChartData[]) =>
    setState((s) => ({ ...s, pool: [...s.pool, ...charts] }))

  const removeChart = (uid: string) =>
    setState((s) => ({
      ...s,
      pool: s.pool.filter((c) => c.uid !== uid),
      board: s.board.map((p) => (p?.chartUid === uid ? null : p)),
    }))

  const clearCharts = () => {
    if (!window.confirm('移除海图库中的所有海图并清空棋盘？（边框和权重会保留。）'))
      return
    setState((s) => ({ ...s, pool: [], board: emptyBoard() }))
    setSelectedChart(null)
  }

  const updateChart = (chart: ChartData) =>
    setState((s) => ({ ...s, pool: s.pool.map((c) => (c.uid === chart.uid ? chart : c)) }))

  const togglePreserve = (uid: string) =>
    setState((s) => ({
      ...s,
      pool: s.pool.map((c) => (c.uid === uid ? { ...c, preserved: !c.preserved } : c)),
    }))

  // apply the voyage result: keep charts whose uid is in keptUids, consume the
  // rest of the board; charts not on the board are untouched.
  const commitFinish = (keptUids: Set<string>) => {
    setState((s) => {
      const onBoard = new Set(s.board.filter(Boolean).map((p) => p!.chartUid))
      let consumed = 0
      let kept = 0
      const pool = s.pool.filter((c) => {
        if (!onBoard.has(c.uid)) return true // not run this voyage
        if (keptUids.has(c.uid)) {
          kept++
          return true
        }
        consumed++
        return false
      })
      setVoyageMsg(
        `航行完成：消耗了 ${consumed} 张海图` +
          (kept ? `，保留了 ${kept} 张` : ''),
      )
      window.setTimeout(() => setVoyageMsg(''), 4000)
      return {
        ...s,
        pool: pool.map((c) => (keptUids.has(c.uid) ? { ...c, preserved: false } : c)),
        board: emptyBoard(),
      }
    })
    setPreserveConfirm(null)
  }

  const finishVoyage = () => {
    const preserved = state.board
      .filter(Boolean)
      .map((p) => chartMap.get(p!.chartUid))
      .filter((c): c is ChartData => !!c && !!c.preserved)
    // no charts marked to keep -> consume everything on the board outright
    if (preserved.length === 0) commitFinish(new Set())
    else setPreserveConfirm({ charts: preserved, index: 0, kept: [] })
  }

  const FILL_ORDER = [6, 7, 8, 3, 4, 5, 0, 1, 2]
  // the VERBATIM imported line comes first: the in-game search must match the
  // game's own wording, and our stored mod texts can drift from it (issue #3)
  const chartImplicit = (chart: ChartData): string =>
    chart.implicitText ??
    chart.modIds.map((id) => voyageModById.get(id)).find((m) => m && m.scope !== 'self')?.text ??
    ''
  const copyChartDetails = (chart: ChartData) => {
    navigator.clipboard.writeText(buildSingleChartSearch(chart)).catch(() => {})
  }
  const startCopySeq = () => {
    const order = FILL_ORDER.filter((i) => state.board[i])
    if (order.length) setCopySeq({ order, step: 0 })
  }
  // copy the current square's chart, then advance to the next fill position
  const copyCurrentAndAdvance = () => {
    if (!copySeq) return
    const chart = chartMap.get(state.board[copySeq.order[copySeq.step]]!.chartUid)
    if (chart) copyChartDetails(chart)
    if (copySeq.step + 1 >= copySeq.order.length) setCopySeq(null)
    else setCopySeq({ ...copySeq, step: copySeq.step + 1 })
  }

  // while stepping, Ctrl+C copies the current square and advances; Esc cancels
  useEffect(() => {
    if (!copySeq) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault()
        copyCurrentAndAdvance()
      } else if (e.key === 'Escape') {
        setCopySeq(null)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copySeq])

  // step through each preserved chart, one at a time, its board tile highlighted
  const decidePreserve = (survived: boolean) => {
    if (!preserveConfirm) return
    const { charts, index, kept } = preserveConfirm
    const nextKept = survived ? [...kept, charts[index].uid] : kept
    if (index + 1 >= charts.length) commitFinish(new Set(nextKept))
    else setPreserveConfirm({ charts, index: index + 1, kept: nextKept })
  }

  const onCellClick = (i: number) => {
    if (selectedChart) {
      // place the selected library chart (removing it from any other cell)
      setState((s) => {
        const board = s.board.map((p) => (p?.chartUid === selectedChart ? null : p))
        board[i] = { chartUid: selectedChart, rotation: 0 }
        return { ...s, board }
      })
      setSelectedChart(null)
      setSelectedCell(null)
      return
    }
    if (selectedCell === null) {
      if (state.board[i]) setSelectedCell(i)
      return
    }
    if (selectedCell === i) {
      setSelectedCell(null)
      return
    }
    // swap cells
    setState((s) => {
      const board = [...s.board]
      const t = board[selectedCell]
      board[selectedCell] = board[i]
      board[i] = t
      return { ...s, board }
    })
    setSelectedCell(null)
  }

  const [searchMsg, setSearchMsg] = useState('')
  const copySearch = async () => {
    const placed = state.board.filter(Boolean).map((p) => chartMap.get(p!.chartUid)?.name ?? '')
    const others = state.pool
      .filter((c) => !state.board.some((p) => p?.chartUid === c.uid))
      .map((c) => c.name)
    const str = buildChartSearch(placed.filter(Boolean), others)
    try {
      await navigator.clipboard.writeText(str)
      setSearchMsg('已复制！')
    } catch {
      setSearchMsg(str)
    }
    window.setTimeout(() => setSearchMsg(''), 2500)
  }

  const share = async () => {
    const url = `${location.origin}${location.pathname}#${encodeShare(state)}`
    try {
      await navigator.clipboard.writeText(url)
      setShareMsg('链接已复制！')
    } catch {
      window.location.hash = encodeShare(state)
      setShareMsg('链接已写入地址栏')
    }
    window.setTimeout(() => setShareMsg(''), 2500)
  }

  return (
    <div className="app">
      <TooltipLayer />
      {showOnboarding && (
        <Onboarding
          onClose={closeOnboarding}
          onDemo={() => addCharts(generateDemoCharts(25))}
        />
      )}
      {showMods && (
        <ModBrowser
          disabled={disabledSet}
          onToggle={toggleMod}
          onBulk={bulkMods}
          onClose={() => setShowMods(false)}
        />
      )}
      {showUpdates && <UpdatesLog onClose={() => setShowUpdates(false)} />}
      {showTutorial && <Tutorial onClose={() => setShowTutorial(false)} />}
      {showSaveWizard && (
        <SaveWizard
          pool={state.pool}
          keeps={state.pieceKeeps}
          onApply={(keeps) => patch({ pieceKeeps: keeps })}
          onClose={() => setShowSaveWizard(false)}
        />
      )}
      {showPlanner && (
        <SessionPlanner
          pool={state.pool}
          borders={state.borders}
          reservations={state.strategyReservations}
          pieceKeeps={state.pieceKeeps}
          onUseStrategy={(id) => patch({ strategyId: id })}
          onClose={() => setShowPlanner(false)}
        />
      )}
      {showSolverSettings && (
        <div className="onboard-backdrop" onClick={() => setShowSolverSettings(false)}>
          <div className="onboard solver-popup" onClick={(e) => e.stopPropagation()}>
            <SolverPanel
              state={state}
              activeStrategy={activeStrategy}
              onPatch={patch}
              onResults={(r) => {
                setResults(r)
                setAppliedIdx(null)
              }}
              onClose={() => setShowSolverSettings(false)}
            />
          </div>
        </div>
      )}
      <header>
        <h1>
          Allflame <span className="accent">Voyage Solver</span>
        </h1>
        <button className="tutorial-btn" onClick={() => setShowTutorial(true)}>
          🧭 教程 · 如何使用
        </button>
        <div className="header-right">
          <span className="tag">PoE 3.29：万火诅咒</span>
          <button title="工作原理" onClick={() => setShowOnboarding(true)}>
            ?
          </button>
          <button
            className={updatesSeen < LATEST_UPDATE_DATE ? 'updates-btn unseen' : 'updates-btn'}
            title="网站更新内容"
            onClick={openUpdates}
          >
            更新
          </button>
          <a
            className="feedback-link"
            href={ISSUES_URL}
            target="_blank"
            rel="noopener noreferrer"
            title="Bug reports and feature requests on GitHub - actively monitored"
          >
            🐛 反馈
          </a>
          <button title="浏览所有词缀并关掉你不想要的" onClick={() => setShowMods(true)}>
            词缀{state.disabledMods.length > 0 ? `（${state.disabledMods.length} 关闭）` : ''}
          </button>
          <button
            className="theme-link"
            title={
              harvestTheme
                ? '回到 Allflame 主题'
                : '收获季版，类似老花园规划表'
            }
            onClick={toggleTheme}
          >
            {harvestTheme ? '🔥' : '🌱'}
          </button>
          <button onClick={share}>{shareMsg || '分享布局'}</button>
        </div>
      </header>

      {showAnnounce && (
        <div className="announce-banner">
          <span>
            🆕 <strong>OCR 边框导入上线！</strong> Windows 批量导入器现在可以直接从屏幕上读取全部
            12 个边框词缀 - 到导入面板获取更新后的脚本。
          </span>
          <button
            className="announce-close"
            title="关闭"
            onClick={() => {
              setShowAnnounce(false)
              try {
                localStorage.setItem(ANNOUNCE_KEY, '1')
              } catch {
                /* ignore */
              }
            }}
          >
            ✕
          </button>
        </div>
      )}

      <main>
        <section className="col library-col">
          <Library
            pool={state.pool}
            board={state.board}
            weights={effectiveWeights}
            disabledMods={disabledSet}
            reservations={state.strategyReservations}
            pieceKeeps={state.pieceKeeps}
            selected={selectedChart}
            onSelect={(uid) => {
              setSelectedChart((cur) => (cur === uid ? null : uid))
              setSelectedCell(null)
            }}
            onAdd={addCharts}
            onRemove={removeChart}
            onUpdate={updateChart}
            onClearCharts={clearCharts}
            onOpenSaveWizard={() => setShowSaveWizard(true)}
          />
          <ImportPanel onImport={addCharts} state={state} onLoadState={setState} />
        </section>

        <section className="col board-col">
          <BoardView
            board={state.board}
            borders={state.borders}
            charts={chartMap}
            perTile={score.perTile}
            selectedCell={selectedCell}
            highlightUid={
              copySeq
                ? (state.board[copySeq.order[copySeq.step]]?.chartUid ?? null)
                : preserveConfirm
                  ? preserveConfirm.charts[preserveConfirm.index].uid
                  : selectedChart && state.board.some((p) => p?.chartUid === selectedChart)
                    ? selectedChart
                    : null
            }
            strictMode={state.mode !== 'any'}
            placingChart={selectedChart ? chartMap.get(selectedChart) ?? null : null}
            onCellClick={onCellClick}
            onRemove={(i) =>
              setState((s) => {
                const board = [...s.board]
                board[i] = null
                return { ...s, board }
              })
            }
            onRotate={(i) =>
              setState((s) => {
                const board = [...s.board]
                const p = board[i]
                if (p) board[i] = { ...p, rotation: (p.rotation + 1) % 4 }
                return { ...s, board }
              })
            }
            onBorderChange={(seg, id) =>
              setState((s) => {
                const borders = [...s.borders]
                borders[seg] = id
                return { ...s, borders }
              })
            }
            onTogglePreserve={togglePreserve}
            onFinishVoyage={finishVoyage}
            onCopySequence={startCopySeq}
            voyageMsg={voyageMsg}
            sequenceActive={!!copySeq || !!preserveConfirm}
            solveSlot={
              <SolveBar
                state={state}
                activeStrategy={activeStrategy}
                results={results}
                appliedIdx={appliedIdx}
                onResults={(r) => {
                  setResults(r)
                  setAppliedIdx(null)
                }}
                onApply={(r, idx) => {
                  patch({ board: r.board.map((p) => (p ? { ...p } : null)) })
                  setAppliedIdx(idx)
                  setSelectedCell(null)
                  setSelectedChart(null)
                }}
                onOpenPlanner={() => setShowPlanner(true)}
                onOpenSettings={() => setShowSolverSettings(true)}
              />
            }
          />

          {copySeq && (
            <div className="preserve-confirm copyseq">
              <div className="pc-head">
                按此顺序放入游戏（对应格子正在发光）。复制会生成游戏内搜索串；Ctrl+左键点击它找到的海图。
                它们先填左下角。步骤{' '}
                {copySeq.step + 1} / {copySeq.order.length}。
              </div>
              {(() => {
                const c = chartMap.get(state.board[copySeq.order[copySeq.step]]!.chartUid)
                if (!c) return null
                return (
                  <>
                    <div className="pc-name">{c.name}</div>
                    <div className="pc-sub">
                      {chartImplicit(c)}
                      {c.shape ? ` · 形状：${c.shape}` : ''}
                    </div>
                  </>
                )
              })()}
              <div className="copyseq-actions">
                <button className="copyseq-go" onClick={copyCurrentAndAdvance}>
                  {copySeq.step + 1 >= copySeq.order.length
                    ? '📋 复制最后一张并完成'
                    : '📋 复制并下一张'}
                  <span className="copyseq-hint">或按 Ctrl+C</span>
                </button>
                <button className="pc-lost" onClick={() => setCopySeq(null)}>
                  取消
                </button>
              </div>
            </div>
          )}

          {preserveConfirm && (
            <div className="preserve-confirm">
              <div className="pc-head">
                保留海图 {preserveConfirm.index + 1} / {preserveConfirm.charts.length}（对应格子正在发光）。
                它真的在这次航行中存活了吗？
              </div>
              <div className="pc-name">{preserveConfirm.charts[preserveConfirm.index].name}</div>
              <div className="pc-actions">
                <button className="pc-kept" onClick={() => decidePreserve(true)}>
                  ✓ 保留了
                </button>
                <button className="pc-lost" onClick={() => decidePreserve(false)}>
                  ✕ 被消耗了
                </button>
              </div>
            </div>
          )}

          <div className={`conn-status ${conn.valid ? 'ok' : 'bad'}`}>
            {state.mode === 'any'
              ? '已忽略连接规则'
              : conn.valid
                ? '✓ 连接布局有效'
                : [
                    conn.mismatches > 0
                      ? `✗ ${conn.mismatches} 处连接不匹配`
                      : null,
                    conn.disconnected > 0
                      ? `${conn.disconnected} 张海图未连接到 ⚓ 起点`
                      : null,
                    conn.unfilled > 0
                      ? `${conn.unfilled} 个空格子（9 格必须全部填满）`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
          </div>

          {modCount.total > 0 && (
            <div className="modcount">
              <span className="modcount-title">航行词缀计数</span>
              <span className="modcount-item scope-self">本区域 {modCount.self}</span>
              <span className="modcount-item scope-adjacent">相邻 {modCount.adjacent}</span>
              <span className="modcount-item scope-global">整个航行 {modCount.global}</span>
              <span className="modcount-item modcount-conn">🔗 {conn.connections} 条连接</span>
            </div>
          )}

          <div className="score-panel">
            <div className="score-total">
              航行奖励 <strong>{score.total.toFixed(1)}</strong>
              <span className="spacer" />
              <button
                onClick={copySearch}
                disabled={state.board.every((p) => !p)}
                title="复制一段游戏内海图库存搜索串，可精确高亮这块棋盘上的海图"
              >
                {searchMsg || '⌕ 复制游戏内搜索'}
              </button>
            </div>
            <div className="muted small-note" style={{ marginTop: 0 }}>
              用于比较布局的相对分数，基于你的权重和估算的词缀价值。不是精确的战利品价值。详见下方实际内容。
            </div>
            <div className="reward-grid">
              {ALL_STATS.filter((s) => score.perStat[s] > 0)
                .sort((a, b) => score.perStat[b] - score.perStat[a])
                .map((s, i) => (
                  <div key={s} className={`reward-card ${i === 0 ? 'best' : ''}`}>
                    <div className="reward-value">+{Math.round(score.perStat[s] * 100)}%</div>
                    <div className="reward-label">{STAT_LABELS[s]}</div>
                  </div>
                ))}
              {ALL_STATS.every((s) => score.perStat[s] === 0) && (
                <div className="muted">放置海图以查看加成</div>
              )}
            </div>
            {ALL_STATS.some((s) => score.perStat[s] > 0) && (
              <div className="muted small-note">整个航行中每个区域的平均加成。</div>
            )}
            {notables.length > 0 && (
              <>
                <div className="panel-title small">保底效果与亮点</div>
                <div className="notable-list">
                  {notables.map((n) => (
                    <span key={n.label} className="notable-item" title={n.full}>
                      {n.label}
                      {n.count > 1 ? ` ×${n.count}` : ''}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        <section className="col solver-col">
          {jackpots.map((j) => (
            <div key={j.strategyId} className="jackpot-banner">
              <span className="jackpot-label">🎰 头奖：{j.label}。</span>
              <button onClick={() => patch({ strategyId: j.strategyId })}>切换策略</button>
            </div>
          ))}
          <StrategiesPanel
            activeId={state.strategyId}
            pool={state.pool}
            borders={state.borders}
            onSelect={(id) => patch({ strategyId: id })}
            layoutChoice={state.layoutChoice}
            onLayoutChoice={(sid, lid) =>
              patch({ layoutChoice: { ...state.layoutChoice, [sid]: lid } })
            }
          />
        </section>
      </main>
    </div>
  )
}
