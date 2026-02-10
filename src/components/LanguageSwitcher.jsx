// app/components/LanguageSwitcher.js
'use client';

import { useLanguageStore } from "@/store/languageStore";


export default function LanguageSwitcher() {
  // 获取全局语言状态和修改方法（和 TS 版逻辑一致，仅去掉类型声明）
  const { locale, setLocale } = useLanguageStore();

  return (
    <span>
      {/* 中文切换按钮 */}
      <button
        onClick={() => setLocale('zh')}
        style={{
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          color: locale === 'zh-CN' ? '#000' : '#999',
          fontWeight: locale === 'zh-CN' ? 'bold' : 'normal',
          marginRight: '8px',
        }}
      >
        中文
      </button>
      {/* 英文切换按钮 */}
      <button
        onClick={() => setLocale('en')}
        style={{
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          color: locale === 'en' ? '#000' : '#999',
          fontWeight: locale === 'en' ? 'bold' : 'normal',
        }}
      >
        English
      </button>
    </span>
  );
}