/**
 * 导入所需的React和UI组件依赖
 */
import React from 'react'
import { Snackbar, Alert } from '@mui/material'

/**
 * 消息提示组件
 * 用于显示操作结果的提示信息
 * @param {Object} messageData - 消息数据对象
 * @param {string} messageData.type - 消息类型,如 'success'/'error' 等
 * @param {string} messageData.message - 消息内容
 * @returns {JSX.Element|null} 返回消息提示组件或null
 */
const MessageSnackbar = ({ messageData }) => {
  // 如果没有消息数据则不渲染
  if (!messageData) return null

  return (
    // Snackbar组件用于显示临时消息
    <Snackbar 
      open={true} // 控制消息显示
      autoHideDuration={3000} // 3秒后自动隐藏
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }} // 显示在顶部中间
    >
      {/* Alert组件用于显示不同类型的提示信息 */}
      <Alert severity={messageData.type} variant="filled">
        {messageData.message}
      </Alert>
    </Snackbar>
  )
}

export default MessageSnackbar