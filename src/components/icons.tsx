import type { Stat } from '../types'

const PATHS: Record<Stat, JSX.Element> = {
  // coin stack
  currency: (
    <>
      <ellipse cx="8" cy="4.2" rx="5" ry="2.2" />
      <path d="M3 4.2v3.8c0 1.2 2.2 2.2 5 2.2s5-1 5-2.2V4.2" />
      <path d="M3 8v3.8c0 1.2 2.2 2.2 5 2.2s5-1 5-2.2V8" />
    </>
  ),
  // scarab beetle
  scarabs: (
    <>
      <circle cx="8" cy="9.2" r="4.2" />
      <circle cx="8" cy="3.6" r="1.6" />
      <path d="M8 5.2v8M4.2 7.2 2 5.5M11.8 7.2 14 5.5M4 11l-2 1.2M12 11l2 1.2" />
    </>
  ),
  // skull
  rares: (
    <>
      <path d="M8 1.8a4.6 4.6 0 0 0-4.6 4.6c0 1.9 1.1 3.4 2.6 4.1v2.7h4V10.5c1.5-.7 2.6-2.2 2.6-4.1A4.6 4.6 0 0 0 8 1.8z" />
      <circle cx="6.2" cy="6.4" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="9.8" cy="6.4" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  // sulphur droplet
  sulphur: <path d="M8 1.8S4 7 4 9.6a4 4 0 0 0 8 0C12 7 8 1.8 8 1.8z" />,
  // monster pack
  packsize: (
    <>
      <circle cx="4.8" cy="5" r="2.1" />
      <circle cx="11.2" cy="5" r="2.1" />
      <circle cx="8" cy="10.6" r="2.1" />
    </>
  ),
  // loot chest
  quantity: (
    <>
      <rect x="2.8" y="6.4" width="10.4" height="6.8" rx="1" />
      <path d="M2.8 6.4c0-2.2 2.3-3.6 5.2-3.6s5.2 1.4 5.2 3.6" />
      <path d="M8 6.4v2.4" />
    </>
  ),
  // shield (chart preservation)
  preserve: <path d="M8 1.8l5 1.9v4.2c0 3.4-2.1 5.4-5 6.5-2.9-1.1-5-3.1-5-6.5V3.7l5-1.9z" />,
  // coin pile
  gold: (
    <>
      <circle cx="5.4" cy="10.6" r="2.6" />
      <circle cx="10.6" cy="10.6" r="2.6" />
      <circle cx="8" cy="5.8" r="2.6" />
    </>
  ),
  // divination card
  divcards: (
    <>
      <rect x="4" y="2.2" width="8" height="11.6" rx="1" />
      <path d="M5.8 5h4.4M5.8 7.4h4.4" />
    </>
  ),
  // crystal cage (imprisoned monsters)
  essences: (
    <>
      <path d="M8 1.6 12.6 5.4 11 13H5L3.4 5.4 8 1.6z" />
      <path d="M8 1.6v11.4M3.4 5.4h9.2" />
    </>
  ),
  // ghost (tormented spirits)
  spirits: (
    <>
      <path d="M3.6 13.4V7a4.4 4.4 0 0 1 8.8 0v6.4l-2.2-1.6-2.2 1.6-2.2-1.6-2.2 1.6z" />
      <circle cx="6.4" cy="6.6" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="9.6" cy="6.6" r="0.8" fill="currentColor" stroke="none" />
    </>
  ),
  // sparkles (wildwood wisps)
  wisps: (
    <>
      <path d="M5 2.6v4M3 4.6h4" />
      <path d="M11.4 5.4v3.2M9.8 7h3.2" />
      <path d="M6.6 9.8v3.6M4.8 11.6h3.6" />
    </>
  ),
  // twin orbs (magic monsters)
  magicmonsters: (
    <>
      <circle cx="5.4" cy="8" r="3" />
      <circle cx="11" cy="8" r="2.2" />
    </>
  ),
  // four-point star (item rarity)
  rarity: <path d="M8 1.6 9.6 6.4 14.4 8 9.6 9.6 8 14.4 6.4 9.6 1.6 8 6.4 6.4 8 1.6z" />,
  // ring (unique jewellery)
  uniques: (
    <>
      <circle cx="8" cy="9" r="4.4" />
      <path d="M6.5 3.4 8 1.6l1.5 1.8-1.5 1.4-1.5-1.4z" />
    </>
  ),
  // anchor (treasure)
  treasure: (
    <>
      <circle cx="8" cy="3.4" r="1.6" />
      <path d="M8 5v8M4 8h8M3.2 10.4C3.8 12.6 5.6 14 8 14s4.2-1.4 4.8-3.6" />
    </>
  ),
  // rising arrow (experience)
  exp: <path d="M8 13.6V3.2M4.4 6.8 8 3.2l3.6 3.6" />,
}

// currency + scarabs are game inventory art; the rest are AI-generated in PoE style
// new URL() lets Vite inline/bundle these; plain string paths would 404 in single-file builds
const IMAGE_ICONS: Partial<Record<Stat, string>> = {
  currency: new URL('../assets/icons/icon-currency.png', import.meta.url).href,
  scarabs: new URL('../assets/icons/icon-scarabs.png', import.meta.url).href,
  rares: new URL('../assets/icons/icon-rares.png', import.meta.url).href,
  sulphur: new URL('../assets/icons/icon-sulphur.png', import.meta.url).href,
  packsize: new URL('../assets/icons/icon-packsize.png', import.meta.url).href,
  quantity: new URL('../assets/icons/icon-quantity.png', import.meta.url).href,
  preserve: new URL('../assets/icons/icon-preserve.png', import.meta.url).href,
}

/** Mini connector-shape glyph, like the line marks on in-game chart items. */
export function EdgeGlyph({
  edges,
  size = 18,
}: {
  edges: [boolean, boolean, boolean, boolean]
  size?: number
}) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className="edge-glyph" aria-hidden>
      <circle cx="8" cy="8" r="2.1" fill="currentColor" />
      {edges[0] && <rect x="7" y="0.5" width="2" height="6.5" rx="1" fill="currentColor" />}
      {edges[1] && <rect x="9" y="7" width="6.5" height="2" rx="1" fill="currentColor" />}
      {edges[2] && <rect x="7" y="9" width="2" height="6.5" rx="1" fill="currentColor" />}
      {edges[3] && <rect x="0.5" y="7" width="6.5" height="2" rx="1" fill="currentColor" />}
    </svg>
  )
}

export function StatIcon({ stat, size = 13 }: { stat: Stat; size?: number }) {
  const img = IMAGE_ICONS[stat]
  if (img) {
    return <img className="stat-icon-img" src={img} width={size} height={size} alt="" aria-hidden />
  }
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {PATHS[stat]}
    </svg>
  )
}
