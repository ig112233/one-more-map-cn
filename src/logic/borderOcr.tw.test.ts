import { describe, expect, it } from 'vitest'
import { TRADITIONAL_CHINESE_BORDER_MOD_EVIDENCE } from '../data/borderMods.tw'
import { borderModById } from '../data/mods'
import { parseBorderOcrPayload } from './borderOcr'

const block = (text: string, index = 0) =>
  `=== VOYAGE BORDER ${index} ===\n${text}\n=== END VOYAGE BORDER ===`

describe('Traditional-Chinese border OCR matching', () => {
  it('maps every poedb-datamined TW sentence to its canonical border id and text', () => {
    for (const [id, evidence] of Object.entries(TRADITIONAL_CHINESE_BORDER_MOD_EVIDENCE)) {
      const result = parseBorderOcrPayload(block(evidence.text))
      const canonical = borderModById.get(id)

      expect(result.misses, id).toEqual([])
      expect(result.matches, id).toHaveLength(1)
      expect(result.matches[0].id, id).toBe(id)
      expect(result.matches[0].text, id).toBe(canonical?.text)
      expect(result.borders[0], id).toBe(id)
    }
  })

  it('matches the unspaced client rendering (TW tooltips carry no spaces)', () => {
    const result = parseBorderOcrPayload(block('增加24%相鄰區域的怪物群大小'))

    expect(result.misses).toEqual([])
    expect(result.matches[0]).toMatchObject({ id: 'b-pack-2', exact: true })
  })

  it('joins the two-line quantity-per-connection tooltip', () => {
    const result = parseBorderOcrPayload(
      block(
        '相鄰區域每與一個區域相連，即減少 50% 找到的物品數量\n增加 120% 相鄰區域找到的物品數量',
      ),
    )

    expect(result.misses).toEqual([])
    expect(result.matches[0]).toMatchObject({ id: 'b-quantconn-1', exact: true })
  })

  it('resolves the poedb Filthscrabble sentence to the octopus-boss border', () => {
    // The TW table's boss row (相鄰區域內含有一個垢爪怪) sits where the CN
    // table shows the count-less corrupted-crab sentence; it is the TW name
    // for the Filthscrabble border mod.
    const result = parseBorderOcrPayload(block('相鄰區域內含有一個垢爪怪'))

    expect(result.misses).toEqual([])
    expect(result.matches[0]).toMatchObject({ id: 'b-octoboss', exact: true })
  })

  it('resolves the TW 亡者硫酸 wording on the sulphur-drop border', () => {
    const result = parseBorderOcrPayload(block('相鄰區域內的稀有怪物被擊殺時會掉落亡者硫酸'))

    expect(result.misses).toEqual([])
    expect(result.matches[0]).toMatchObject({ id: 'b-sulphdrop', exact: true })
  })

  it('keeps the per-connection rare mod on its own family', () => {
    const perConnection = parseBorderOcrPayload(
      block('相鄰區域每與一個區域相連，即增加 75% 稀有怪物數量'),
    )
    expect(perConnection.misses).toEqual([])
    expect(perConnection.matches[0]).toMatchObject({ id: 'b-rareconn-2', exact: true })

    // A flat rare-count sentence must not become the per-connection mod.
    const flat = parseBorderOcrPayload(block('增加 75% 相鄰區域找到的稀有怪物數量'))
    expect(flat.misses).toEqual([])
    expect(flat.matches[0]).toMatchObject({ id: 'b-rare-2', exact: true })
  })

  it('does not cross-match 更多通貨 with 更多聖甲蟲', () => {
    expect(
      parseBorderOcrPayload(block('相鄰區域內找到 75% 更多通貨')).matches[0]?.id,
    ).toBe('b-curr-2')
    expect(
      parseBorderOcrPayload(block('相鄰區域內找到 75% 更多聖甲蟲')).matches[0]?.id,
    ).toBe('b-scarab-2')
  })

  it('does not guess an unobserved numeric tier', () => {
    const result = parseBorderOcrPayload(block('增加 20% 相鄰區域的怪物群大小'))

    expect(result.matches).toEqual([])
    expect(result.misses).toHaveLength(1)
  })

  it('rejects unrelated Traditional-Chinese tooltip text', () => {
    const result = parseBorderOcrPayload(
      block('相鄰區域的怪物會掉落完全不同的特殊獎勵'),
    )

    expect(result.matches).toEqual([])
    expect(result.misses).toHaveLength(1)
  })

  it('ignores leading OCR noise line', () => {
    const result = parseBorderOcrPayload(
      block('雜訊文字\n相鄰區域內含有額外 4 個黃金燈籠', 5),
    )

    expect(result.misses).toEqual([])
    expect(result.matches).toEqual([
      expect.objectContaining({ index: 5, id: 'b-goldlantern' }),
    ])
  })
})
