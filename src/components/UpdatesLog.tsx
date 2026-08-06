import { UPDATES } from '../data/updates'

interface Props {
  onClose: () => void
}

/** Overlay listing NEW / REWORKED site updates (no bug fixes) - newest first. */
export function UpdatesLog({ onClose }: Props) {
  return (
    <div className="onboard-backdrop" onClick={onClose}>
      <div className="onboard updates-log" onClick={(e) => e.stopPropagation()}>
        <div className="panel-title">
          更新
          <span className="spacer" />
          <button onClick={onClose}>完成</button>
        </div>
        <p className="onboard-intro" style={{ marginBottom: 10 }}>
          有什么新的、什么变了 - 只列新增功能和重构。
        </p>
        <div className="updates-list">
          {UPDATES.map((u) => (
            <div key={`${u.date}-${u.title}`} className="update-row">
              <div className="update-head">
                <span className={`update-tag tag-${u.tag}`}>
                  {u.tag === 'new' ? '新增' : '重构'}
                </span>
                <span className="update-title">{u.title}</span>
                <span className="spacer" />
                <span className="update-date muted">{u.date}</span>
              </div>
              <div className="update-detail muted">{u.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
