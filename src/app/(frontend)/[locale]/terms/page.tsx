import { getTranslations, setRequestLocale } from 'next-intl/server'

import { LegalPage } from '@/components/LegalPage'
import { getSiteSettings } from '@/lib/queries'
import { buildMetadata } from '@/lib/seo'

import type { Locale } from '@/i18n/routing'
import type { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale })
  return buildMetadata({
    locale,
    path: '/terms',
    title: t('legal.termsTitle'),
    description: t('legal.termsTitle'),
  })
}

export default async function TermsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const [t, settings] = await Promise.all([getTranslations({ locale }), getSiteSettings(locale)])
  const isArabic = locale === 'ar'

  return (
    <LegalPage
      locale={locale}
      slug="terms"
      title={t('legal.termsTitle')}
      fallback={
        isArabic ? (
          <>
            <h2>من نحن</h2>
            <p>
              {settings.organisationName} شركة خدمات تجارية مقرها الصين، تقدّم خدمات التوريد والتصنيع
              والفحص والشحن وتأسيس الشركات للتجار الناطقين بالعربية.
            </p>
            <h2>ما تقدّمه هذه الصفحات</h2>
            <p>
              محتوى هذا الموقع للتعريف بخدماتنا. لا يشكّل عرض سعر ملزمًا ولا عقدًا. يبدأ الالتزام
              عندما نتفق معك كتابةً على عرض سعر محدّد يشمل المنتج والكمية والسعر ومدة التسليم.
            </p>
            <h2>الأسعار والدفع</h2>
            <p>
              نذكر التكلفة الكاملة قبل البدء، ونخبرك بما يتغيّر ولماذا قبل أن يتغيّر. لا نُحمّلك رسومًا
              لم نتفق عليها مسبقًا.
            </p>
            <h2>حدود مسؤوليتنا</h2>
            <p>
              نعمل نيابةً عنك مع مصانع وشركات شحن مستقلة. نفحص ونتابع ونوثّق، لكننا لا نضمن أداء طرف
              ثالث خارج ما ينص عليه عقدك معنا. تفاصيل كل حالة تُحدَّد في عرض السعر المتفق عليه.
            </p>
            <h2>الملكية الفكرية</h2>
            <p>
              الشعار والنصوص والصور في هذا الموقع مملوكة لنا. لا تُستخدم دون إذن كتابي.
            </p>
            <h2>الاتصال</h2>
            <p>
              لأي سؤال عن هذه الشروط راسلنا على{' '}
              <span className="ltr-nums">{settings.email}</span>.
            </p>
          </>
        ) : (
          <>
            <h2>Who we are</h2>
            <p>
              {settings.organisationName} is a China-based trade services company providing
              sourcing, manufacturing, inspection, shipping and company formation for Arabic-speaking
              traders.
            </p>
            <h2>What these pages are</h2>
            <p>
              The content of this site describes our services. It is not a binding quotation and not
              a contract. An obligation begins when we agree a specific written quotation with you
              covering product, quantity, price and lead time.
            </p>
            <h2>Prices and payment</h2>
            <p>
              We state the full cost before work begins, and we tell you what is changing and why
              before it changes. We do not add charges that were not agreed in advance.
            </p>
            <h2>Limits of our responsibility</h2>
            <p>
              We act on your behalf with independent factories and freight companies. We inspect,
              follow up and document, but we do not guarantee the performance of a third party
              beyond what your contract with us states. The specifics of each engagement are set out
              in the agreed quotation.
            </p>
            <h2>Intellectual property</h2>
            <p>
              The logo, text and images on this site belong to us. They may not be used without
              written permission.
            </p>
            <h2>Contact</h2>
            <p>
              For any question about these terms, write to{' '}
              <span className="ltr-nums">{settings.email}</span>.
            </p>
          </>
        )
      }
    />
  )
}
