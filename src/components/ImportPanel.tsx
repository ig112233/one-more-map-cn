import { useCallback, useEffect, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { ALL_GOOD_MODS_REGEX, RARE_IMPLICITS } from '../data/strategies'
import { generateDemoCharts } from '../logic/demo'
import { parseBorderOcrPayload } from '../logic/borderOcr'
import { isChartClipboardText, parseChartText } from '../logic/parser'
import type { AppState } from '../logic/storage'
import { defaultState } from '../logic/storage'
import type { ChartData } from '../types'

interface Props {
  onImport: (charts: ChartData[]) => void
  state: AppState
  onLoadState: Dispatch<SetStateAction<AppState>>
}

export function ImportPanel({ onImport, state, onLoadState }: Props) {
  const [text, setText] = useState('')
  const [msg, setMsg] = useState('')
  // celebratory alert when an import brings in rare-implicit (Divine fuel) charts
  const [rareAlert, setRareAlert] = useState('')

  const doParse = useCallback((raw?: string) => {
    const source = raw ?? text
    const borderOcr = parseBorderOcrPayload(source)
    const { charts, rejected } = parseChartText(borderOcr.chartText)
    const notCharted = rejected.filter((r) => r.reason.startsWith('not charted'))
    if (charts.length === 0 && rejected.length === 0 && borderOcr.blockCount === 0) {
      setMsg('没有识别到物品。这是 Ctrl+C 的物品文本吗？')
      return
    }

    if (borderOcr.blockCount > 0) {
      // A complete importer sweep is a snapshot of all 12 current rolls.
      // Start clean so an OCR miss cannot leave a stale modifier from an
      // earlier run and masquerade as a wrongly recognized border - but an
      // ALL-miss sweep (bad aim, tooltips not visible) must never wipe
      // borders the user already entered.
      onLoadState((current) => {
        const fullSweep = borderOcr.blockCount >= 12 && borderOcr.matches.length > 0
        const borders = fullSweep ? [...borderOcr.borders] : [...current.borders]
        for (const match of borderOcr.matches) borders[match.index] = match.id
        return {
          ...current,
          pool: charts.length > 0 ? [...current.pool, ...charts] : current.pool,
          borders,
        }
      })
    } else if (charts.length > 0) {
      onImport(charts)
    }
    if (charts.length > 0 || borderOcr.blockCount > 0) {
      setText('')
    }

    const parts: string[] = []
    if (charts.length) parts.push(`导入了 ${charts.length} 张海图`)
    // distinct physical charts always differ in their rolled values, so a big
    // batch of byte-identical imports means the bulk importer's mouse hovered
    // one item the whole sweep - bad grid calibration (issue #20)
    if (charts.length >= 5) {
      const key = (c: ChartData) =>
        JSON.stringify([c.name, c.level, c.modIds, c.implicitText, c.rewards, c.shape, c.rawText])
      const first = key(charts[0])
      if (charts.every((c) => key(c) === first))
        parts.push(
          `⚠ 全部 ${charts.length} 张完全相同 - 如果来自批量导入器，说明网格校准有误（重新运行设置向导，然后清空海图重新导入）`,
        )
    }
    if (borderOcr.blockCount > 0) {
      parts.push(
        `匹配了 ${borderOcr.matches.length}/${borderOcr.blockCount} 个边框词缀`,
      )
    }
    if (notCharted.length)
      parts.push(
        `跳过了 ${notCharted.length} 张未绘图的（先跑一次以揭示其词缀）`,
      )
    const otherRejects = rejected.length - notCharted.length
    if (otherRejects > 0) parts.push(`跳过了 ${otherRejects} 个无法识别的`)
    if (borderOcr.blockCount > 0 && borderOcr.matches.length === 0) {
      parts.push(
        '没有识别到边框提示 - 保留了你现有的边框（请重新检查脚本向导中的边框校准）',
      )
    } else if (borderOcr.misses.length > 0) {
      parts.push(`边框 ${borderOcr.misses
        .map((miss) => miss.index + 1)
        .join('、')} 处 OCR 未匹配`)
    }
    setMsg(parts.join('；') || '没有导入任何内容')

    // rare-implicit charts are the Divine strategies' fuel - flag them loudly
    // so a jackpot piece never slips into the library unnoticed
    const rares = charts.filter((c) =>
      c.modIds.some((id) => (RARE_IMPLICITS as readonly string[]).includes(id)),
    ).length
    setRareAlert(
      rares > 0
        ? `导入了 ${rares} 张稀有怪物海图 - 神圣石策略的燃料！在图库中 🔒 锁定，直到你跑神圣石边框板。`
        : '',
    )
  }, [onImport, onLoadState, text])

  // Ctrl+V anywhere on the page: if the clipboard holds chart item text, import
  // it straight away (no need to focus the box). Normal pastes into fields are
  // untouched because only chart-shaped text is intercepted.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const clip = e.clipboardData?.getData('text') ?? ''
      if (!isChartClipboardText(clip) && !/===\s*VOYAGE BORDER/i.test(clip)) return
      e.preventDefault()
      doParse(clip)
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [doParse])

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'voyage-solver-state.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const importJson = (file: File) => {
    file.text().then((t) => {
      try {
        onLoadState({ ...defaultState(), ...JSON.parse(t) })
        setMsg('已从 JSON 载入状态')
      } catch {
        setMsg('无效的 JSON 文件')
      }
    })
  }

  const clearAll = () => {
    if (window.confirm('清空所有海图、棋盘和边框？')) onLoadState(defaultState())
  }

  return (
    <div className="import-panel">
      <div className="panel-title">导入</div>
      <textarea
        rows={5}
        placeholder={
          '在游戏中复制一张海图（Ctrl+C），然后在页面上任意位置按 Ctrl+V 即可导入。Windows 批量导入器还可以用本地 OCR 填充全部 12 个边框词缀。'
        }
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="import-actions">
        <button onClick={() => doParse()} disabled={!text.trim()}>
          解析并添加
        </button>
        <button
          title="生成随机海图以试用工具"
          onClick={() => {
            onImport(generateDemoCharts(25))
            setMsg('已添加 25 张随机演示海图')
          }}
        >
          🎲 演示 ×25
        </button>
        <button onClick={exportJson} title="把海图保存到 JSON 文件">
          导出
        </button>
        <label className="file-btn" title="从 JSON 文件载入海图">
          载入
          <input
            type="file"
            accept=".json"
            onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])}
          />
        </label>
        <button onClick={clearAll} title="清空所有海图、棋盘和边框">
          重置
        </button>
      </div>
      {msg && <div className="muted pad">{msg}</div>}
      {rareAlert && (
        <div className="import-rare-alert">
          <span>🎰 {rareAlert}</span>
          <button className="announce-close" title="Dismiss" onClick={() => setRareAlert('')}>
            ✕
          </button>
        </div>
      )}

      <details className="ahk-help">
        <summary>🎲 洗海图与存图（Milky 的正则）</summary>
        <p className="muted">
          海图跑完后无法再洗，所以先洗再跑（数量会放大保险箱）。把这些粘贴进游戏内海图搜索 - 来自 Milky 的表。
        </p>
        <div className="roll-regex-row">
          <span className="roll-regex-label">所有好词缀（保留）</span>
          <input readOnly value={ALL_GOOD_MODS_REGEX} onFocus={(e) => e.target.select()} />
        </div>
        <div className="roll-regex-row">
          <span className="roll-regex-label">120%+ 数量</span>
          <input readOnly value={'"m q.*(1[2-9].|[2-9]..)%"'} onFocus={(e) => e.target.select()} />
        </div>
        <div className="roll-regex-row">
          <span className="roll-regex-label">75%+ 硫磺（留给 Filthscrabble）</span>
          <input readOnly value={'"sul.*(7[5-9]|[89].|\\d..)%"'} onFocus={(e) => e.target.select()} />
        </div>
      </details>

      <details className="ahk-help">
        <summary>🖱️ 从 PoE 批量导入海图 + 棋盘边框（Windows OCR）</summary>
        <p className="muted">
          一个自包含的 AutoHotkey 脚本会复制每一张海图，用 Windows OCR 读取全部 12 个棋盘边框提示，
          并一次性粘贴到这里。OCR 完全在本机进行；不会上传任何截图。
        </p>
        <a className="ahk-dl" href={`${import.meta.env.BASE_URL}voyage-import.ahk`} download>
          ⬇ 下载 voyage-import.ahk
        </a>
        <ol className="ahk-steps">
          <li>
            安装{' '}
            <a href="https://www.autohotkey.com/" target="_blank" rel="noopener noreferrer">
              AutoHotkey v2
            </a>{' '}
            （仅限 Windows）。
          </li>
          <li>
            在 PoE（窗口化或窗口化全屏）中打开航行棋盘，确保海图面板完全可见且未滚动。
          </li>
          <li>
            保持此标签页打开 - 脚本会按标题 <em>Allflame Voyage Solver</em> 找到它。先点一下本页使其获得焦点。
          </li>
          <li>
            双击脚本 - 首次运行会打开<strong>设置向导</strong>，带你一步步校准海图网格和全部 12 个边框位置，带实时进度。
            （随时可重新运行：托盘图标 → <em>设置向导…</em>。）
          </li>
          <li>
            日常使用：<kbd>F9</kbd> 复制海图并用 OCR 扫描 12 个边框后一并导入 · <kbd>Shift+F9</kbd> 只导入边框 · <kbd>F10</kbd> 中止。
            4K 屏幕下边框 OCR 大约需要 15-30 秒。
          </li>
          <li>
            不喜欢按键？托盘图标 → <em>按键绑定…</em> - 每个热键都可重新绑定并在会话间保存。校准按键只在向导打开时生效，
            因此不会与你在 PoE 中的绑定冲突。
          </li>
        </ol>
        <p className="muted small">
          如果 PoE 以管理员身份运行，请也以管理员身份运行脚本，否则按键无法到达游戏。运行期间不要碰鼠标或键盘。
        </p>
      </details>
    </div>
  )
}
