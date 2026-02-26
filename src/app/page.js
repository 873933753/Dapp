'use client'
import { useTranslations } from "next-intl";
import { featureList } from "@/config/list";

// import { useLanguageStore } from "@/store/languageStore";

export default function Home() {
  // const { locale, setLocale } = useLanguageStore();
  const t = useTranslations('Home')
  return (
    <div className="container m-auto">
      <h1 className="font-bold text-2xl py-4 text-center md:text-4xl md:py-10">{t('title')}</h1>
      <div className="p-4 grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-4xl m-auto">
        {
          featureList.map(item => {
            return(
              <FeatureItem
                key={item.name}
                icon = {item.icon}
                name = { item.name }
                desc = {t(item.name)}
                href={ item.href }
              />
            )
          })
        }
      </div>
    </div>
  );
}

function FeatureItem({icon,name,desc,href}){
  return(
    /* 父元素加group，子元素用group-hover监听状态 */
    <a 
      href={href}
      className="group cursor-pointer p-6 border rounded-lg hover:shadow-lg hover:border-primary">
      <div className="group-hover:text-sky-500 flex flex-col gap-2">
        <div className="text-4xl mb-2">{icon}</div>
        <h3 className="font-bold text-xl">{name}</h3>
        <p className="text-gray-400">{desc}</p>
      </div>
    </a>
  )
}
