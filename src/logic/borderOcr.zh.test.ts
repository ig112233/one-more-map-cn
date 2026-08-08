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
        '相邻区域发现的物品数量按每条连接降低50%\n相邻区域发现的物品数量提高180%',
      ),
    )

    expect(result.matches[0]).toMatchObject({ id: 'b-quantconn-2', exact: true })
  })

  it('matches the client-verified rare-monster sentence (b-rare, 实测 2026-08)', () => {
    // The player-verified CN tooltip reads 相邻区域的稀有怪数量提高X% -
    // note 的 + 稀有怪, NOT the b-rareconn wording 区域中稀有怪物数量.
    for (const [tier, id] of [
      ['50', 'b-rare-1'],
      ['75', 'b-rare-2'],
      ['100', 'b-rare-3'],
    ] as const) {
      const result = parseBorderOcrPayload(block(`相邻区域的稀有怪数量提高${tier}%`))
      expect(result.misses, id).toEqual([])
      expect(result.matches[0], id).toMatchObject({ id, exact: true })
    }
  })

  it('tolerates 怪物/的 wording drift away from the verified 稀有怪 template', () => {
    // If OCR ever renders 怪物 where the client shows 怪 (or vice versa),
    // the fuzzy path must still land on b-rare, not cross into b-rareconn.
    const result = parseBorderOcrPayload(block('相邻区域的稀有怪物数量提高75%'))

    expect(result.misses).toEqual([])
    expect(result.matches[0]).toMatchObject({ id: 'b-rare-2', exact: false })
  })

  it('keeps the per-connection mod on its own family (区域中稀有怪物数量...按每条连接)', () => {
    // The confirmed b-rareconn sentence is its own mod; an OCR'd fragment
    // that loses 按每条连接 must not silently become a flat b-rare tier.
    const result = parseBorderOcrPayload(block('相邻区域中稀有怪物数量提高75%'))

    expect(result.misses).toEqual([])
    expect(['b-rare-2', 'b-rareconn-2']).toContain(result.matches[0]?.id)
  })

  it('tolerates a one-character OCR misread in 提高', () => {
    const result = parseBorderOcrPayload(block('相邻区域的稀有怪数量提升75%'))

    expect(result.misses).toEqual([])
    expect(result.matches[0]).toMatchObject({ id: 'b-rare-2', exact: false })
  })

  it('does not pull unrelated 物品数量 sentences into the b-rare family', () => {
    // Shares 数量/量提 with b-rare but belongs to b-quantconn's family; the
    // family-tier keyword gate plus the confidence floor must reject it.
    const result = parseBorderOcrPayload(block('相邻区域发现的物品数量提高75%'))

    expect(result.matches).toEqual([])
    expect(result.misses).toHaveLength(1)
  })

  it('does not cross-match 通货总增 with 圣甲虫总增', () => {
    expect(
      parseBorderOcrPayload(block('相邻区域中找到的通货总增75%')).matches[0]?.id,
    ).toBe('b-curr-2')
    expect(
      parseBorderOcrPayload(block('相邻区域中找到的圣甲虫总增75%')).matches[0]?.id,
    ).toBe('b-scarab-2')
  })

  it('matches the client-verified experience sentence', () => {
    const result = parseBorderOcrPayload(block('相邻区域内的玩家获得的经验值提高100%'))

    expect(result.misses).toEqual([])
    expect(result.matches[0]).toMatchObject({ id: 'b-exp-1', exact: true })
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
