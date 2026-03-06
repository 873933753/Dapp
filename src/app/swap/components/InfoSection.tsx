import { useTranslations } from 'next-intl'

export default function InfoSection(){
  const t = useTranslations('Swap')
  return(
    <div className="mt-6 p-4 bg-card dark:bg-gray-800 rounded-lg dark:border dark:border-gray-700">
      <h3 className="font-semibold mb-2 text-gray-800 dark:text-gray-100">{t('info.title')}</h3>
      <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
        <li>• {t('info.first')}</li>
        <li>• {t('info.second')}</li>
        <li>• {t('info.third')}</li>
        <li>• {t('info.last')}</li>
      </ul>
    </div>
  )
}