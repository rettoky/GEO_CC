'use client'

import { Component, ReactNode, ErrorInfo } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * React Error Boundary Component
 *
 * 자식 컴포넌트에서 발생하는 에러를 포착하고 처리합니다.
 * Class 컴포넌트로 구현 (React Error Boundary API 요구사항)
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
    }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // 에러가 발생하면 상태를 업데이트하여 fallback UI를 렌더링합니다
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 에러 로깅을 위한 콜백 호출
    this.props.onError?.(error, errorInfo)

    // 개발 환경에서 콘솔에 에러 로깅
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by ErrorBoundary:', error, errorInfo)
    }
  }

  reset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    })
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // fallback이 제공되면 사용, 아니면 기본 에러 UI 렌더링
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset)
      }

      return (
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <div className="text-destructive text-sm font-medium mb-2">
            오류가 발생했습니다
          </div>
          <div className="text-muted-foreground text-xs mb-4">
            {this.state.error.message}
          </div>
          <button
            onClick={this.reset}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 transition-colors"
          >
            다시 시도
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
