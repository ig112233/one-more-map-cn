import { describe, expect, it } from 'vitest'
import { CHINESE_BORDER_MOD_EVIDENCE } from '../data/borderMods.zh'
import { borderModById } from '../data/mods'
import { parseBorderOcrPayload } from './borderOcr'

const block = (text: string, index = 0) =>
  `=== VOYAGE BORDER ${index} ===\n${text}\n=== END VOYAGE BORDER ===`

describe('Chinese border OCR matching', () => {
  it('maps every translated candidate to its canonical border id and text', () => {
    for (const [id, evidence] of Object.entries(CHINESE_BORDER_MOD_EVIDENCE)) {
      const result = parseBorderOcrPayload(block(evidence.text))
      const canonical = borderModById.get(id)

      expect(result.misses, id).toEqual([])
      expect(result.matches, id).toHaveLength(1)
      expect(result.matches[0].id, id).toBe(id)
      expect(result.matches[0].text, id).toBe(canonical?.text)
      expect(result.borders[0], id).toBe(id)
    }
  })

  it('matches the unspaced client rendering (CN tooltips carry no spaces)', () => {
    const result = parseBorderOcrPayload(block('相邻区域怪物群规模提高16%'))

    expect(result.misses).toEqual([])
    expect(result.matches[0]).toMatchObject({ id: 'b-pack-1', exact: false })
  })

  it('tolerates word-order and measure-word drift from the poedb phrasing', () => {
    const result = parseBorderOcrPayload(block('相邻区域额外包含4个黄金灯笼'))

    expect(result.misses).toEqual([])
    expect(result.matches[0]).toMatchObject({ id: 'b-goldlantern' })
  })

  it('joins the two-line quantity-per-connection tooltip', () => {
    const result = parseBorderOcrPayload(
      block(
        '相邻区域发现的物品数量每连接降低 50%\n相邻区域发现的物品数量提高 180%',
      ),
    )

    expect(result.matches[0]).toMatchObject({ id: 'b-quantconn-2', exact: true })
  })

  it('does not cross-match 通货总增 with 圣甲虫总增', () => {
    expect(
      parseBorderOcrPayload(block('相邻区域发现的通货总增75%')).matches[0]?.id,
    ).toBe('b-curr-2')
    expect(
      parseBorderOcrPayload(block('相邻区域发现的圣甲虫总增75%')).matches[0]?.id,
    ).toBe('b-scarab-2')
  })

  it('does not guess an unobserved numeric tier', () => {
    const result = parseBorderOcrPayload(block('相邻区域的怪物群规模提高 20%'))

    expect(result.matches).toEqual([])
    expect(result.misses).toHaveLength(1)
  })

  it('rejects unrelated Chinese tooltip text', () => {
    const result = parseBorderOcrPayload(
      block('相邻区域的怪物会掉落完全不同的特殊奖励'),
    )

    expect(result.matches).toEqual([])
    expect(result.misses).toHaveLength(1)
  })

  it('ignores leading OCR noise line', () => {
    const result = parseBorderOcrPayload(
      block('杂讯文字\n相邻区域包含 4 个额外黄金灯笼', 3),
    )

    expect(result.misses).toEqual([])
    expect(result.matches).toEqual([
      expect.objectContaining({ index: 3, id: 'b-goldlantern' }),
    ])
  })
})
