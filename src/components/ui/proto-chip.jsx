/**
 * ProtoChip — Protocol filter toggle button
 * Shows a colored square dot + protocol name
 *
 * Reference: docs/wiremap-swiss-dark.jsx lines 58-78
 */
import { S, getProtocolColor } from '../../lib/swiss-tokens'

export function ProtoChip({ protocol, active = true, onClick, style, ...props }) {
  const c = getProtocolColor(protocol)

  const chipStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '5px 10px',
    borderRadius: S.radius.sm,
    border: `1.5px solid ${active ? c + '55' : S.border}`,
    background: active ? c + '10' : 'transparent',
    color: active ? c : S.text.faint,
    fontSize: 11.5,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: S.font.mono,
    transition: 'all 0.15s',
    ...style,
  }

  const dotStyle = {
    width: 7,
    height: 7,
    borderRadius: 1.5,
    background: active ? c : S.text.faint,
  }

  return (
    <button onClick={onClick} style={chipStyle} {...props}>
      <span style={dotStyle} />
      {protocol}
    </button>
  )
}
