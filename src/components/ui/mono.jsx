/**
 * Mono — IBM Plex Mono wrapper for technical data
 * Use for: IP addresses, port numbers, hex values, timestamps, metrics
 */
import { cn } from '../../lib/utils'

export function Mono({ children, className, ...props }) {
  return (
    <span className={cn('font-mono', className)} {...props}>
      {children}
    </span>
  )
}
