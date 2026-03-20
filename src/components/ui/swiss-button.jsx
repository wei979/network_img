/**
 * SwissButton — Minimal button variants
 *
 * Variants:
 * - primary: solid accent background, white text
 * - ghost: transparent with border
 * - speed: compact for playback speed buttons
 *
 * Reference: docs/wiremap-swiss-dark.jsx button patterns
 */
import { S } from '../../lib/swiss-tokens'

const variants = {
  primary: {
    background: S.accent,
    color: '#fff',
    border: 'none',
    padding: '6px 16px',
    fontWeight: 600,
  },
  ghost: {
    background: 'transparent',
    color: S.text.secondary,
    border: `1px solid ${S.border}`,
    padding: '5px 12px',
    fontWeight: 500,
  },
  speed: {
    background: 'transparent',
    color: S.text.tertiary,
    border: `1px solid ${S.border}`,
    padding: '4px 8px',
    fontWeight: 600,
    fontSize: 10,
    fontFamily: S.font.mono,
  },
}

export function SwissButton({
  children,
  variant = 'ghost',
  active = false,
  onClick,
  disabled = false,
  style,
  ...props
}) {
  const v = variants[variant] || variants.ghost

  const buttonStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    borderRadius: S.radius.sm,
    fontSize: 12,
    fontFamily: S.font.sans,
    cursor: disabled ? 'default' : 'pointer',
    transition: 'all 0.15s',
    opacity: disabled ? 0.4 : 1,
    ...v,
    // Active state overrides for speed variant
    ...(variant === 'speed' && active ? {
      background: S.accent + '18',
      color: S.accent,
      borderColor: S.accent + '55',
    } : {}),
    ...style,
  }

  return (
    <button onClick={onClick} disabled={disabled} style={buttonStyle} {...props}>
      {children}
    </button>
  )
}
