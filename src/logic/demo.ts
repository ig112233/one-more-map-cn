// Random demo chart generator - for playing with the tool at realistic pool sizes
// before real chart data is available.

import { VOYAGE_MODS } from '../data/mods'
import type { ChartData, Edges } from '../types'
import { newUid } from './parser'

const PREFIXES = ['沉没', '溺亡', '深渊', '珊瑚', '海藻缠绕', '咸腐', '潮汐', '利维坦', '藤壶覆盖', '珍珠光泽', '无底', '失事', '海妖', '装甲', '风暴侵蚀']
const BASES = ['暗礁', '海沟', '宝库', '迷宫', '墓园', '浅滩', '裂谷', '洞穴', '盆地', '山脊', '空洞', '洞窟', '旷野', '森林']
const SUFFIXES = ['', '', '', ' 之力量', ' 之丰饶', ' 之深渊', ' 之金币', ' 之风暴', ' 之废墟']

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

function randomEdges(): Edges {
  // weight toward 2–3 connectors like the shapes seen in game
  const count = pick([1, 2, 2, 2, 3, 3, 4])
  const dirs = [0, 1, 2, 3].sort(() => Math.random() - 0.5).slice(0, count)
  const edges: Edges = [false, false, false, false]
  for (const d of dirs) edges[d] = true
  return edges
}

export function generateDemoCharts(count: number): ChartData[] {
  const selfMods = VOYAGE_MODS.filter((m) => m.scope === 'self')
  const implicits = VOYAGE_MODS.filter((m) => m.scope !== 'self')
  const charts: ChartData[] = []
  const usedNames = new Set<string>()
  for (let i = 0; i < count; i++) {
    let name = ''
    do {
      name = `已绘图 ${pick(PREFIXES)} ${pick(BASES)}${pick(SUFFIXES)}`
    } while (usedNames.has(name))
    usedNames.add(name)
    // 1-2 area mods (magic prefix/suffix) + 1 revealed implicit
    const modIds = [pick(selfMods).id]
    if (Math.random() < 0.6) {
      const second = pick(selfMods).id
      if (second !== modIds[0]) modIds.push(second)
    }
    modIds.push(pick(implicits).id)
    charts.push({
      uid: newUid(),
      name,
      level: 68 + Math.floor(Math.random() * 16),
      edges: randomEdges(),
      modIds,
    })
  }
  return charts
}
