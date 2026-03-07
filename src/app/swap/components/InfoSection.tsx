import { useTranslations } from 'next-intl'

export default function InfoSection(){
  const t = useTranslations('Swap')
  return(
    <div className="mt-6 p-4 bg-card rounded-lg border border-border">
      <h3 className="font-semibold mb-2">{t('info.title')}</h3>
      <ul className="text-sm text-muted-foreground space-y-1">
        <li>• {t('info.first')}</li>
        <li>• {t('info.second')}</li>
        <li>• {t('info.third')}</li>
        <li>• {t('info.last')}</li>
      </ul>
    </div>
  )
}