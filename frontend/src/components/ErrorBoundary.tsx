'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { captureException } from '@/lib/sentry'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Catches errors thrown by descendant components.
 *
 * Use cases:
 * - Wrap admin routes to keep one panel error from killing the whole page
 * - Wrap third-party widgets (chat, analytics) to isolate their failures
 *
 * Errors bubble to Sentry automatically.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    void captureException(error)
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught:', error, info)
  }

  reset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div role="alert" className="min-h-[400px] flex items-center justify-center p-8">
          <div className="text-center max-w-sm">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-accent" />
            </div>
            <h2 className="text-lg font-bold mb-2">这里出了点问题</h2>
            <p className="text-sm text-gray-400 mb-6">组件渲染失败。错误已上报。</p>
            <button
              onClick={this.reset}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-button border border-white/20 text-sm text-white hover:border-primary/50 hover:text-primary transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              重试
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
