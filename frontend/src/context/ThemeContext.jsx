import { createContext, useContext, useState, useEffect } from 'react'

const darkColors = {
  mode: 'dark',
  bg: '#0a0a0f',
  surface: '#15151f',
  sidebarBg: '#111118',
  border: '#26263a',
  text: '#f2f1ec',
  textMuted: '#9c9bb0',
  accentPurple: '#8b5cf6',
  accentBlue: '#38bdf8',
  income: '#4ade80',
  expense: '#c084fc',
  danger: '#f2708a',
}

const lightColors = {
  mode: 'light',
  bg: '#f7f7fb',
  surface: '#ffffff',
  sidebarBg: '#ffffff',
  border: '#e2e2ea',
  text: '#15151f',
  textMuted: '#6b6b7d',
  accentPurple: '#7c3aed',
  accentBlue: '#0284c7',
  income: '#16a34a',
  expense: '#9333ea',
  danger: '#e11d48',
}

const ThemeContext = createContext({
  colors: darkColors,
  toggleTheme: () => {},
})

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    return localStorage.getItem('theme') || 'dark'
  })

  useEffect(() => {
    localStorage.setItem('theme', mode)
  }, [mode])

  function toggleTheme() {
    setMode((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  const colors = mode === 'dark' ? darkColors : lightColors

  return (
    <ThemeContext.Provider value={{ colors, mode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}