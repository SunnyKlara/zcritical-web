import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'glass' | 'solid' | 'outline'
  hoverable?: boolean
}

const VARIANT_STYLES = {
  glass: 'bg-white/[0.05] backdrop-blur-md border border-white/10',
  solid: 'bg-dark-800 border border-white/5',
  outline: 'bg-transparent border border-white/10',
}

/**
 * Surface primitive — wraps content in a brand-consistent container.
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { variant = 'glass', hoverable = false, className, children, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-card-lg',
        VARIANT_STYLES[variant],
        hoverable &&
          'transition-all duration-300 hover:scale-[1.02] hover:border-white/15 hover:shadow-[0_8px_40px_rgba(0,0,0,0.3),0_0_20px_rgba(0,212,255,0.05)]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
})

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CardHeader({ className, children, ...props }, ref) {
    return (
      <div ref={ref} className={cn('p-6 pb-3', className)} {...props}>
        {children}
      </div>
    )
  },
)

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CardContent({ className, children, ...props }, ref) {
    return (
      <div ref={ref} className={cn('p-6 pt-0', className)} {...props}>
        {children}
      </div>
    )
  },
)

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CardFooter({ className, children, ...props }, ref) {
    return (
      <div ref={ref} className={cn('p-6 pt-3 border-t border-white/5', className)} {...props}>
        {children}
      </div>
    )
  },
)
