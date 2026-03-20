/**
 * BigNumber — Instrument Serif large metric display
 * The Swiss typographic anchor: oversized serif numbers
 * create visual hierarchy without color or decoration.
 *
 * Reference: docs/wiremap-swiss-dark.jsx sidebar header pattern
 */
import { S } from '../../lib/swiss-tokens'

export function BigNumber({ value, unit, description, style, ...props }) {
  return (
    <div style={{ padding: '20px 20px 16px', ...style }} {...props}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{
          fontSize: 48,
          fontFamily: S.font.serif,
          fontWeight: 700,
          color: S.text.primary,
          lineHeight: 1,
        }}>
          {value}
        </span>
        {unit && (
          <span style={{
            fontSize: 14,
            color: S.text.tertiary,
            fontFamily: S.font.sans,
          }}>
            {unit}
          </span>
        )}
      </div>
      {description && (
        <div style={{
          fontSize: 12,
          color: S.text.tertiary,
          marginTop: 4,
          fontFamily: S.font.sans,
        }}>
          {description}
        </div>
      )}
    </div>
  )
}
