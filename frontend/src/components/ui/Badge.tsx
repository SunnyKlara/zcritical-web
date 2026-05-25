import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Tone = 'primary' | 'accent' | 'success' | 'warning' | 'neutral'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone
}

const TONE_STYLES: Record<Tone, string> = {
  primary: 'bg-primary/10 text-primary border-primary/30',
  accent: 'bg-accent/10 text-accent border-accent/30',
  success: 'bg-green-500/10 text-green-400 border-green-500/30',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  neutral: 'bg-white/5 text-gray-400 border-white/10',
}

/**
 * Inline status / category label.
 */
export function Badge({ tone = 'neutral', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full border font-medium',
        TONE_STYLES[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
