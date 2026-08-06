import { useMemo, useState } from 'react'
import { BORDER_MODS, VOYAGE_MODS, modText } from '../data/mods'
import type { Scope } from '../types'
import { STAT_SHORT } from '../types'

interface Props {
  disabled: Set<string>
  onToggle: (id: string, off: boolean) => void
  onBulk: (ids: string[], off: boolean) => void
  onClose: () => void
}

interface Group {
  title: string
  hint: string
  mods: { id: string; text: string; short?: string; value?: string }[]
}

const valueLabel = (effects: { stat: string; percent: number }[]): string | undefined => {
  const e = effects[0]
  if (!e) return undefined
  return `${e.percent > 0 ? '+' : ''}${e.percent}% ${STAT_SHORT[e.stat as keyof typeof STAT_SHORT] ?? e.stat}`
}

export function ModBrowser({ disabled, onToggle, onBulk, onClose }: Props) {
  const [q, setQ] = useState('')

  const groups: Group[] = useMemo(() => {
    const byScope = (scope: Scope) =>
      VOYAGE_MODS.filter((m) => m.scope === scope).map((m) => ({
        id: m.id,
        text: modText(m),
        short: m.short,
        value: valueLabel(m.effects),
      }))
    return [
      { title: '区域词缀', hint: '海图自身的区域', mods: byScope('self') },
      { title: '相邻词缀', hint: '相邻区域', mods: byScope('adjacent') },
      { title: '航行词缀', hint: '整个航行', mods: byScope('global') },
      {
        title: '边框词缀',
        hint: '腐蚀流',
        mods: BORDER_MODS.map((m) => ({
          id: m.id,
          text: modText(m),
          short: m.short,
          value: valueLabel(m.effects) ?? (m.magnitude ? `${m.magnitude}% 强度` : undefined),
        })),
      },
    ]
  }, [])

  const query = q.trim().toLowerCase()
  const match = (m: { text: string; short?: string }) =>
    !query || m.text.toLowerCase().includes(query) || (m.short ?? '').toLowerCase().includes(query)

  const disabledCount = disabled.size

  return (
    <div className="onboard-backdrop" onClick={onClose}>
      <div className="onboard modbrowser" onClick={(e) => e.stopPropagation()}>
        <div className="panel-title">
          海图词缀
          <span className="spacer" />
          <button onClick={onClose}>完成</button>
        </div>
        <p className="onboard-intro" style={{ marginBottom: 8 }}>
          求解器认识的所有词缀。取消勾选你不关心的词缀，它在计分中的价值将变为 0。你的选择会被保存并跨更新保留。
          {disabledCount > 0 ? `（${disabledCount} 关闭）` : ''}
        </p>
        <input
          placeholder="筛选词缀…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ marginBottom: 10 }}
        />
        {groups.map((g) => {
          const shown = g.mods.filter(match)
          if (shown.length === 0) return null
          const ids = shown.map((m) => m.id)
          const anyOn = shown.some((m) => !disabled.has(m.id))
          return (
            <div key={g.title} className="mb-group">
              <div className="mb-group-head">
                <span className="mb-group-title">{g.title}</span>
                <span className="muted mb-group-hint">{g.hint}</span>
                <span className="spacer" />
                <button className="mb-bulk" onClick={() => onBulk(ids, anyOn)}>
                  {anyOn ? '全部禁用' : '全部启用'}
                </button>
              </div>
              <div className="mb-list">
                {shown.map((m) => {
                  const on = !disabled.has(m.id)
                  return (
                    <label key={m.id} className={`mb-row ${on ? '' : 'off'}`}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={(e) => onToggle(m.id, !e.target.checked)}
                      />
                      <span className="mb-text">{m.text}</span>
                      {m.value && <span className="mb-value">{m.value}</span>}
                    </label>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
