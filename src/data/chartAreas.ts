import type { ChartAreaType } from '../types'

export interface ChartAreaDefinition {
  id: ChartAreaType
  english: string
  korean: string
  /** Simplified-Chinese display name */
  chinese?: string
}

/**
 * Canonical Chart destination names and their verified Korean-client names.
 *
 * The first 14 pairs are the matching English/Korean rows in PoEDB's
 * Comprehensive Charting list. Kishara's Rest is the special boss destination
 * observed in the supplied Korean-client Chart corpus.
 *
 * https://poedb.tw/us/Comprehensive_Charting
 * https://poedb.tw/kr/Comprehensive_Charting
 */
export const CHART_AREAS = [
  { id: 'anchorfield', english: 'Anchorfield', korean: '정박장', chinese: '锚地' },
  {
    id: 'brine-kings-domain',
    english: "Brine King's Domain",
    korean: '염수왕의 영토',
    chinese: '盐水王领地',
  },
  {
    id: 'clam-infested-shelf',
    english: 'Clam-infested Shelf',
    korean: '조개투성이 선반',
    chinese: '蛤蜊遍布的浅滩',
  },
  { id: 'diving-shoals', english: 'Diving Shoals', korean: '잠수 모래톱', chinese: '潜水沙洲' },
  { id: 'eldritch-depths', english: 'Eldritch Depths', korean: '섬뜩한 지하', chinese: '诡异深渊' },
  {
    id: 'hazardous-depths',
    english: 'Hazardous Depths',
    korean: '위태한 지하',
    chinese: '危险深渊',
  },
  {
    id: 'infested-bathyspheres',
    english: 'Infested Bathyspheres',
    korean: '감염된 잠수구',
    chinese: '虫群浸染的深海潜水器',
  },
  { id: 'lost-ruins', english: 'Lost Ruins', korean: '잃어버린 폐허', chinese: '失落遗迹' },
  { id: 'abyssal-plain', english: 'Abyssal Plain', korean: '심연의 평야', chinese: '深渊平原' },
  { id: 'pelagic-abyss', english: 'Pelagic Abyss', korean: '원양 심연', chinese: '远洋深渊' },
  { id: 'seafloor-ridges', english: 'Seafloor Ridges', korean: '해저 마루', chinese: '海床山脊' },
  { id: 'sea-pillars', english: 'Sea Pillars', korean: '바다 기둥', chinese: '海柱' },
  { id: 'sunken-totems', english: 'Sunken Totems', korean: '가라앉은 토템', chinese: '沉没图腾' },
  { id: 'undersea-groves', english: 'Undersea Groves', korean: '바다 밑 숲', chinese: '海底林地' },
  { id: 'kisharas-rest', english: "Kishara's Rest", korean: '키샤라의 안식처', chinese: '基莎拉之憩' },
] as const satisfies readonly ChartAreaDefinition[]

const normalize = (text: string): string =>
  text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()

const chartAreaByAlias = new Map<string, ChartAreaType>()
for (const area of CHART_AREAS) {
  chartAreaByAlias.set(normalize(area.english), area.id)
  chartAreaByAlias.set(normalize(area.korean), area.id)
}

/** Exact localized-name lookup; unknown future destinations remain undefined. */
export function chartAreaTypeForText(text: string): ChartAreaType | undefined {
  return chartAreaByAlias.get(normalize(text))
}
