import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const baseInputClass = cn(
  'w-full px-3 py-2.5 rounded-lg bg-dark-800/50 border border-white/10',
  'text-sm text-white placeholder:text-gray-600',
  'focus:outline-none focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary',
  'transition-colors disabled:opacity-50',
)

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(baseInputClass, className)} {...props} />
  },
)

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(baseInputClass, 'resize-none', className)} {...props} />
})
