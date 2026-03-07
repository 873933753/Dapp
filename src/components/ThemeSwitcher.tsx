'use client'

import { useState, useEffect } from 'react'
import { useThemeStore } from '@/store/themeStore'
import { Sun, Moon } from 'lucide-react'

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
      className="p-2 rounded-md transition-colors duration-200 bg-secondary text-foreground"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
    </button>
  )
}