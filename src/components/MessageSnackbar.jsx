import React from 'react'
import { Snackbar } from '@material-ui/core'
import { Alert } from '@material-ui/lab'

const MessageSnackbar = ({ messageData }) => {
  if (!messageData) return null

  return (
    <Snackbar 
      open={true}
      autoHideDuration={3000}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert severity={messageData.type}>
        {messageData.message}
      </Alert>
    </Snackbar>
  )
}

export default MessageSnackbar 