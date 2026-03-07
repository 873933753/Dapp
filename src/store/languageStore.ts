// app/store/languageStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 去掉 TS 类型声明，保留核心逻辑
export const useLanguageStore = create(
  persist(
    (set) => ({
      // 默认语言：优先取浏览器语言，否则英文
      // locale: navigator.language === 'zh-CN' ? 'zh-CN' : 'en',
      locale:'en',
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: 'language-storage', // localStorage 键名
    }
  )
);