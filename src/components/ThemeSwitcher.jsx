'use client'

import { useState, useEffect } from 'react'
import { useThemeStore } from '@/store/themeStore'

export default function ThemeSwitcher() {
  const theme = useThemeStore((state) => state.theme)
  const toggleTheme = useThemeStore((state) => state.toggleTheme)

  // wait for client mount to avoid SSR mismatch
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <button className="p-2 rounded-md invisible" aria-hidden />
  }

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-md transition-colors duration-200
        bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? '🌙' : '☀️'}
    </button>
  )
}