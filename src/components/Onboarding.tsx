interface Props {
  onClose: () => void
  onDemo: () => void
}

const STEPS: { title: string; body: string }[] = [
  {
    title: '1 · 收集海图',
    body: '地图刷怪时，深水遭遇会掉落失落海图。带着瓦莱丽登上“君主号”跑图即可绘图。这会揭示海图的隐式词缀。',
  },
  {
    title: '2 · 添加到本站',
    body: '在游戏中 Ctrl+C 复制海图，粘贴到导入面板；也可以在图库中手动添加。还没有海图？点 🎲 演示 ×25 用随机池子探索一下。',
  },
  {
    title: '3 · 设置棋盘',
    body: '航行是 3×3 网格，从左下角 ⚓ 格开始。12 个边框段（“腐蚀流”）会增益它们接触的格子。角落两个、中心没有。输入你当前的洗出结果或 🎲 随机生成。游戏中它们用亡者硫磺重洗。',
  },
  {
    title: '4 · 权衡你的战利品',
    body: '告诉求解器你重视什么：通货、圣甲虫、预言卡、硫磺……权重驱动一切：图库中的海图价值、棋盘分数和最佳海图正则。',
  },
  {
    title: '5 · 求解',
    body: '求解会找出让每张海图都保持连接的最高价值布局。点击结果载入，想手动微调也行，然后复制游戏内搜索来在仓库中高亮那些海图。',
  },
]

export function Onboarding({ onClose, onDemo }: Props) {
  return (
    <div className="onboard-backdrop" onClick={onClose}>
      <div className="onboard" onClick={(e) => e.stopPropagation()}>
        <div className="panel-title">规划你的航行</div>
        <p className="onboard-intro">
          用你已绘制的海图构建最有价值的 3×3 航行，围绕连接形状、相邻关系和边框洗出结果自动求解。
        </p>
        {STEPS.map((s) => (
          <div key={s.title} className="onboard-step">
            <div className="onboard-step-title">{s.title}</div>
            <div className="onboard-step-body">{s.body}</div>
          </div>
        ))}
        <div className="onboard-scopes">
          词缀颜色：&nbsp;
          <span className="scope-self">■ 海图自身的区域</span>&nbsp;·&nbsp;
          <span className="scope-adjacent">■ 相邻区域</span>&nbsp;·&nbsp;
          <span className="scope-global">■ 整个航行</span>
        </div>
        <div className="onboard-actions">
          <button
            className="primary"
            onClick={() => {
              onDemo()
              onClose()
            }}
          >
            用 25 张演示海图试试
          </button>
          <button onClick={onClose}>开始规划</button>
        </div>
      </div>
    </div>
  )
}
