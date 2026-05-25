/**
 * Page-level loading UI shown by Next.js while a route segment loads.
 * Renders a minimal animated indicator that matches our brand.
 */
export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="加载中"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-dark-900"
    >
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-4 border-white/5" aria-hidden />
        <div
          className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-primary animate-spin"
          aria-hidden
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" aria-hidden />
        </div>
      </div>
      <span className="sr-only">加载中</span>
    </div>
  )
}
