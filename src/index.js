import React from 'react'
import { createRoot } from 'react-dom/client'
import JsonEditor from './components/JsonEditor'
import ErrorBoundary from './components/ErrorBoundary'

// 获取根元素
const container = document.getElementById('root')
const root = createRoot(container)

// 渲染应用
root.render(
  <ErrorBoundary>
    <JsonEditor />
  </ErrorBoundary>
) 