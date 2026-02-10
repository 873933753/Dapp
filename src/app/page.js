'use client'
import { useTranslations } from "next-intl";

// import { useLanguageStore } from "@/store/languageStore";

export default function Home() {
  // const { locale, setLocale } = useLanguageStore();
  const t = useTranslations('Basic')
  return (
    <div>
      <main>
        {/* {locale} */}
        {t('name')}
      </main>
    </div>
  );
}
