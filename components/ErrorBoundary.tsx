'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack?: string }) {
    console.error('🚨 ErrorBoundary 捕獲錯誤:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });

    this.setState({
      errorInfo: errorInfo.componentStack || '無可用的堆疊追蹤'
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-2xl w-full bg-white shadow-lg rounded-lg p-6">
            <div className="flex items-center mb-4">
              <svg
                className="w-12 h-12 text-red-600 mr-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">頁面發生錯誤</h2>
                <p className="text-sm text-gray-600">應用程式遇到了意外問題</p>
              </div>
            </div>

            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">錯誤訊息：</h3>
              <pre className="bg-red-50 border border-red-200 p-3 rounded text-sm text-red-800 overflow-auto max-h-32">
                {this.state.error?.message || '未知錯誤'}
              </pre>
            </div>

            {this.state.error?.stack && (
              <details className="mb-4">
                <summary className="text-sm font-semibold text-gray-700 cursor-pointer hover:text-gray-900">
                  詳細堆疊追蹤
                </summary>
                <pre className="mt-2 bg-gray-100 p-3 rounded text-xs text-gray-700 overflow-auto max-h-64">
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            {this.state.errorInfo && (
              <details className="mb-4">
                <summary className="text-sm font-semibold text-gray-700 cursor-pointer hover:text-gray-900">
                  組件堆疊
                </summary>
                <pre className="mt-2 bg-gray-100 p-3 rounded text-xs text-gray-700 overflow-auto max-h-64">
                  {this.state.errorInfo}
                </pre>
              </details>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                重新載入頁面
              </button>
              <button
                onClick={() => window.history.back()}
                className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                返回上一頁
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                如果問題持續發生，請聯繫技術支援並提供上述錯誤訊息
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
