/**
 * Swiss Editorial Dark — Design Tokens
 *
 * Single source of truth for all color/typography values.
 * Used by SVG inline styles and JS logic that cannot reference CSS variables.
 *
 * Reference: docs/wiremap-swiss-dark.jsx lines 9-36
 */

export const S = {
  // ── Background layers (warm parchment-black) ──
  bg:           '#141311',
  bgRaised:     '#1b1a17',
  surface:      '#222120',
  surfaceHover: '#2a2926',

  // ── Borders ──
  border:       '#2e2d2a',
  borderStrong: '#3d3c38',

  // ── Text hierarchy ──
  text: {
    primary:   '#e8e5df',
    secondary: '#a09b91',
    tertiary:  '#706b61',
    faint:     '#3d3a34',
  },

  // ── Accent (Swiss red-orange "signal red") ──
  accent:    '#e05a33',
  accentDim: '#b8452a',

  // ── Protocol color coding ──
  protocol: {
    TCP:   '#e05a33',
    UDP:   '#3b82f6',
    HTTP:  '#10b981',
    HTTPS: '#10b981',
    DNS:   '#8b5cf6',
    ICMP:  '#ef4444',
  },

  // ── Font stacks ──
  font: {
    serif: "'Instrument Serif', serif",
    sans:  "'DM Sans', 'Noto Sans TC', sans-serif",
    mono:  "'IBM Plex Mono', monospace",
  },

  // ── Border radius ──
  radius: {
    sm: 3,
    md: 4,
    lg: 6,
  },
}

/**
 * Lookup protocol color by key (case-insensitive).
 * Falls back to text.tertiary for unknown protocols.
 */
export function getProtocolColor(protocol) {
  if (!protocol) return S.text.tertiary
  const key = protocol.toUpperCase()
  return S.protocol[key] || S.text.tertiary
}
