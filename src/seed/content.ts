/**
 * Seed content — the nine original services and the homepage copy. The
 * eleven services recovered from the old site are in ./catalogue.ts.
 *
 * Eight come from brief section 4. The ninth, trade-fair and exhibition
 * accompaniment, is the one section 4 proposes and marks [confirm]: the
 * founder's 100+ fairs make it credible, and Arabic-speaking buyers search for
 * it, but it was never a listed service before. Confirmed by the client on
 * 20 September 2026 — they do offer it — so it is published.
 *
 * Arabic is written first and English second throughout, because the brief is
 * explicit that translated-feeling Arabic is the fastest way to lose this
 * audience (section 10). Where the old site's own words survive in search
 * records, they are used verbatim rather than rewritten.
 */

import { CATALOGUE_SERVICES, type SeedService } from './catalogue'

export type { SeedService }

const CORE_SERVICES: SeedService[] = [
  {
    slug: 'full-import-management',
    order: 10,
    featured: true,
    icon: 'route',
    category: 'import',
    ar: {
      title: 'إدارة عملية الاستيراد كاملة',
      summary:
        'إشراف كامل على استيراد منتجاتك من الصين، من البداية — البحث عن المنتج وفحصه — حتى النهاية: استلام بضاعتك في بلدك.',
      body: 'هذه خدمتنا الأساسية، ومعظم عملائنا يبدأون بها. تسلّمنا المهمة كاملة فنتولّى كل مرحلة: البحث عن المصنع المناسب، التفاوض على السعر، فحص العينة، متابعة الإنتاج، فحص البضاعة قبل الشحن، ترتيب الشحن والتخليص الجمركي، ومتابعة الشحنة حتى تصل إلى مستودعك.\n\nتحصل على شريك واحد مسؤول بدل خمسة أطراف متفرقة، وتقرير مكتوب بالصور في كل مرحلة، وتكلفة كاملة معروفة قبل أن تدفع أي مبلغ.',
      highlights: [
        'شريك واحد مسؤول من الفكرة حتى التسليم',
        'تقرير مصوّر في كل مرحلة',
        'التكلفة الكاملة معروفة قبل الدفع',
        'فحص المصنع والبضاعة قبل الشحن',
        'ترتيب الشحن والتخليص الجمركي',
        'متابعة حتى الاستلام في مستودعك',
      ],
    },
    en: {
      title: 'Full import process management',
      summary:
        'Complete oversight of importing your products from China, from the beginning — product research and inspection — to the end: receiving your goods in your country.',
      body: 'This is our core service, and where most clients start. You hand us the whole job and we take every stage: finding the right factory, negotiating the price, inspecting the sample, following production, inspecting the goods before shipping, arranging freight and customs clearance, and tracking the shipment until it reaches your warehouse.\n\nYou get one accountable partner instead of five separate parties, a written report with photographs at every stage, and the full landed cost known before you pay anything.',
      highlights: [
        'One accountable partner from idea to delivery',
        'A photographed report at every stage',
        'Full landed cost known before you pay',
        'Factory and goods inspected before shipping',
        'Freight and customs clearance arranged',
        'Followed through to your warehouse',
      ],
    },
  },
  {
    slug: 'product-sourcing',
    order: 20,
    featured: false,
    icon: 'search',
    category: 'import',
    applicationType: 'product-search',
    ar: {
      title: 'توريد المنتجات',
      summary: 'نبحث لك عن منتجك التالي في الصين ونجد المصنع المناسب بالسعر المناسب.',
      body: 'أخبرنا بالمنتج والكمية والميزانية وبلد الوصول، ونبدأ البحث. نقارن بين المصانع على الأرض لا عبر المنصات فقط، ونتفاوض بالصينية على السعر وشروط الدفع ومدة التسليم.\n\nنرسل لك قائمة قصيرة بالخيارات مع السعر الحقيقي لكل واحد، وصور المصنع، وعينة إن أردت — قبل أن تلتزم بأي شيء.',
      highlights: [
        'مقارنة ميدانية بين المصانع لا عبر المنصات فقط',
        'تفاوض بالصينية على السعر وشروط الدفع',
        'قائمة قصيرة بالخيارات والأسعار الحقيقية',
        'طلب عينة قبل أي التزام',
      ],
    },
    en: {
      title: 'Product sourcing',
      summary:
        'We find your next product in China and the right factory to make it, at the right price.',
      body: 'Tell us the product, the quantity, the budget and the destination country, and we start looking. We compare factories on the ground rather than only through platforms, and negotiate price, payment terms and lead time in Chinese.\n\nYou get a shortlist with the real cost of each option, photographs of the factory, and a sample if you want one — before you commit to anything.',
      highlights: [
        'Factories compared on the ground, not only on platforms',
        'Price and payment terms negotiated in Chinese',
        'A shortlist with real, comparable costs',
        'A sample before you commit',
      ],
    },
  },
  {
    slug: 'manufacturing',
    order: 30,
    featured: false,
    icon: 'factory',
    category: 'import',
    ar: {
      title: 'التصنيع',
      summary: 'تصنيع منتجك في الصين بمواصفاتك وعلامتك التجارية، ومتابعة الإنتاج حتى النهاية.',
      body: 'إن كان لديك منتج خاص بك — تصميم أو تعديل على منتج قائم أو علامة تجارية تريد إطلاقها — نجد المصنع القادر على تنفيذه، ونترجم مواصفاتك إلى لغة يفهمها المصنع.\n\nنتابع الإنتاج على مراحل: العينة الأولى، عينة الإنتاج، ثم الدفعة الكاملة، مع صور وتقارير في كل مرحلة حتى لا تُفاجأ عند الاستلام.',
      highlights: [
        'ترجمة مواصفاتك إلى لغة المصنع',
        'عينة أولى ثم عينة إنتاج قبل الدفعة الكاملة',
        'تغليف وعلامة تجارية خاصة بك',
        'متابعة مصوّرة لمراحل الإنتاج',
      ],
    },
    en: {
      title: 'Manufacturing',
      summary:
        'Your product made in China to your specification and under your brand, with production followed through.',
      body: 'If you have a product of your own — a design, a modification of something existing, or a brand you want to launch — we find the factory that can build it and translate your specification into language the factory understands.\n\nWe follow production in stages: first sample, production sample, then the full run, with photographs and reports at each point so nothing surprises you on arrival.',
      highlights: [
        'Your specification translated into the factory’s language',
        'First sample and production sample before the full run',
        'Your own packaging and branding',
        'Photographed progress at each production stage',
      ],
    },
  },
  {
    slug: 'quality-inspection',
    order: 40,
    featured: false,
    icon: 'clipboard-check',
    category: 'import',
    ar: {
      title: 'فحص الجودة',
      summary: 'فحص المصنع والبضاعة على الأرض قبل أن تدفع أو تشحن، مع تقرير مصوّر.',
      body: 'الفحص هو الفرق بين صفقة ناجحة وحاوية لا يمكن بيعها. نزور المصنع بأنفسنا، ونتحقق من أنه مصنع حقيقي لا وسيط، ونفحص البضاعة قبل الشحن: المقاسات، الكمية، التغليف، والعيوب.\n\nيصلك تقرير مصوّر قبل أن تفرج عن الدفعة الأخيرة، فتقرّر أنت لا المصنع.',
      highlights: [
        'زيارة ميدانية للتحقق من أن المصنع حقيقي',
        'فحص المقاسات والكمية والتغليف والعيوب',
        'تقرير مصوّر قبل الإفراج عن الدفعة الأخيرة',
        'القرار بيدك لا بيد المصنع',
      ],
    },
    en: {
      title: 'Quality inspection',
      summary:
        'The factory and the goods inspected on the ground before you pay or ship, with a photographed report.',
      body: 'Inspection is the difference between a good deal and a container you cannot sell. We visit the factory ourselves, verify that it is a real factory and not a middleman, and check the goods before shipping: dimensions, quantity, packaging and defects.\n\nYou get a photographed report before you release the final payment, so the decision is yours and not the factory’s.',
      highlights: [
        'A site visit to verify the factory is real',
        'Dimensions, quantity, packaging and defects checked',
        'A photographed report before the final payment',
        'The decision stays with you',
      ],
    },
  },
  {
    slug: 'shipping-and-freight',
    order: 50,
    featured: false,
    icon: 'ship',
    category: 'import',
    applicationType: 'shipping-quote',
    ar: {
      title: 'الشحن والنقل',
      summary: 'شحن بضاعتك من الصين إلى بلدك، بحرًا أو جوًا، مع التخليص الجمركي والتسليم.',
      body: 'نرتّب الشحن المناسب لحجم بضاعتك وميزانيتك: حاوية كاملة، شحن جزئي، أو شحن جوي إن كان الوقت أهم من التكلفة.\n\nنجهّز المستندات، ونتابع التخليص الجمركي في بلدك، ونبقى معك حتى تستلم البضاعة — لا حتى تغادر الميناء.',
      highlights: [
        'حاوية كاملة أو شحن جزئي أو شحن جوي',
        'تجهيز المستندات ومتابعة التخليص الجمركي',
        'تكلفة الشحن معروفة مسبقًا',
        'متابعة حتى الاستلام لا حتى مغادرة الميناء',
      ],
    },
    en: {
      title: 'Shipping and freight',
      summary:
        'Your goods shipped from China to your country, by sea or air, with customs clearance and delivery.',
      body: 'We arrange the freight that suits your volume and your budget: a full container, a part load, or air freight when time matters more than cost.\n\nWe prepare the documents, follow customs clearance in your country, and stay with the shipment until you have the goods — not until it leaves the port.',
      highlights: [
        'Full container, part load or air freight',
        'Documents prepared and customs clearance followed',
        'Freight cost known in advance',
        'Tracked to delivery, not to departure',
      ],
    },
  },
  {
    slug: 'company-formation',
    order: 60,
    featured: false,
    icon: 'building',
    category: 'company',
    // Owner's "Company Registration Quotation System" sheet, September 2026:
    // remote ¥6,000, in person ¥7,000. The 2025 price list said ¥8,200/¥7,200.
    priceFrom: 6000,
    applicationType: 'company-registration',
    ar: {
      title: 'تأسيس شركة في الصين',
      summary:
        'نساعدك على تأسيس شركتك في الصين لضمان دخول سلس وناجح إلى السوق الصيني، بخطة مصمّمة على احتياج عملك.',
      body: 'نعمل معك لفهم احتياجات عملك تحديدًا، ونضع خطة تناسب أهدافك: نوع الكيان المناسب، المدينة، رأس المال، والحساب البنكي.\n\nنتولّى الأوراق والتراخيص والتسجيل الضريبي، ونشرح لك ما يترتب على كل خيار قبل أن تختار — لا بعدها.',
      highlights: [
        'اختيار نوع الكيان والمدينة المناسبين لعملك',
        'الأوراق والتراخيص والتسجيل الضريبي',
        'فتح الحساب البنكي',
        'شرح التبعات قبل الاختيار لا بعده',
      ],
      requirements: [
        'صورة واضحة لجواز سفر الممثل القانوني وكل شريك',
        'ثلاثة أسماء مقترحة للشركة',
        'نطاق النشاط ورأس المال المقترح',
        'اختيار المدينة ونوع العنوان',
      ],
    },
    en: {
      title: 'Company formation in China',
      summary:
        'We help you set up a company in China to ensure a smooth and successful entry into the Chinese market, with an approach tailored to your goals.',
      body: 'We work with you to understand your specific business needs and develop a tailored approach that aligns with your goals: the right entity type, the city, the capital, and the bank account.\n\nWe handle the paperwork, the licences and the tax registration, and we explain what each choice commits you to before you make it — not afterwards.',
      highlights: [
        'The right entity type and city for your business',
        'Paperwork, licences and tax registration',
        'Bank account opening',
        'Consequences explained before you choose',
      ],
      requirements: [
        'A clear passport copy of the legal representative and each partner',
        'Three proposed company names',
        'The scope of business and the proposed capital',
        'Your choice of city and address type',
      ],
    },
  },
  {
    slug: 'ecommerce-launch',
    order: 70,
    featured: false,
    icon: 'shopping-cart',
    category: 'ecommerce',
    ar: {
      title: 'إطلاق متجرك الإلكتروني',
      summary:
        'إن كنت تبحث عن طريقة سهلة وفعّالة لبدء تجارتك الإلكترونية على نون أو أمازون أو شوبيفاي، نحن هنا لدعمك.',
      body: 'نوفّر لك الدعم والحلول المتكاملة لتسهيل عملية التجارة الإلكترونية: اختيار المنتج المناسب للمنصة، توريده وتجهيزه بالتغليف والباركود المطلوب، وشحنه إلى مستودعات المنصة مباشرة.\n\nنساعدك كذلك في صور المنتج وبطاقة العرض، لأن المنتج الجيد بصورة سيئة لا يُباع.',
      highlights: [
        'اختيار منتج يناسب المنصة لا أي منتج',
        'التغليف والباركود بمواصفات المنصة',
        'الشحن إلى مستودعات نون وأمازون مباشرة',
        'صور المنتج وبطاقة العرض',
      ],
    },
    en: {
      title: 'E-commerce launch support',
      summary:
        'If you are looking for an easy and effective way to start your e-commerce business on Noon, Amazon or Shopify, we are here to support you.',
      body: 'We provide support and integrated solutions to make e-commerce simpler: choosing a product that suits the platform, sourcing it, preparing it with the required packaging and barcodes, and shipping it straight into the platform’s warehouses.\n\nWe also help with product photography and the listing itself, because a good product with bad photographs does not sell.',
      highlights: [
        'A product chosen to suit the platform, not just any product',
        'Packaging and barcodes to platform specification',
        'Shipped directly into Noon and Amazon warehouses',
        'Product photography and listing copy',
      ],
    },
  },
  {
    slug: 'business-consulting',
    order: 80,
    featured: false,
    icon: 'lightbulb',
    category: 'consulting',
    applicationType: 'consultation',
    ar: {
      title: 'الاستشارات التجارية',
      summary: 'دعم واستشارات تساعدك على الاستفادة من الفرص المتاحة في الأسواق الصينية والآسيوية.',
      body: 'أحيانًا لا تحتاج إلى خدمة كاملة بل إلى رأي صادق: هل هذا المنتج يستحق؟ هل هذا السعر منطقي؟ هل هذا المصنع حقيقي؟ ما التكلفة الكاملة حتى باب مستودعك؟\n\nنجلس معك ونجيب بالأرقام، معتمدين على وجودنا الفعلي في السوق الصيني.',
      highlights: [
        'رأي صادق مبني على وجود فعلي في السوق',
        'حساب التكلفة الكاملة حتى باب مستودعك',
        'تقييم المنتج والمصنع والسعر',
        'استشارة قبل الالتزام بأي مبلغ',
      ],
    },
    en: {
      title: 'Business consulting',
      summary:
        'Support and consultation to help you take advantage of the opportunities available in Chinese and Asian markets.',
      body: 'Sometimes you do not need a full service, you need an honest opinion: is this product worth it? Is this price reasonable? Is this factory real? What is the full cost to your warehouse door?\n\nWe sit down with you and answer in numbers, drawing on actually being in the Chinese market rather than reading about it.',
      highlights: [
        'An honest opinion from people actually in the market',
        'Full landed cost worked out to your warehouse door',
        'Product, factory and price assessed',
        'Advice before you commit any money',
      ],
    },
  },
  {
    slug: 'trade-fair-support',
    order: 90,
    featured: false,
    icon: 'tent',
    category: 'import',
    ar: {
      title: 'مرافقة المعارض التجارية',
      summary:
        'مرافقتك في معرض كانتون وغيره: الترجمة، تحديد المواعيد، التفاوض، ومتابعة ما بعد المعرض.',
      body: 'حضرنا أكثر من مئة معرض تجاري في قطاعات مختلفة، ونعرف كيف يُستغل المعرض فعلًا بدل أن يُقضى في المشي.\n\nنحدّد المواعيد قبل وصولك، ونرافقك للترجمة والتفاوض، ونجمع العروض ونقارنها بعد المعرض — لأن أغلب الصفقات تُحسم بعد أن تعود إلى بلدك لا داخل القاعة.',
      highlights: [
        'مواعيد محدّدة مع موردين قبل وصولك',
        'ترجمة ومرافقة داخل المعرض',
        'جمع العروض ومقارنتها بعد المعرض',
        'متابعة الموردين بعد عودتك',
      ],
    },
    en: {
      title: 'Trade fair accompaniment',
      summary:
        'With you at the Canton Fair and others: translation, appointments, negotiation, and the follow-up afterwards.',
      body: 'We have attended more than a hundred trade fairs across many sectors, and we know how to actually use one rather than spend it walking.\n\nWe set appointments before you land, come with you to translate and negotiate, and collect and compare the quotations afterwards — because most deals are settled after you fly home, not in the hall.',
      highlights: [
        'Appointments with suppliers set before you land',
        'Translation and negotiation alongside you',
        'Quotations collected and compared afterwards',
        'Suppliers followed up once you are home',
      ],
    },
  },
]

export const FOUNDER = {
  slug: 'sami-al-hajri',
  ar: {
    name: 'سامي الحجري',
    role: 'المؤسس',
    bio: 'يمني مقيم في الصين. حاصل على البكالوريوس والماجستير في إدارة الأعمال من الصين، وفاز بجائزة جيانغسو البحثية عن عمله حول أثر مبادرة الحزام والطريق على المنطقة العربية. زار أكثر من 235 مدينة صينية وحضر أكثر من 100 معرض تجاري — وهذه ليست أرقامًا للعرض، بل هي سبب معرفته أين يُصنع كل شيء وبكم.',
    credentials: [
      'بكالوريوس وماجستير في إدارة الأعمال من الصين',
      'جائزة جيانغسو البحثية — أثر الحزام والطريق على المنطقة العربية',
      'أكثر من 235 مدينة صينية',
      'أكثر من 100 معرض تجاري',
    ],
  },
  en: {
    name: 'Sami Al-Hajri',
    role: 'Founder',
    bio: 'Yemeni, based in China. He holds a Bachelor’s and a Master’s in Business Administration earned in China, and won the Jiangsu Research Award for his work on the impact of the Belt and Road Initiative on the Arab region. He has travelled to more than 235 Chinese cities and attended more than 100 trade fairs — not as a statistic, but as the reason he knows where things are made and what they should cost.',
    credentials: [
      'Bachelor’s and Master’s in Business Administration, earned in China',
      'Jiangsu Research Award — Belt and Road impact on the Arab region',
      'More than 235 Chinese cities',
      'More than 100 trade fairs',
    ],
  },
}

/**
 * 301s for the old site's URLs. `/en/home/` in particular is called out in the
 * brief: it is the English homepage path that still ranks.
 */
// A rule whose destination equals its source is an infinite redirect, not a
// no-op. The Redirects collection refuses one and middleware ignores one, but
// the cheapest place to not have the problem is to not write it down.
export const REDIRECTS: Array<{
  from: string
  to: string | null
  type: '301' | '410'
  note: string
}> = [
  {
    from: '/en/home',
    to: '/en',
    type: '301',
    note: 'Old English homepage — the path the brief calls out by name.',
  },
  {
    from: '/en/home/',
    to: '/en',
    type: '301',
    note: 'Trailing-slash variant of the old English homepage.',
  },
  { from: '/home', to: '/', type: '301', note: 'Old Arabic homepage path.' },
  { from: '/en/about-us', to: '/en/about', type: '301', note: 'Old English about page.' },
  { from: '/about-us', to: '/about', type: '301', note: 'Old Arabic about page.' },
  { from: '/en/contact-us', to: '/en/contact', type: '301', note: 'Old English contact page.' },
  { from: '/contact-us', to: '/contact', type: '301', note: 'Old Arabic contact page.' },
  { from: '/category/blog', to: '/blog', type: '301', note: 'WordPress category archive.' },
  { from: '/feed', to: '/blog', type: '301', note: 'WordPress RSS feed.' },
  { from: '/en/feed', to: '/en/blog', type: '301', note: 'WordPress RSS feed, English.' },
  {
    from: '/sample-page',
    to: null,
    type: '410',
    note: 'WordPress default page. Never real content — tell crawlers it is gone.',
  },
  // The old WordPress pages, from the owner's backup (wp_posts, post_type page).
  { from: '/en/homepage', to: '/en', type: '301', note: 'Old English homepage.' },
  { from: '/home-ar', to: '/', type: '301', note: 'Old Arabic homepage.' },
  { from: '/blogs-ar', to: '/blog', type: '301', note: 'Old Arabic blog index.' },
  { from: '/en/blogs', to: '/en/blog', type: '301', note: 'Old English blog index.' },
  { from: '/category/uncategorized-ar', to: '/blog', type: '301', note: 'Old category archive.' },
  {
    from: '/en/category/uncategorized-en',
    to: '/en/blog',
    type: '301',
    note: 'Old category archive.',
  },
  { from: '/en/category/english', to: '/en/blog', type: '301', note: 'Old category archive.' },
  {
    from: '/consultation-and-reservations-ar',
    to: '/apply/consultation',
    type: '301',
    note: 'Old booking page.',
  },
  {
    from: '/en/book-an-appointment',
    to: '/en/apply/consultation',
    type: '301',
    note: 'Old booking page.',
  },
  {
    from: '/company-registration-ar',
    to: '/services/company-formation',
    type: '301',
    note: 'Old service page.',
  },
  {
    from: '/en/company-registration',
    to: '/en/services/company-formation',
    type: '301',
    note: 'Old service page.',
  },
  {
    from: '/company-establishment-and-management-ar',
    to: '/services/company-formation',
    type: '301',
    note: 'Old service page.',
  },
  {
    from: '/en/company-establishment-and-management',
    to: '/en/services/company-formation',
    type: '301',
    note: 'Old service page.',
  },
  {
    from: '/search-for-a-product-ar',
    to: '/services/product-sourcing',
    type: '301',
    note: 'Old service page.',
  },
  {
    from: '/en/search-for-a-product',
    to: '/en/services/product-sourcing',
    type: '301',
    note: 'Old service page.',
  },
  {
    from: '/search-and-import-ar',
    to: '/services/full-import-management',
    type: '301',
    note: 'Old service page.',
  },
  {
    from: '/en/search-and-import',
    to: '/en/services/full-import-management',
    type: '301',
    note: 'Old service page.',
  },
  {
    from: '/e-commerce-ar',
    to: '/services/ecommerce-launch',
    type: '301',
    note: 'Old service page.',
  },
  {
    from: '/en/e-commerce',
    to: '/en/services/ecommerce-launch',
    type: '301',
    note: 'Old service page.',
  },
  {
    from: '/trademarks-and-invitations-ar',
    to: '/services/trademark-registration',
    type: '301',
    note: 'Old service page.',
  },
  {
    from: '/en/trademarks-and-invitations',
    to: '/en/services/trademark-registration',
    type: '301',
    note: 'Old service page.',
  },
  {
    from: '/shipping-ar',
    to: '/services/shipping-and-freight',
    type: '301',
    note: 'Old service page.',
  },
  {
    from: '/en/shipping',
    to: '/en/services/shipping-and-freight',
    type: '301',
    note: 'Old service page.',
  },
  {
    from: '/request-for-a-business-invitation-ar',
    to: '/services/business-invitation-letter',
    type: '301',
    note: 'Old service page.',
  },
  {
    from: '/en/request-for-a-business-invitation-m-visa',
    to: '/en/services/business-invitation-letter',
    type: '301',
    note: 'Old service page.',
  },
  {
    from: '/en/opening-a-bank-account-in-hong-kong',
    to: '/en/services/bank-account-opening',
    type: '301',
    note: 'Old service page.',
  },
  {
    from: '/en/opening-an-enterprise-alipay-account',
    to: '/en/services/alipay-wechat-business-accounts',
    type: '301',
    note: 'Old service page.',
  },
  {
    from: '/en/opening-an-enterprise-wechat-account',
    to: '/en/services/alipay-wechat-business-accounts',
    type: '301',
    note: 'Old service page.',
  },
  {
    from: '/en/temu-store-setup',
    to: '/en/services/marketplace-store-setup',
    type: '301',
    note: 'Old service page.',
  },
  {
    from: '/en/amazon-store-setup',
    to: '/en/services/marketplace-store-setup',
    type: '301',
    note: 'Old service page.',
  },
  {
    from: '/en/aliexpress-store-setup',
    to: '/en/services/marketplace-store-setup',
    type: '301',
    note: 'Old service page.',
  },
  {
    from: '/en/alibaba-store-setup',
    to: '/en/services/marketplace-store-setup',
    type: '301',
    note: 'Old service page.',
  },
  { from: '/en/price-quotation', to: '/en/contact', type: '301', note: 'Old quotation page.' },
]

/**
 * Blog seed.
 *
 * The blog was the main way people found the old site (brief section 5), and
 * one article is confirmed from search records: a guide to opening an online
 * store through a Chinese company, covering AliExpress and company formation.
 * It is reconstructed here from that description rather than invented wholesale,
 * and the other two answer questions this audience actually searches for.
 *
 * Written Arabic-first, English second — the correct direction for this
 * business, and the opposite of how most bilingual sites are built.
 */
export type SeedCategory = {
  slug: string
  ar: string
  en: string
  description?: { ar: string; en: string }
}

/**
 * The twelve categories the owner asked for (HANDOVER.md, "the twelve blog
 * categories"), derived from what the 212 recovered articles are actually
 * about. The first three slugs predate the import and are kept so existing
 * links to them survive.
 */
export const CATEGORIES: SeedCategory[] = [
  {
    slug: 'importing',
    ar: 'الاستيراد من الصين',
    en: 'Importing from China',
    description: {
      ar: 'خطوات الاستيراد من الصين من أول طلب حتى التخليص الجمركي، والأخطاء التي تكلّف المستوردين الجدد.',
      en: 'Importing from China step by step, from the first order to customs clearance, and the mistakes that cost new importers.',
    },
  },
  {
    slug: 'company-setup',
    ar: 'تأسيس الشركات في الصين',
    en: 'Company formation in China',
    description: {
      ar: 'تأسيس شركة أجنبية في الصين: الرخصة، العنوان المسجّل، الحساب البنكي، تصاريح العمل والمحاسبة.',
      en: 'Setting up a foreign-owned company in China: the licence, the registered address, the bank account, work permits and accounting.',
    },
  },
  {
    slug: 'trade-fairs',
    ar: 'المعارض التجارية',
    en: 'Trade fairs',
    description: {
      ar: 'معرض كانتون والمعارض المتخصصة في الصين: الدعوات، المواعيد، وكيف تحوّل الزيارة إلى صفقات.',
      en: "The Canton Fair and China's specialist exhibitions: invitations, dates, and how to turn a visit into orders.",
    },
  },
  {
    slug: 'suppliers-sourcing',
    ar: 'الموردون والتوريد',
    en: 'Suppliers and sourcing',
    description: {
      ar: 'كيف تجد المورد الصيني المناسب وتتحقق منه وتدفع له بأمان، وماذا تفعل حين يتوقف فجأة.',
      en: 'How to find the right Chinese supplier, verify them, pay safely, and what to do when one disappears.',
    },
  },
  {
    slug: 'shipping-logistics',
    ar: 'الشحن واللوجستيات',
    en: 'Shipping and logistics',
    description: {
      ar: 'الشحن البحري والجوي والبري من الصين، اختيار وكيل الشحن، والموانئ وسلاسل التوريد.',
      en: 'Sea, air and land freight from China, choosing a forwarder, and the ports and supply chains behind it.',
    },
  },
  {
    slug: 'quality-inspection',
    ar: 'الجودة والفحص',
    en: 'Quality and inspection',
    description: {
      ar: 'فحص المصنع والبضاعة قبل الشحن، معايير المنتجات الصينية، والتصنيع التعاقدي.',
      en: 'Factory and pre-shipment inspection, Chinese product standards, and contract manufacturing.',
    },
  },
  {
    slug: 'ecommerce',
    ar: 'التجارة الإلكترونية',
    en: 'E-commerce',
    description: {
      ar: 'إطلاق متجرك عبر شركة صينية، البيع على المنصات، والتسويق للمستهلك الصيني.',
      en: 'Launching a store through a Chinese company, selling on marketplaces, and marketing to Chinese consumers.',
    },
  },
  {
    slug: 'investment',
    ar: 'الاستثمار في الصين',
    en: 'Investing in China',
    description: {
      ar: 'فرص الاستثمار في القطاعات الصينية، الحوافز الحكومية، ومناطق التجارة الحرة.',
      en: 'Investment opportunities across Chinese sectors, government incentives, and the free trade zones.',
    },
  },
  {
    slug: 'industries',
    ar: 'الصناعات والقطاعات',
    en: 'Industries and sectors',
    description: {
      ar: 'قراءة في الصناعات الصينية قطاعًا بقطاع: السيارات الكهربائية، الأدوية، المنسوجات، الأغذية وغيرها.',
      en: 'Chinese industry sector by sector: electric vehicles, pharmaceuticals, textiles, food and more.',
    },
  },
  {
    slug: 'legal-compliance',
    ar: 'القانون والملكية الفكرية',
    en: 'Legal and intellectual property',
    description: {
      ar: 'حماية الملكية الفكرية، الامتثال التنظيمي، وإدارة المخاطر والنزاعات التجارية في الصين.',
      en: 'Intellectual property protection, regulatory compliance, and managing risk and commercial disputes in China.',
    },
  },
  {
    slug: 'business-culture',
    ar: 'ثقافة الأعمال والتفاوض',
    en: 'Business culture and negotiation',
    description: {
      ar: 'العلاقات (قوانشي)، آداب التعامل، وكيف تتفاوض بفعالية مع الشركات الصينية.',
      en: 'Guanxi, business etiquette, and how to negotiate effectively with Chinese companies.',
    },
  },
  {
    slug: 'economy-belt-road',
    ar: 'الاقتصاد والحزام والطريق',
    en: 'Economy and the Belt and Road',
    description: {
      ar: 'الاقتصاد الصيني، مبادرة الحزام والطريق، والتجارة بين الصين والعالم العربي.',
      en: 'The Chinese economy, the Belt and Road Initiative, and trade between China and the Arab world.',
    },
  },
]

export type SeedPost = {
  slug: string
  categories: string[]
  publishedAt: string
  /** File in src/seed/assets, plus alt text. Uploaded once; matched by Arabic alt on re-runs. */
  cover?: { file: string; alt: { ar: string; en: string } }
  ar: { title: string; excerpt: string; body: string }
  en: { title: string; excerpt: string; body: string }
}

/**
 * Hand-written seed articles. Empty on purpose: the three articles that used
 * to live here (online store, import costs, factory inspection) moved into
 * the imported archive, src/seed/wp/posts.json, where they were rewritten
 * with the rest of the blog. Keeping them here as well would let every
 * `npm run seed` put the short originals back before the import skips them
 * as unchanged. Add new articles in the CMS, not here.
 */
export const POSTS: SeedPost[] = []

export const SERVICES: SeedService[] = [...CORE_SERVICES, ...CATALOGUE_SERVICES]
