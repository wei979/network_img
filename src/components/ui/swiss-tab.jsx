/**
 * SwissTab — Underline-style tab button
 * Active: primary text + 2px accent bottom border
 * Inactive: tertiary text + transparent border
 *
 * Reference: docs/wiremap-swiss-dark.jsx sidebar tab pattern
 */
import { S } from '../../lib/swiss-tokens'

export function SwissTab({ children, active = false, onClick, style, ...props }) {
  const tabStyle = {
    flex: 1,
    padding: '9px 0',
    fontSize: 11,
    fontWeight: active ? 600 : 400,
    color: active ? S.text.primary : S.text.tertiary,
    background: 'transparent',
    border: 'none',
    borderBottom: `2px solid ${active ? S.accent : 'transparent'}`,
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontFamily: S.font.sans,
    ...style,
  }

  return (
    <button onClick={onClick} style={tabStyle} {...props}>
      {children}
    </button>
  )
}
