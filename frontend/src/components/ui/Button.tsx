import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'ghost' | 'outline' | 'subtle' | 'danger'
type Size = 'sm' | 'md' | 'lg' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  isLoading?: boolean
}

const VARIANT_STYLES: Record<Variant, string> = {
  primary:
    'bg-primary text-dark-900 font-semibold hover:bg-primary-light shadow-[0_0_20px_rgba(0,212,255,0.3)] hover:shadow-[0_0_30px_rgba(0,212,255,0.5)]',
  ghost:
    'bg-transparent border border-white/20 text-white hover:border-primary/50 hover:text-primary hover:bg-primary/[0.05]',
  outline: 'bg-transparent border border-primary/50 text-primary hover:bg-primary/10',
  subtle: 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-transparent',
  danger: 'bg-accent text-white hover:bg-accent-dark shadow-[0_0_20px_rgba(255,59,48,0.3)]',
}

const SIZE_STYLES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-5 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
  icon: 'w-10 h-10 p-0',
}

/**
 * Standardized button primitive.
 *
 * Use this instead of arbitrary `className` strings to keep button
 * appearance consistent across the app. Supports loading state and
 * proper disabled handling.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', className, isLoading, disabled, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={cn(
        'inline-flex items-center justify-center rounded-button transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-dark-900',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        className,
      )}
      {...props}
    >
      {isLoading && (
        <span
          className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
          aria-hidden
        />
      )}
      {children}
    </button>
  )
})
