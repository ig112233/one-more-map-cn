import { useLayoutEffect, useState } from 'react'

interface Props {
  onClose: () => void
}

interface Step {
  icon: string
  title: string
  /** where this lives on the page */
  where: string
  /** CSS selector of the section to spotlight */
  target: string
  body: string[]
}

const STEPS: Step[] = [
  {
    icon: '🗺️',
    title: '这个网站是干什么的',
    where: '整页从左到右：图库 → 棋盘 → 策略',
    target: 'main',
    body: [
      '航行棋盘需要 9 张海图。每张海图放哪里，决定了它的词缀触及什么 - 相邻加成射入邻近格子、边框洗出结果只在接触的格子上生效，连接口必须对齐否则航行无法开始。',
      '这个网站管理你的海图收藏，了解真实的放置规则，并为你找出最佳可运行棋盘 - 可以用你自己的优先级，也可以用精选的社区策略。',
    ],
  },
  {
    icon: '📥',
    title: '把你的海图导进来',
    where: '海图库（左栏）及其下方的导入面板',
    target: '.library-col',
    body: [
      '快捷方式：游戏中 Ctrl+C 复制海图，然后在页面任意位置 Ctrl+V。立即导入 - 名称、等级、词缀、形状，全部到位。',
      '整个收藏：从导入面板下载 Windows 批量导入器。首次运行的向导会校准你的海图网格；之后一个热键（F9）就能横扫所有海图并同时用本地 OCR 读取全部 12 个棋盘边框，只需几秒。',
      '支持英文和韩文客户端。稀有海图会触发金色提醒，让你知道神圣石燃料已到货。',
    ],
  },
  {
    icon: '🧭',
    title: '输入你的边框',
    where: '棋盘（中间）- 边缘的小槽位',
    target: '.board-grid',
    body: [
      '边框词缀（腐蚀流）只影响它们接触的格子，所以求解器需要知道它们。批量导入器会自动填满全部 12 个。',
      '手动操作：点击任意边框槽位并搜索。角落接触 2 格、边上 1 格。',
      '留意头奖：“每稀有怪 +1 神圣石掉落”边框能把稀有怪板变成印钞机 - 你输入它时网站会大声提醒。',
    ],
  },
  {
    icon: '⚑',
    title: '选一个策略（或手动）',
    where: '策略（右栏）',
    target: '.strategies',
    body: [
      '精选社区配置：点金就跑负责烧多余海图、竞速保险箱作为日常 farm、Meatfish 和魔法虚无是拉满的板子，外加两个神圣石边框头奖配置。',
      '每张卡片显示指南、游戏内洗图正则，以及你是否真的凑齐了组件 - 如果没有，它会告诉你缺什么、期间该跑什么。',
      '更想用自己的优先级？保持“无（手动）”，在求解设置中按奖励类型设置权重。',
    ],
  },
  {
    icon: '🔖',
    title: '存下你的关键海图',
    where: '海图库 → “为策略存图…”',
    target: '.savefor-bar',
    body: [
      '存图数量向导用“保留 X”步进器带你过每个策略推荐的海图类型 - 求解器为每种类型保留你最好的 X 张，其余的全部正常消耗。',
      '已存海图带 🔒 并标明所属策略，永远不会被其它求解或填仓航行烧掉，且在自己的策略运行时随时可用。',
      '默认值与各策略的实际需求一致，所以你可以完全跳过这步，直接就能用。',
    ],
  },
  {
    icon: '⚙',
    title: '求解',
    where: '棋盘下方的大金色按钮',
    target: '.solve-bar',
    body: [
      '按求解。最佳可运行棋盘立即载入；四个备选方案以卡片形式排在旁边 - 点任意一个载入。',
      '每个建议都遵守真实规则：连接匹配、9 格全部填满、所有海图都能从 ⚓ 起点到达。',
      '旁边的 ⚙ 设置按钮包含连接规则、奖励权重、保护和填仓航行构建器（用你最差的多余海图做一次性棋盘）。',
    ],
  },
  {
    icon: '📋',
    title: '把它复制进游戏',
    where: '结果下方的“复制进游戏”',
    target: '.voyage-finish',
    body: [
      '游戏先填左下角 - 这个功能正好按该顺序遍历你的棋盘。',
      '每一步都复制对应海图的游戏内搜索串：粘贴到海图库存、Ctrl+左键点击它高亮的海图、在这里按 Ctrl+C 前进。九张海图，零失误。',
      '想先把某张海图锁在某个格子上？在格子上把它标记为 🔒 保留，之后每次求解都会把它精确固定在那里。',
    ],
  },
  {
    icon: '🌊',
    title: '跑图、完成、再来',
    where: '“完成航行” - 然后 📋 计划（求解按钮旁）看全局',
    target: '.solve-bar',
    body: [
      '航行结束后按完成航行（在复制进游戏旁）：它会消耗棋盘海图，并逐一询问哪些保留海图真的存活了。',
      '求解旁的 📋 计划按钮会把你的整个海图库排成运行顺序 - 组件齐了就上拉满的板子，中心图还够时跑竞速，剩下的跑点金就跑。',
      '顶部的更新按钮列出所有新功能。祝好运 - 愿每个边框都是神圣石。',
    ],
  },
]

const RING_PAD = 6

/** Guided "how to use this site" walkthrough: dims the page and spotlights
 *  the section each step talks about, with the card docked out of the way. */
export function Tutorial({ onClose }: Props) {
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const s = STEPS[step]
  const last = step === STEPS.length - 1

  // track the spotlighted section (through smooth scrolling and resizes)
  useLayoutEffect(() => {
    const el = document.querySelector(STEPS[step].target)
    if (!el) {
      setRect(null)
      return
    }
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    const update = () => setRect(el.getBoundingClientRect())
    update()
    const timer = window.setInterval(update, 120)
    window.addEventListener('resize', update)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('resize', update)
    }
  }, [step])

  // dock the card where it won't cover the spotlight
  const dockTop = !!rect && rect.bottom > window.innerHeight * 0.62

  return (
    <>
      <div className="tut-catcher" onClick={onClose} />
      {rect ? (
        <div
          className="tut-ring"
          style={{
            top: rect.top - RING_PAD,
            left: rect.left - RING_PAD,
            width: rect.width + RING_PAD * 2,
            height: rect.height + RING_PAD * 2,
          }}
        />
      ) : (
        <div className="tut-dim" />
      )}
      <div className={`onboard tutorial tut-docked ${dockTop ? 'tut-top' : ''}`}>
        <div className="panel-title">
          {s.icon} {s.title}
          <span className="spacer" />
          <button onClick={onClose}>✕</button>
        </div>
        <div className="tut-where">📍 {s.where}</div>
        {s.body.map((p, i) => (
          <p key={i} className="tut-body">
            {p}
          </p>
        ))}
        <div className="tut-dots">
          {STEPS.map((_, i) => (
            <button
              key={i}
              className={`tut-dot ${i === step ? 'on' : ''}`}
              onClick={() => setStep(i)}
              title={`${STEPS[i].icon} ${STEPS[i].title}`}
            />
          ))}
        </div>
        <div className="sw-actions">
          <button disabled={step === 0} onClick={() => setStep((x) => x - 1)}>
            ← 后退
          </button>
          <span className="spacer" />
          <span className="muted tut-count">
            {step + 1} / {STEPS.length}
          </span>
          <span className="spacer" />
          {!last && (
            <button className="primary tut-next" onClick={() => setStep((x) => x + 1)}>
              下一步 →
            </button>
          )}
          {last && (
            <button className="primary tut-next" onClick={onClose}>
              ⚓ 扬帆起航
            </button>
          )}
        </div>
      </div>
    </>
  )
}
