import { createTheme } from '@material-ui/core/styles'

export const darkTheme = createTheme({
  palette: {
    type: 'dark',
    primary: {
      main: '#90caf9'
    }
  }
})

export const lightTheme = createTheme({
  palette: {
    type: 'light',
    primary: {
      main: '#1976d2'
    }
  }
}) 