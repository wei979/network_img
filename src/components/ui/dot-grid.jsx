/**
 * DotGrid — Swiss grid system background
 * 28px spacing dot pattern that implies coordinate structure
 *
 * Reference: docs/wiremap-swiss-dark.jsx lines 284-288
 */
import { cn } from '../../lib/utils'

export function DotGrid({ compact = false, className, children, style, ...props }) {
  return (
    <div
      className={cn(compact ? 'dot-grid-compact' : 'dot-grid', className)}
      style={{ width: '100%', height: '100%', ...style }}
      {...props}
    >
      {children}
    </div>
  )
}
