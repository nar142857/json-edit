import React from 'react'

/**
 * 错误边界组件
 * 用于捕获子组件中的渲染错误
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('错误详情:', error)
    console.error('错误堆栈:', errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          color: '#666'
        }}>
          <h3>出错了</h3>
          <p>请刷新页面重试</p>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary 