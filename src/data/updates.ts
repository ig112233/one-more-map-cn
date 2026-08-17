// Site updates log: NEW features and REWORKED behaviour only - bug fixes and
// data corrections stay out. Newest first; the top entry's date drives the
// "unseen updates" dot on the header button.

export interface UpdateEntry {
  /** ISO date the feature shipped */
  date: string
  tag: 'new' | 'reworked'
  title: string
  /** one or two plain sentences - what it is and where to find it */
  detail: string
}

export const UPDATES: UpdateEntry[] = [
  {
    date: '2026-08-14',
    tag: 'new',
    title: 'HDR 感知边框捕获（实验性）',
    detail:
      '边框导入在 Windows HDR 下失败？导入器现在能检测 HDR 并切换到色调映射捕获路径，读取真实的 HDR 帧而不是褪色的像素。自动启用；如果出错会回退到旧的捕获方式。重新下载脚本并在 GitHub 上报告 HDR 测试结果 - 这个功能没有 HDR 硬件很难测试。',
  },
  {
    date: '2026-08-14',
    tag: 'new',
    title: '导入器诊断包',
    detail:
      '导入器出问题了？右键托盘图标选择"保存诊断包..." - 它会将校准数据、活动日志和上次扫描结果打包成 zip 文件放到桌面，直接拖到 GitHub issue 即可。截图只有你明确同意才会包含。重新下载脚本获取。',
  },
  {
    date: '2026-08-14',
    tag: 'new',
    title: '反馈链接',
    detail:
      '🐛 标题栏的反馈链接直达 GitHub issue tracker - 我们积极监控，bug 报告和功能建议都欢迎（本周几个功能就是来自那里和 Reddit）。',
  },
  {
    date: '2026-08-11',
    tag: 'reworked',
    title: '单次扫描边框 OCR（按住 Alt）',
    detail:
      '按住 Alt 时游戏会显示所有边框提示，导入器从单次截图读取全部12个 - 只需几秒而不是15-30秒。概览失败时自动回退到旧的逐个扫描。空行跳过现在也可在向导中配置（设为0如果你把海图放在页面底部）。重新下载脚本获取。',
  },
  {
    date: '2026-08-11',
    tag: 'new',
    title: '点金就跑布局选择器',
    detail:
      '在策略卡片上选择你的高速公路形状：经典三车道高速公路（均匀消耗末端和角落海图）或社区Requested的S蛇形 - 一条连续路径，跑图最快。选择会保存。',
  },
  {
    date: '2026-08-07',
    tag: 'reworked',
    title: '批量导入器扫描双页',
    detail:
      '游戏的海图面板新增了第二页 - 导入器现在在两个标签页之间切换并扫描两页（重新运行一次托盘设置向导来教会它标签页位置）。扫描也更快：连续空格子会跳过剩余页面。',
  },
  {
    date: '2026-08-06',
    tag: 'new',
    title: '锚地钓鱼（ANCHORFIELD FISHING）策略',
    detail:
      'Community jackpot-fishing strat: one Anchorfield chart plus a board of high-quant charts. Hunt the chaos→divine blessing in the other areas first, 等祝福出现后再开锚地的沉没战利品 - 求解器会保留你最好的锚地海图并堆叠数量。',
  },
  {
    date: '2026-08-03',
    tag: 'reworked',
    title: '细粒度神圣石存图 + 自定义海图类型',
    detail:
      'The 🔖 wizard now splits Starfish from Strongboxes, big generic boxes (+2-4/+5, Divine-mandatory) from Diviner/Arcanist/Operative boxes (free by default - 它们的计数到不了 4）、把全航行稀有怪与相邻稀有怪分开（相邻可自由消耗）。每一步还带一个可搜索的“+ 添加海图类型”选择器，按类型分组（所有预言家等级算作一项）。感谢 sincere-bat 的设计（issue #21）。',
  },
  {
    date: '2026-08-02',
    tag: 'new',
    title: '网站教程',
    detail:
      '站名旁的 🧭 教程按钮分 8 步讲解完整流程 - 导入、边框、策略、存图数量、求解、复制进游戏、完成 - 每一步都会高亮页面对应区域。📋 计划按钮也移到了求解按钮旁边。',
  },
  {
    date: '2026-08-02',
    tag: 'new',
    title: '存图数量向导',
    detail:
      '🔖 为策略存图…（海图库）用“保留 X”步进器带你逐一设置每个策略推荐的海图类型 - 求解器为每种类型保留最好的 X 张，超出部分全部正常消耗。已存图带 🔒 并标明所属策略；多个策略共用的海图类型只给一个旋钮，按需求最大的策略来定。',
  },
  {
    date: '2026-08-02',
    tag: 'reworked',
    title: '保护改为存图数量',
    detail:
      '一刀切的保留（“存下每张灯笼图”）已被移除：现在每项保护都只为每种推荐组件类型存最好的 X 张，默认值按各策略实际需求（稀有怪图多存一张备用）。求解设置里的开关可整体关闭某类存图。',
  },
  {
    date: '2026-08-02',
    tag: 'new',
    title: '会话规划器',
    detail:
      '📋 计划（求解按钮旁）把整个海图库排成运行顺序：组件齐了就先跑收益拉满的策略，中心图还够时跑竞速，剩下的跑点金就跑 - 并显示每个等待中的策略还缺什么。',
  },
  {
    date: '2026-08-02',
    tag: 'new',
    title: '稀有怪海图导入提醒',
    detail:
      '导入稀有怪物海图（神圣石策略燃料）时现在会在导入面板弹出金色提醒，头奖组件绝不会无声无息混进图库。',
  },
  {
    date: '2026-08-02',
    tag: 'new',
    title: '图库中的策略燃料锁定',
    detail:
      '被保存为其他策略燃料的海图（神圣石策略的稀有怪隐式词缀、Meatfish 的稀有怪碎裂）现在会在海图库显示 🔒 徽章，悬停提示标明所属策略。徽章跟随保护开关变化。',
  },
  {
    date: '2026-08-02',
    tag: 'new',
    title: '可配置的存图保护',
    detail:
      '求解设置现在有“为其他策略保护海图”复选框（神圣石 / Meatfish / 魔法虚无）。关闭某类后，点金就跑和竞速就能消耗这些海图 - 求解提示会告诉你留了什么、为什么。社区贡献者 Alkwer。',
  },
  {
    date: '2026-08-01',
    tag: 'reworked',
    title: '求解按钮居中前置',
    detail:
      '求解按钮现在直接位于棋盘下方、复制进游戏按钮上方。结果以可点击卡片展示（分数 + 可运行徽章）；最优解自动载入并标记为“已在棋盘”。',
  },
  {
    date: '2026-08-01',
    tag: 'new',
    title: '海图目的地驱动策略',
    detail:
      '导入现在会识别任意客户端语言的目的地行（海柱、远洋深渊等），因此海柱和远洋深渊策略组件能被可靠识别。社区贡献者 jinyounghub。',
  },
  {
    date: '2026-08-01',
    tag: 'new',
    title: '韩文客户端支持',
    detail:
      '批量导入器和边框 OCR 支持韩文客户端：海图名、隐式词缀和所有边框提示都与英文映射到同一套求解器数据。社区贡献者 jinyounghub。',
  },
  {
    date: '2026-08-01',
    tag: 'reworked',
    title: '锁定海图固定不动',
    detail:
      '放在棋盘上并 🔒 保留的海图会被固定在其精确格子和旋转角度 - 每次求解都会让其余八张海图围绕它排列，而不是移动它。',
  },
  {
    date: '2026-08-01',
    tag: 'new',
    title: '导入器设置向导',
    detail:
      'Windows 批量导入器首次运行会打开引导覆盖层：校准海图网格、点击全部 12 个边框点位、预览、完成。一个上下文按键（F7）即可处理所有校准步骤；所有热键都可在托盘菜单重新绑定。',
  },
  {
    date: '2026-08-01',
    tag: 'new',
    title: '边框 OCR 导入',
    detail:
      'Windows 批量导入器使用本地 Windows OCR 读取全部 12 个棋盘边框提示，随海图一起自动填充。Shift+F9 只导入边框。与 Alkwer 共同开发。',
  },
  {
    date: '2026-07-30',
    tag: 'new',
    title: '神圣石保险箱与点金就跑策略',
    detail:
      '新增两个精选策略：cutedog_ 的神圣石保险箱（远洋深渊放在神圣石边框格子上）和点金就跑 - 只使用其他策略都不要的海图的单车道垃圾焚烧流。头奖提醒会标记“不掉落装备”海图和神圣石边框，并支持一键切换策略。',
  },
  {
    date: '2026-07-30',
    tag: 'new',
    title: '开源',
    detail:
      '求解器以 MIT 许可开源并附贡献指南 - 欢迎在 GitHub 提交 issue 和 pull request。',
  },
  {
    date: '2026-07-29',
    tag: 'new',
    title: '精选策略页签',
    detail:
      'Pick a community strategy (Milkybk_’s Speedrun Strongboxes, Meatfish and Magic Ethereal, plus Divine Border Rares) and the solver builds its exact board: piece placements, connector layout, reserved charts, readiness warnings when you lack the pieces, and rolling regexes.',
  },
  {
    date: '2026-07-27',
    tag: 'new',
    title: 'Windows 批量导入器',
    detail:
      '可下载的 AutoHotkey 脚本扫描你游戏内的整个海图面板，一次粘贴全部导入 - 不再需要一张张复制。在导入面板中可以找到它。',
  },
  {
    date: '2026-07-27',
    tag: 'new',
    title: '航行词缀计数与填仓航行',
    detail:
      '棋盘会实时显示区域/相邻/全航行词缀与连接数。填仓航行按钮会用你价值最低的多余海图构建一张一次性棋盘，同时保证最好的九张和锁定海图安全。',
  },
  {
    date: '2026-07-27',
    tag: 'reworked',
    title: '真实连接规则与逐奖励权重',
    detail:
      '求解器只给出可运行的棋盘：相邻连接必须匹配、九个格子全部填满、所有海图都能从 ⚓ 起点到达。奖励权重改为每种奖励类型一个滑块，按作用范围分组并默认折叠。',
  },
  {
    date: '2026-07-25',
    tag: 'new',
    title: '复制进游戏与完成航行',
    detail:
      '复制进游戏按游戏内填充顺序（先左下）逐步遍历你的棋盘，为每张海图复制搜索串 - Ctrl+C 前进。完成航行会消耗棋盘上的海图，并逐张询问哪些保留海图真的存活了。',
  },
]

/** the newest entry's date - drives the unseen-updates dot */
export const LATEST_UPDATE_DATE = UPDATES[0].date
