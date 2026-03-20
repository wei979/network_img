/**
 * Tag — Swiss-style label/badge
 * Variants: solid (filled background) | outlined (transparent with border)
 *
 * Reference: docs/wiremap-swiss-dark.jsx lines 44-56
 */
import { S } from '../../lib/swiss-tokens'

export function Tag({ children, color = S.accent, solid = false, style, ...props }) {
  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: solid ? '2px 8px' : '2px 7px',
    borderRadius: S.radius.sm,
    background: solid ? color : color + '14',
    border: solid ? 'none' : `1.5px solid ${color}33`,
    color: solid ? '#fff' : color,
    fontSize: 10,
    fontWeight: 600,
    fontFamily: S.font.mono,
    letterSpacing: '0.02em',
    lineHeight: 1.4,
    ...style,
  }

  return <span style={baseStyle} {...props}>{children}</span>
}
