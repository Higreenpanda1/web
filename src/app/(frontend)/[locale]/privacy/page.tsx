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
    path: '/privacy',
    title: t('legal.privacyTitle'),
    description: t('legal.privacyTitle'),
  })
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const [t, settings] = await Promise.all([getTranslations({ locale }), getSiteSettings(locale)])
  const isArabic = locale === 'ar'

  return (
    <LegalPage
      locale={locale}
      slug="privacy"
      title={t('legal.privacyTitle')}
      fallback={
        isArabic ? (
          <>
            <h2>ما الذي نجمعه</h2>
            <p>
              عندما ترسل نموذج الطلب نحتفظ بالاسم والدولة ورقم واتساب والبريد الإلكتروني إن أدخلته
              ونص رسالتك، إضافة إلى الصفحة التي أرسلت منها ووقت الإرسال. نحفظ كذلك <em>جزءًا</em> من
              عنوان الإنترنت الخاص بك — الشبكة فقط لا الجهاز — لرصد الإرسال الآلي. لا نحفظ عنوانك
              الكامل.
            </p>
            <h2>لماذا نجمعه</h2>
            <p>
              للردّ على طلبك فقط. لا نبيع بياناتك ولا نشاركها مع معلنين، ولا نستخدمها لإرسال رسائل
              تسويقية لم تطلبها.
            </p>
            <h2>ملفات تعريف الارتباط</h2>
            <p>
              لا يستخدم هذا الموقع ملفات تعريف ارتباط للتتبع ولا إعلانات. إحصاءات الزيارة — إن كانت
              مفعّلة — تعمل بلا ملفات تعريف ارتباط وبلا تعريف للأفراد، ولهذا لا ترى نافذة موافقة.
            </p>
            <h2>أين تُحفظ بياناتك</h2>
            <p>
              في قاعدة بيانات على خادم نملكه نحن، مع نسخ احتياطية مشفّرة يومية. الوصول محصور بفريقنا
              ومحمي بالتحقق بخطوتين.
            </p>
            <h2>كم نحتفظ بها</h2>
            <p>
              نحتفظ بالطلبات ثلاث سنوات ثم نحذفها. يمكنك أن تطلب حذف بياناتك في أي وقت عبر مراسلتنا
              على <span className="ltr-nums">{settings.email}</span>.
            </p>
            <h2>حقوقك</h2>
            <p>
              لك أن تطلب نسخة من بياناتك أو تصحيحها أو حذفها. راسلنا وسنستجيب خلال ثلاثين يومًا.
            </p>
          </>
        ) : (
          <>
            <h2>What we collect</h2>
            <p>
              When you send the enquiry form we keep your name, country, WhatsApp number, email if
              you gave one, and the text of your message, along with the page you sent it from and
              the time. We also keep <em>part</em> of your internet address — the network, not the
              device — to spot automated submissions. We do not store your full address.
            </p>
            <h2>Why we collect it</h2>
            <p>
              To answer your enquiry. We do not sell your data, we do not share it with advertisers,
              and we do not use it to send you marketing you did not ask for.
            </p>
            <h2>Cookies</h2>
            <p>
              This site sets no tracking cookies and carries no advertising. Visitor statistics, if
              enabled, run without cookies and without identifying individuals — which is why you
              see no consent banner.
            </p>
            <h2>Where your data lives</h2>
            <p>
              In a database on a server we own, with encrypted daily backups. Access is limited to
              our team and protected by two-factor authentication.
            </p>
            <h2>How long we keep it</h2>
            <p>
              We keep enquiries for three years and then delete them. You can ask us to delete your
              data at any time by writing to{' '}
              <span className="ltr-nums">{settings.email}</span>.
            </p>
            <h2>Your rights</h2>
            <p>
              You may ask for a copy of your data, ask us to correct it, or ask us to delete it.
              Write to us and we will respond within thirty days.
            </p>
          </>
        )
      }
    />
  )
}
