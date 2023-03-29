import { ThemeProvider } from 'styled-components'
import { useChangeTheme } from './hooks/useChangeTheme'
import { useFetchServerData } from './hooks/useFetchServerData'
import { GlobalStyles } from './assets/styles/globalStyle'
import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import AuthPage from './pages/AuthPage'
// import NotFoundPage from './pages/NotFoundPage'


function App() {
  useFetchServerData()
  const { theme, themeToggler } = useChangeTheme()

  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <GlobalStyles />
        <button onClick={themeToggler}>Toggle Theme</button>
        {/*<Router/>*/}
        <AuthPage />
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
