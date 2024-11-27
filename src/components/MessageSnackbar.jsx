/**
 * 导入所需的React和UI组件依赖
 */
import React, { useState, useEffect } from 'react'
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
  // 控制消息显示状态
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState(null)

  // 监听消息数据变化
  useEffect(() => {
    if (messageData) {
      setMessage(messageData)
      setOpen(true)
    }
  }, [messageData])

  // 处理消息关闭
  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return
    }
    setOpen(false)
  }

  // 如果没有消息数据则不渲染
  if (!message) return null

  return (
    <Snackbar 
      open={open}
      autoHideDuration={3000} // 3秒后自动隐藏
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert 
        onClose={handleClose}
        severity={message.type} 
        variant="filled"
      >
        {message.message}
      </Alert>
    </Snackbar>
  )
}

export default MessageSnackbar