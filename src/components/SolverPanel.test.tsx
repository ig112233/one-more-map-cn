import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { strategyById } from '../data/strategies'
import { defaultState } from '../logic/storage'
import { SolverPanel } from './SolverPanel'

const reservationInput = (html: string, id: string) =>
  html.match(new RegExp(`<input[^>]*value="${id}"[^>]*>`))?.[0]

function renderPanel(strategyId: string | null, meatfish = true): string {
  const state = defaultState()
  state.strategyReservations.meatfish = meatfish
  return renderToStaticMarkup(
    <SolverPanel
      state={state}
      activeStrategy={strategyId ? strategyById.get(strategyId)! : null}
      onPatch={() => undefined}
      onResults={() => undefined}
    />,
  )
}

const renderReservations = (meatfish = true) => renderPanel('alc-and-go', meatfish)

describe('solver strategy protections', () => {
  it('shows all three keeper categories enabled by default', () => {
    const html = renderReservations()

    expect(html).toContain('为其他策略保护海图')
    expect(reservationInput(html, 'divine')).toContain('checked=""')
    expect(reservationInput(html, 'meatfish')).toContain('checked=""')
    expect(reservationInput(html, 'ethereal')).toContain('checked=""')
  })

  it('renders a disabled category as unchecked', () => {
    const html = renderReservations(false)

    expect(reservationInput(html, 'divine')).toContain('checked=""')
    expect(reservationInput(html, 'meatfish')).not.toContain('checked=""')
  })

  it('offers all three toggles in every mode - the bank applies everywhere', () => {
    for (const strategyId of [null, 'milky-meatfish', 'divine-border-rares']) {
      const html = renderPanel(strategyId)
      expect(html).toContain('为其他策略保护海图')
      expect(reservationInput(html, 'divine')).toContain('checked=""')
      expect(reservationInput(html, 'meatfish')).toContain('checked=""')
      expect(reservationInput(html, 'ethereal')).toContain('checked=""')
    }
  })
})
