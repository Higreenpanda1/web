import type { ApplicationType, PriceUnit, ServiceCategory, ServiceIconName } from '@/lib/catalogue'

/**
 * The eleven services recovered from the old WordPress site on
 * 23 September 2026, from its database backup and the owner's 2025 price
 * list. Nothing was copied verbatim: the old pages were written by a form
 * plugin and repeated every paragraph twice. The facts — what each service
 * is, what the client must prepare, the starting prices — come from there;
 * the words are new, Arabic first.
 *
 * Prices are the list prices in yuan. The site shows them as "from ¥X" and the
 * quote confirms the figure, so a price list revision is a CMS edit, not a
 * deploy.
 */

export type SeedService = {
  slug: string
  order: number
  featured: boolean
  icon: ServiceIconName
  category: ServiceCategory
  priceFrom?: number
  priceUnit?: PriceUnit
  applicationType?: ApplicationType
  ar: SeedServiceCopy
  en: SeedServiceCopy
}

export type SeedServiceCopy = {
  title: string
  summary: string
  /** Paragraphs separated by blank lines. `## ` starts an H3; `- ` a list item. */
  body: string
  highlights: string[]
  requirements?: string[]
  faqs?: Array<{ question: string; answer: string }>
}

export const CATALOGUE_SERVICES: SeedService[] = [
  // ── Company & compliance ──────────────────────────────────────────────────
  {
    slug: 'registered-address',
    order: 110,
    featured: false,
    icon: 'map-pin',
    category: 'company',
    priceFrom: 3200,
    priceUnit: 'year',
    ar: {
      title: 'عنوان تجاري مسجّل',
      summary:
        'عنوان رسمي بعقد إيجار معتمد لتسجيل شركتك، سواء كنت تحتاج إقامة عمل أو لا. ومكاتب فعلية للإيجار إن كنت ستعمل من الصين.',
      body: 'كل شركة في الصين تحتاج إلى عنوان مسجّل بعقد إيجار رسمي قبل أن تصدر رخصتها. لست مضطرًا لاستئجار مكتب حقيقي إن لم تكن ستقيم هنا؛ العنوان الافتراضي بعقد معتمد من الجهات الحكومية يكفي، وهو ما يختاره أغلب عملائنا في البداية.\n\n## الخيارات\n\n- عنوان افتراضي أساسي: للشركات التي لا يحتاج مالكها إلى إقامة عمل. من 3,200 يوان سنويًا.\n- عنوان افتراضي يسمح بالتقديم على إقامة عمل: مطلوب إن كنت تنوي الحصول على كرت العمل والإقامة. من 12,000 يوان سنويًا.\n- مكاتب فعلية للإيجار: في شنجن وقوانزو وشنغهاي وييوو، من مكتب بسيط إلى مقر كامل. نسعّرها حسب الموقع والمساحة.\n\nنجدّد العقد سنويًا ونبلغك قبل انتهائه، فلا تتفاجأ بتجميد رخصتك بسبب عنوان منتهٍ.',
      highlights: [
        'عقد إيجار رسمي معتمد لدى الجهات الحكومية',
        'خيار يسمح بالتقديم على إقامة العمل',
        'مكاتب فعلية بمساحات مختلفة عند الحاجة',
        'تذكير بالتجديد قبل انتهاء العقد',
      ],
      requirements: [
        'صورة جواز سفر الممثل القانوني',
        'المدينة المطلوبة',
        'هل تحتاج إقامة عمل أم لا',
      ],
    },
    en: {
      title: 'Registered business address',
      summary:
        'An official address with an approved lease for registering your company, with or without a work-visa entitlement. Physical offices to rent if you will work from China.',
      body: 'Every company in China needs a registered address with a formal lease before its licence is issued. You do not have to rent a real office if you will not live here: a virtual address with a government-recognised lease is enough, and it is what most of our clients start with.\n\n## The options\n\n- Basic virtual address: for companies whose owner does not need a work residence permit. From ¥3,200 a year.\n- Virtual address that allows a work-visa application: required if you intend to obtain a work permit and residence. From ¥12,000 a year.\n- Physical offices to rent: in Shenzhen, Guangzhou, Shanghai and Yiwu, from a simple desk to a full suite. Priced by location and size.\n\nWe renew the lease annually and tell you before it expires, so your licence is never frozen because an address lapsed.',
      highlights: [
        'A formal lease recognised by the authorities',
        'An option that supports a work-visa application',
        'Physical offices in several sizes when needed',
        'A renewal reminder before the lease ends',
      ],
      requirements: [
        'Passport copy of the legal representative',
        'The city you want',
        'Whether you need a work residence permit',
      ],
    },
  },
  {
    slug: 'business-licence-changes',
    order: 120,
    featured: false,
    icon: 'file-pen',
    category: 'company',
    priceFrom: 1800,
    ar: {
      title: 'تعديل بيانات الرخصة التجارية',
      summary:
        'تغيير الممثل القانوني أو العنوان المسجّل أو نطاق النشاط أو رأس المال، مع تحديث السجلات الضريبية والبنكية تبعًا لذلك.',
      body: 'الشركات تتغيّر: يدخل شريك أو يخرج، تنتقل إلى عنوان جديد، تضيف نشاطًا لم يكن في الرخصة، أو ترفع رأس مالها. كل تغيير من هذه يجب أن يُسجَّل رسميًا لدى إدارة تنظيم السوق، ثم يُحدَّث في مصلحة الضرائب والبنك، وإلا تراكمت المخالفات دون أن تعلم.\n\nنتولّى الإجراء كاملًا: إعداد قرارات الشركاء والمستندات، تقديمها، استلام الرخصة الجديدة، وتحديث الجهات الأخرى. أغلب التعديلات تكتمل خلال أسبوع إلى أسبوعين.',
      highlights: [
        'تغيير الممثل القانوني أو الشركاء',
        'نقل العنوان المسجّل',
        'إضافة أو تعديل نطاق النشاط',
        'زيادة أو تخفيض رأس المال',
        'تحديث السجل الضريبي والبنك بعد التعديل',
      ],
      requirements: [
        'صورة الرخصة التجارية الحالية',
        'وصف التعديل المطلوب',
        'جوازات سفر الأطراف المعنية',
      ],
    },
    en: {
      title: 'Business licence amendments',
      summary:
        'Change the legal representative, the registered address, the scope of business or the registered capital, and update the tax and bank records to match.',
      body: 'Companies change: a partner joins or leaves, you move to a new address, you add an activity that was not on the licence, or you raise the capital. Each of these must be registered with the market regulator and then updated at the tax bureau and the bank, or penalties quietly accumulate.\n\nWe handle the whole procedure: drafting the shareholder resolutions and documents, filing them, collecting the new licence, and updating the other authorities. Most amendments complete in one to two weeks.',
      highlights: [
        'Change of legal representative or shareholders',
        'Change of registered address',
        'Adding or amending the scope of business',
        'Increasing or reducing registered capital',
        'Tax and bank records updated after the change',
      ],
      requirements: [
        'Copy of the current business licence',
        'A description of the change',
        'Passports of the people involved',
      ],
    },
  },
  {
    slug: 'accounting-and-tax',
    order: 130,
    featured: false,
    icon: 'calculator',
    category: 'company',
    priceFrom: 3800,
    priceUnit: 'year',
    ar: {
      title: 'المحاسبة والإقرارات الضريبية',
      summary:
        'مسك الدفاتر الشهري والإقرارات الضريبية والتقرير السنوي لشركتك في الصين، بيد محاسبين مرخّصين، حتى تبقى الشركة سليمة أمام الجهات الرسمية.',
      body: 'الشركة في الصين مطالَبة بإقرار ضريبي شهري أو ربع سنوي وتقرير سنوي حتى لو لم يكن لها أي إيراد. التأخر يعني غرامات، وتكراره يضع الشركة في قائمة الشركات غير المنتظمة، وهو ما يعطّل الحساب البنكي والتأشيرات لاحقًا.\n\nيتولّى فريقنا من المحاسبين المرخّصين في الصين مسك الدفاتر وتقديم الإقرارات في مواعيدها، ويرسل لك ملخصًا شهريًا بالعربية تفهمه دون خلفية محاسبية.\n\n## ما تشمله الخدمة\n\n- تنظيم الفواتير ومراجعتها وإعداد سندات القيد\n- الإقرارات الشهرية وربع السنوية: ضريبة القيمة المضافة وضريبة دخل الشركات\n- إقرار ضريبة الدخل الشخصي للموظفين\n- التقرير السنوي للشركة لدى إدارة تنظيم السوق\n- استشارات ضريبية لتقليل العبء بشكل قانوني\n\nالسعر المبدئي للمؤسسات الصغيرة (دافع الضريبة صغير الحجم). الشركات ذات النظام الضريبي العام تُسعَّر حسب حجم العمليات.',
      highlights: [
        'محاسبون مرخّصون في الصين',
        'الإقرارات الشهرية والسنوية في مواعيدها',
        'ملخص شهري بالعربية',
        'تجنّب الغرامات وقوائم الشركات غير المنتظمة',
        'استشارة ضريبية عند الحاجة',
      ],
      requirements: ['صورة الرخصة التجارية', 'حجم العمليات التقريبي', 'هل للشركة موظفون في الصين'],
    },
    en: {
      title: 'Accounting and tax filing',
      summary:
        'Monthly bookkeeping, tax returns and the annual report for your Chinese company, by licensed accountants, so it stays in good standing with the authorities.',
      body: 'A company in China must file a monthly or quarterly tax return and an annual report even when it has no revenue. Missing one means a fine; missing several puts the company on the irregular list, which later blocks the bank account and visas.\n\nOur team of accountants licensed in China keeps the books and files on time, and sends you a monthly summary in Arabic you can follow without an accounting background.\n\n## What is included\n\n- Organising and checking invoices, preparing vouchers\n- Monthly and quarterly returns: VAT and corporate income tax\n- Personal income tax filing for employees\n- The company’s annual report to the market regulator\n- Tax advice to reduce the burden legally\n\nThe starting price is for small-scale taxpayers. General taxpayers are priced by transaction volume.',
      highlights: [
        'Accountants licensed in China',
        'Monthly and annual filings on time',
        'A monthly summary in Arabic',
        'No fines, no irregular-company listing',
        'Tax advice when you need it',
      ],
      requirements: [
        'Copy of the business licence',
        'Approximate transaction volume',
        'Whether the company has staff in China',
      ],
    },
  },
  {
    slug: 'trademark-registration',
    order: 140,
    featured: false,
    icon: 'badge-check',
    category: 'company',
    priceFrom: 1900,
    priceUnit: 'class',
    applicationType: 'trademark',
    ar: {
      title: 'تسجيل العلامة التجارية في الصين',
      summary:
        'سجّل علامتك في الصين قبل أن يسجّلها غيرك. نتولّى البحث والتقديم والمتابعة حتى صدور الشهادة، ونردّ على أي اعتراض.',
      body: 'الصين تعمل بمبدأ «الأسبق في التسجيل»، لا الأسبق في الاستخدام. علامة تبيع بها منذ سنوات في بلدك يمكن أن يسجّلها مصنعك أو منافسك هنا، ثم يمنعك من التصدير بها أو يبيعها لك. التسجيل المبكر هو الحماية الوحيدة، وتكلفته أقل بكثير من استردادها لاحقًا.\n\n## كيف نعمل\n\n- نبحث أولًا في سجل العلامات عن أي تعارض قبل أن تدفع رسوم التقديم\n- نقترح عليك تسجيل نسخة صينية من الاسم؛ السوق سيسمّيك بالصينية شئت أم أبيت\n- نقدّم الطلب في الفئات المناسبة لمنتجاتك (تُسجَّل العلامة لكل فئة على حدة)\n- نتابع الطلب ونردّ على أي اعتراض أو رفض مبدئي\n- نسلّمك الشهادة الرسمية ونذكّرك بالتجديد كل عشر سنوات\n\nالتسجيل يستغرق عادةً من 9 إلى 12 شهرًا، لكن رقم الطلب يصدر خلال أسابيع ويكفي لإثبات الأسبقية.',
      highlights: [
        'بحث عن التعارض قبل الدفع',
        'تسجيل الاسم اللاتيني والصيني',
        'اختيار الفئات المناسبة لمنتجاتك',
        'الرد على الاعتراضات والمتابعة حتى الشهادة',
        'تذكير بالتجديد',
      ],
      requirements: [
        'اسم العلامة وشعارها إن وُجد',
        'قائمة المنتجات أو الخدمات',
        'صورة جواز السفر أو الرخصة التجارية لمقدّم الطلب',
      ],
      faqs: [
        {
          question: 'هل أحتاج شركة في الصين لتسجيل علامة؟',
          answer:
            'لا. يمكن التسجيل باسمك الشخصي أو باسم شركتك في بلدك، بشرط تعيين وكيل محلي، وهذا دورنا.',
        },
        {
          question: 'ماذا لو كانت علامتي مسجّلة بالفعل من شخص آخر؟',
          answer:
            'نبلغك بذلك بعد البحث الأولي وقبل دفع أي رسوم، ونشرح لك الخيارات: فئة مختلفة، اسم صيني مميز، أو طلب إلغاء لعدم الاستخدام إن كان ذلك ممكنًا.',
        },
      ],
    },
    en: {
      title: 'Trademark registration in China',
      summary:
        'Register your mark in China before someone else does. We search, file and follow up until the certificate is issued, and answer any objection.',
      body: 'China works on “first to file”, not first to use. A brand you have sold under for years at home can be registered here by your own factory or a competitor, who can then block your exports or sell it back to you. Early registration is the only protection, and it costs far less than recovering a mark later.\n\n## How we work\n\n- We search the register for conflicts before you pay any filing fee\n- We recommend registering a Chinese version of the name; the market will call you something in Chinese whether you choose it or not\n- We file in the classes that match your goods (a trademark is registered per class)\n- We monitor the application and respond to objections or provisional refusals\n- We deliver the official certificate and remind you of the ten-year renewal\n\nRegistration usually takes 9 to 12 months, but the application number is issued within weeks and is enough to establish priority.',
      highlights: [
        'Conflict search before you pay',
        'Latin and Chinese versions of the name',
        'The right classes for your goods',
        'Objections handled, followed to certificate',
        'Renewal reminder',
      ],
      requirements: [
        'The mark and its logo, if any',
        'A list of goods or services',
        'Passport or business licence of the applicant',
      ],
      faqs: [
        {
          question: 'Do I need a Chinese company to register a trademark?',
          answer:
            'No. You can register in your own name or your home company’s name, provided a local agent is appointed — which is our role.',
        },
        {
          question: 'What if my mark is already registered by someone else?',
          answer:
            'We tell you after the initial search, before any fee is paid, and explain the options: a different class, a distinctive Chinese name, or a non-use cancellation request where that is possible.',
        },
      ],
    },
  },

  // ── Banking & payments ────────────────────────────────────────────────────
  {
    slug: 'bank-account-opening',
    order: 200,
    featured: false,
    icon: 'landmark',
    category: 'banking',
    priceFrom: 1400,
    applicationType: 'account-opening',
    ar: {
      title: 'فتح حساب بنكي للشركة',
      summary:
        'حساب بنكي لشركتك في الصين باليوان والعملات الأجنبية، أو حساب لشركتك في هونغ كونغ. نرتّب الموعد ونجهّز الملف ونرافقك في البنك.',
      body: 'الحساب البنكي هو ما يجعل الشركة قابلة للعمل فعلًا: به تستلم من عملائك، تدفع لمورّديك، وتربط حسابات علي باي ووي تشات باي. لكن البنوك الصينية تدقّق في الشركات الأجنبية، وطلب ناقص أو إجابة مرتبكة في المقابلة يعني رفضًا وانتظارًا لأشهر قبل محاولة أخرى.\n\nنعرف ما يسأل عنه كل بنك، ونجهّز الملف بناءً عليه، ونرافقك في الموعد مترجمين وشارحين.\n\n## الخيارات\n\n- حساب شركة في الصين: باليوان والدولار وغيرها، مع الخدمات المصرفية الإلكترونية. من 1,400 يوان.\n- حساب شركة في هونغ كونغ: لمن يحتاج حرية أكبر في تحويل العملات الأجنبية. من 1,700 يوان، ويشترط شركة مسجّلة في هونغ كونغ.\n\nحضور الممثل القانوني شخصيًا مطلوب في أغلب البنوك، وبعضها يقبل الفتح عن بُعد لحالات محددة؛ أخبرنا بوضعك ونحدّد لك البنك المناسب.',
      highlights: [
        'اختيار البنك المناسب لنوع نشاطك',
        'تجهيز الملف كاملًا قبل الموعد',
        'مرافقة وترجمة في المقابلة',
        'تفعيل الخدمات الإلكترونية والبطاقة',
        'ربط الحساب بعلي باي ووي تشات باي لاحقًا',
      ],
      requirements: [
        'الرخصة التجارية',
        'جواز سفر الممثل القانوني',
        'وصف النشاط ودول التعامل الرئيسية',
        'تقدير حجم التعاملات السنوي',
      ],
    },
    en: {
      title: 'Corporate bank account opening',
      summary:
        'A bank account for your Chinese company in yuan and foreign currencies, or for your Hong Kong company. We book the appointment, prepare the file and accompany you at the bank.',
      body: 'The bank account is what makes a company actually usable: it is how you receive from customers, pay suppliers, and connect Alipay and WeChat Pay. But Chinese banks scrutinise foreign-owned companies, and an incomplete file or a muddled answer in the interview means a refusal and months of waiting before the next attempt.\n\nWe know what each bank asks, prepare the file accordingly, and sit with you at the appointment to translate and explain.\n\n## The options\n\n- Mainland China company account: yuan, dollars and other currencies, with online banking. From ¥1,400.\n- Hong Kong company account: for those who need more freedom moving foreign currency. From ¥1,700; requires a company registered in Hong Kong.\n\nMost banks require the legal representative in person; a few accept remote opening in specific cases. Tell us your situation and we will match the bank.',
      highlights: [
        'The right bank for your type of business',
        'The complete file prepared before the appointment',
        'Accompanied and translated at the interview',
        'Online banking and card activated',
        'Ready to connect Alipay and WeChat Pay afterwards',
      ],
      requirements: [
        'Business licence',
        'Passport of the legal representative',
        'Description of the business and main trading countries',
        'Estimated annual transaction volume',
      ],
    },
  },
  {
    slug: 'alipay-wechat-business-accounts',
    order: 210,
    featured: false,
    icon: 'wallet',
    category: 'banking',
    priceFrom: 1700,
    applicationType: 'account-opening',
    ar: {
      title: 'حسابات علي باي ووي تشات باي التجارية',
      summary:
        'حساب تجاري موثّق على علي باي ووي تشات باي باسم شركتك، لتستلم المدفوعات من عملائك في الصين وتدفع لمورّديك كما يفعل الجميع هنا.',
      body: 'في الصين لا أحد يدفع نقدًا ولا يكاد أحد يستخدم البطاقات؛ علي باي ووي تشات باي هما النقود. حساب شخصي يكفي للشراء، لكن استلام المدفوعات باسم شركتك، أو فتح متجر على علي إكسبرس، أو الدفع لمورّدين بمبالغ كبيرة، كل ذلك يحتاج حسابًا تجاريًا موثّقًا مرتبطًا بالرخصة والحساب البنكي.\n\nالتوثيق التجاري يطلب صورًا للمكتب، وإثبات الحساب البنكي، وشهادة الشركة على وي تشات، ويُرفض كثيرًا عند أول محاولة لأسباب صغيرة. نجهّز الملف بالشكل الذي تقبله المنصتان من أول مرة.\n\n- علي باي تجاري: من 1,700 يوان\n- وي تشات باي تجاري (حساب تحصيل الشركات): من 2,100 يوان',
      highlights: [
        'حساب باسم الشركة لا باسم شخص',
        'استلام المدفوعات من العملاء في الصين',
        'شرط أساسي لمتجر علي إكسبرس',
        'ربط بالحساب البنكي للشركة',
        'تجهيز ملف التوثيق لقبوله من أول مرة',
      ],
      requirements: [
        'الرخصة التجارية',
        'جواز سفر الممثل القانوني',
        'حساب بنكي للشركة (أو نفتحه لك أولًا)',
        'رقم هاتف صيني وبريد إلكتروني',
      ],
    },
    en: {
      title: 'Business Alipay and WeChat Pay accounts',
      summary:
        'A verified business account on Alipay and WeChat Pay in your company’s name, to collect payments from customers in China and pay suppliers the way everyone here does.',
      body: 'Nobody in China pays cash and almost nobody uses cards; Alipay and WeChat Pay are the money. A personal account is enough for buying, but collecting payments in your company’s name, opening an AliExpress store, or paying suppliers large sums all need a verified business account tied to the licence and the bank account.\n\nBusiness verification asks for office photos, proof of the bank account and the company’s WeChat certification, and it is often rejected on the first attempt for small reasons. We prepare the file the way both platforms accept it the first time.\n\n- Business Alipay: from ¥1,700\n- Business WeChat Pay (corporate collection account): from ¥2,100',
      highlights: [
        'An account in the company’s name, not a person’s',
        'Collect payments from customers in China',
        'A prerequisite for an AliExpress store',
        'Linked to the company bank account',
        'Verification file prepared to pass first time',
      ],
      requirements: [
        'Business licence',
        'Passport of the legal representative',
        'A company bank account (or we open one first)',
        'A Chinese phone number and an email address',
      ],
    },
  },

  // ── E-commerce ────────────────────────────────────────────────────────────
  {
    slug: 'marketplace-store-setup',
    order: 310,
    featured: false,
    icon: 'store',
    category: 'ecommerce',
    priceFrom: 2800,
    applicationType: 'store-setup',
    ar: {
      title: 'فتح متجر على TEMU وأمازون وعلي إكسبرس وعلي بابا',
      summary:
        'نسجّل متجرك على المنصة التي تختارها من خلال شركتك الصينية، ونجهّز الحسابات والوثائق التي تشترطها كل منصة حتى تبدأ البيع.',
      body: 'البيع عبر الحدود من الصين مباشرة يوفّر عليك مستودعًا في بلدك ووسيطًا يأخذ هامشه. لكن كل منصة لها شروطها: TEMU وأمازون تطلبان رخصة صينية وبطاقة دفع دولية، علي إكسبرس تشترط حساب علي باي تجاريًا، وعلي بابا تطلب إثبات عنوان وشهادات صناعية لبعض الفئات. طلب ناقص يعلّق المتجر لأسابيع.\n\nنعرف قوائم كل منصة، ونجهّز ملفك بناءً عليها، ونتابع حتى يُفعَّل المتجر ويُرفع أول منتج.\n\n## المنصات والأسعار المبدئية\n\n- TEMU: من 2,800 يوان\n- أمازون: من 2,800 يوان\n- علي إكسبرس: من 3,300 يوان\n- علي بابا: من 3,300 يوان\n\nليس لديك شركة صينية بعد؟ نؤسّسها لك أولًا، ونفتح المتجر بعدها ضمن خطة واحدة.',
      highlights: [
        'تسجيل المتجر باسم شركتك الصينية',
        'تجهيز متطلبات كل منصة قبل التقديم',
        'حسابات الدفع المطلوبة (علي باي تجاري وغيرها)',
        'رفع أول منتج والتأكد من تفعيل المتجر',
        'إرشاد أولي لإدارة المتجر والشحن',
      ],
      requirements: [
        'الرخصة التجارية (أو نؤسّس الشركة أولًا)',
        'جواز سفر الممثل القانوني',
        'فئة المنتجات وأول المنتجات',
        'شعار المتجر إن وُجد',
      ],
    },
    en: {
      title: 'Store setup on TEMU, Amazon, AliExpress and Alibaba',
      summary:
        'We register your store on the platform you choose through your Chinese company, and prepare the accounts and documents each platform requires so you can start selling.',
      body: 'Selling cross-border directly from China saves you a warehouse at home and a middleman’s margin. But every platform has its conditions: TEMU and Amazon want a Chinese licence and an international payment card, AliExpress requires a business Alipay account, and Alibaba asks for proof of address and industry certificates in some categories. An incomplete application stalls the store for weeks.\n\nWe know each platform’s checklist, prepare your file against it, and follow through until the store is live and the first product is listed.\n\n## Platforms and starting prices\n\n- TEMU: from ¥2,800\n- Amazon: from ¥2,800\n- AliExpress: from ¥3,300\n- Alibaba: from ¥3,300\n\nNo Chinese company yet? We register one first and open the store afterwards, in one plan.',
      highlights: [
        'Store registered in your Chinese company’s name',
        'Each platform’s requirements prepared before applying',
        'The payment accounts required (business Alipay and others)',
        'First product listed and the store confirmed live',
        'Initial guidance on running the store and shipping',
      ],
      requirements: [
        'Business licence (or we register the company first)',
        'Passport of the legal representative',
        'Product category and first products',
        'Store logo, if you have one',
      ],
    },
  },

  // ── Visas & travel ────────────────────────────────────────────────────────
  {
    slug: 'business-invitation-letter',
    order: 400,
    featured: false,
    icon: 'file-check',
    category: 'visas',
    priceFrom: 600,
    applicationType: 'visa-invitation',
    ar: {
      title: 'خطاب دعوة تجارية (تأشيرة M)',
      summary:
        'دعوة رسمية من جهة صينية معتمدة لزيارة المصانع وحضور المعارض، تُصدر لجميع الجنسيات وتُستخدم للتقديم على تأشيرة الأعمال M في بلدك.',
      body: 'تأشيرة الأعمال الصينية (M) تحتاج خطاب دعوة من جهة في الصين. نصدر لك دعوة رسمية معتمدة لدى الجهات الحكومية، مخصصة لغرض رحلتك: زيارة مصانع، حضور معرض كانتون أو غيره، أو الاثنين معًا. تصلح لإقامة تصل إلى شهر كامل، وتُصدر لجميع الجنسيات.\n\nترسل لنا بياناتك كما هي في جواز السفر، فنصدر الخطاب ونرسله لك رقميًا لتقديمه مع طلب التأشيرة في السفارة أو مركز التأشيرات في بلدك.\n\n## المدة\n\n- الإصدار العادي: حتى 29 يوم عمل\n- الإصدار المستعجل: متاح بسعر أعلى عند الحاجة، اسألنا عن المدة المتاحة لجنسيتك\n\nالبيانات في الخطاب يجب أن تطابق الجواز حرفًا بحرف؛ أي اختلاف يعني رفض التأشيرة. لهذا نراجعها معك قبل الإصدار.',
      highlights: [
        'دعوة رسمية معتمدة لدى الجهات الحكومية',
        'لجميع الجنسيات',
        'زيارة المصانع والمعارض لمدة تصل إلى شهر',
        'مراجعة البيانات مع الجواز قبل الإصدار',
        'إرسال رقمي جاهز للتقديم',
      ],
      requirements: [
        'صورة واضحة لجواز السفر',
        'شهادة خبرة أو إثبات عمل',
        'تاريخ الرحلة التقريبي والمدن',
        'مكان التقديم على التأشيرة',
      ],
      faqs: [
        {
          question: 'هل الدعوة تضمن الحصول على التأشيرة؟',
          answer:
            'لا؛ قرار التأشيرة للسفارة. لكن الدعوة الرسمية المعتمدة هي الشرط الذي يُرفض بدونه أغلب الطلبات، ونراجع بياناتك لتجنّب أسباب الرفض الشائعة.',
        },
      ],
    },
    en: {
      title: 'Business invitation letter (M visa)',
      summary:
        'An official invitation from an accredited Chinese entity for factory visits and trade fairs, issued for all nationalities and used to apply for the M business visa in your country.',
      body: 'The Chinese business visa (M) requires an invitation letter from an entity in China. We issue an official, government-recognised invitation tailored to your trip: factory visits, the Canton Fair or another exhibition, or both. It covers a stay of up to a full month and is issued for all nationalities.\n\nYou send us your details exactly as they appear in the passport; we issue the letter and send it digitally for you to submit with your visa application at the embassy or visa centre in your country.\n\n## Timing\n\n- Normal issue: up to 29 working days\n- Express issue: available at a higher price when needed; ask us what is possible for your nationality\n\nThe details on the letter must match the passport letter for letter; any difference means a refused visa. That is why we check them with you before issuing.',
      highlights: [
        'Official invitation recognised by the authorities',
        'All nationalities',
        'Factory visits and trade fairs, up to a month',
        'Details checked against the passport before issue',
        'Sent digitally, ready to submit',
      ],
      requirements: [
        'A clear passport copy',
        'An experience certificate or proof of employment',
        'Approximate travel dates and cities',
        'Where you will apply for the visa',
      ],
      faqs: [
        {
          question: 'Does the invitation guarantee the visa?',
          answer:
            'No; the embassy decides. But an official, recognised invitation is the requirement without which most applications are refused, and we check your details to avoid the common causes of refusal.',
        },
      ],
    },
  },
  {
    slug: 'business-visa',
    order: 410,
    featured: false,
    icon: 'plane',
    category: 'visas',
    priceFrom: 4000,
    applicationType: 'visa',
    ar: {
      title: 'تأشيرة الأعمال',
      summary:
        'إدارة كاملة لطلب تأشيرة الأعمال: الدعوة، والملف، والتقديم، والمتابعة حتى الحصول عليها، لرجال الأعمال الذين يترددون على الصين.',
      body: 'إن كنت تزور الصين بانتظام للشراء أو للمتابعة مع مصانعك، فتأشيرة أعمال طويلة متعددة الدخول توفّر عليك طلبًا جديدًا في كل مرة. الحصول عليها يعتمد على قوة الملف: دعوة من الجهة المناسبة، إثبات نشاطك التجاري، وسجل سفر نظيف.\n\nنجهّز الملف كاملًا ونرشدك في التقديم في السفارة أو مركز التأشيرات في بلدك، ونتابع معك حتى صدورها. للجنسيات والحالات التي تسمح بذلك، نساعد في الحصول على تأشيرات بمدة سنة أو أكثر.\n\nالسعر يشمل الدعوة وإعداد الملف والمتابعة، ولا يشمل رسوم السفارة.',
      highlights: [
        'دعوة من الجهة المناسبة لنوع نشاطك',
        'ملف كامل مراجَع قبل التقديم',
        'إرشاد خطوة بخطوة في السفارة أو المركز',
        'متابعة حتى صدور التأشيرة',
        'تأشيرات متعددة الدخول عند الإمكان',
      ],
      requirements: [
        'صورة واضحة لجواز السفر',
        'إثبات النشاط التجاري (سجل تجاري أو خطاب عمل)',
        'تأشيرات صينية سابقة إن وُجدت',
      ],
    },
    en: {
      title: 'Business visa',
      summary:
        'End-to-end handling of a business visa application: the invitation, the file, the submission and the follow-up, for business people who travel to China regularly.',
      body: 'If you visit China regularly to buy or to follow up with your factories, a long multiple-entry business visa saves you a new application every time. Getting one depends on the strength of the file: an invitation from the right entity, proof of your business activity, and a clean travel record.\n\nWe prepare the complete file, guide you through submission at the embassy or visa centre in your country, and follow up with you until it is issued. For nationalities and cases that allow it, we help obtain visas valid for a year or more.\n\nThe price covers the invitation, file preparation and follow-up; embassy fees are separate.',
      highlights: [
        'An invitation from the right entity for your business',
        'A complete file reviewed before submission',
        'Step-by-step guidance at the embassy or centre',
        'Followed up until the visa is issued',
        'Multiple-entry visas where possible',
      ],
      requirements: [
        'A clear passport copy',
        'Proof of business activity (commercial register or employer letter)',
        'Previous Chinese visas, if any',
      ],
    },
  },
  {
    slug: 'work-visa-and-residence',
    order: 420,
    featured: false,
    icon: 'id-card',
    category: 'visas',
    priceFrom: 7600,
    applicationType: 'visa',
    ar: {
      title: 'تأشيرة العمل والإقامة',
      summary:
        'تصريح العمل وتأشيرة Z وبطاقة الإقامة لمالك الشركة أو موظفيها، من تقييم الأهلية حتى استلام بطاقة الإقامة في الصين.',
      body: 'الإقامة في الصين تمرّ عبر تصريح عمل: تحصل عليه شركتك لك بصفتك ممثلها القانوني أو موظفًا فيها، ثم تحصل على تأشيرة Z من بلدك، وبعد الدخول تُستبدل ببطاقة إقامة لسنة أو أكثر. كل مرحلة لها شروطها ومستنداتها، وبعضها يحتاج تصديقًا من الخارجية والسفارة في بلدك قبل أن تسافر.\n\nنبدأ بتقييم صادق لأهليتك — الشهادة، سنوات الخبرة، العمر، رأس مال الشركة — ونخبرك بفرصك قبل أن تدفع. ثم ندير الملف كاملًا حتى بطاقة الإقامة.\n\n## المراحل\n\n- تقييم الأهلية وتحديد الفئة\n- إشعار تصريح العمل من مكتب العمل\n- تأشيرة Z من السفارة الصينية في بلدك\n- الفحص الطبي والتسجيل بعد الوصول\n- تصريح العمل وبطاقة الإقامة\n\nليس لديك شركة بعد؟ الإقامة تشترطها، ونؤسّسها لك ضمن الخطة نفسها بالعنوان ورأس المال المناسبين.',
      highlights: [
        'تقييم صادق للأهلية قبل الدفع',
        'إدارة المراحل الخمس كاملة',
        'إرشاد في تصديق المستندات في بلدك',
        'مرافقة في الفحص الطبي ومكتب الهجرة',
        'تجديد الإقامة عند انتهائها',
      ],
      requirements: [
        'صورة جواز السفر',
        'أعلى شهادة دراسية',
        'شهادة خبرة تغطي سنتين على الأقل',
        'شهادة خلو سوابق مصدّقة',
        'رخصة الشركة الصينية (أو نؤسّسها أولًا)',
      ],
      faqs: [
        {
          question: 'كم تستغرق العملية؟',
          answer:
            'من شهرين إلى ثلاثة أشهر عادةً من اكتمال المستندات المصدّقة حتى بطاقة الإقامة، حسب المدينة وسرعة التصديق في بلدك.',
        },
      ],
    },
    en: {
      title: 'Work visa and residence permit',
      summary:
        'The work permit, the Z visa and the residence card for a company owner or staff, from eligibility assessment to holding the residence card in China.',
      body: 'Living in China goes through a work permit: your company obtains it for you as its legal representative or an employee, you then get a Z visa from your country, and after entry it is exchanged for a residence card of a year or more. Each stage has its conditions and documents, and some need legalisation by your foreign ministry and the Chinese embassy before you travel.\n\nWe start with an honest assessment of your eligibility — degree, years of experience, age, the company’s capital — and tell you your chances before you pay. Then we run the whole file through to the residence card.\n\n## The stages\n\n- Eligibility assessment and category\n- Work permit notification from the labour bureau\n- Z visa from the Chinese embassy in your country\n- Medical check and registration after arrival\n- Work permit and residence card\n\nNo company yet? Residence requires one, and we register it within the same plan, with the right address and capital.',
      highlights: [
        'An honest eligibility assessment before you pay',
        'All five stages managed',
        'Guidance on legalising documents in your country',
        'Accompanied at the medical check and immigration bureau',
        'Renewal when the permit expires',
      ],
      requirements: [
        'Passport copy',
        'Highest educational certificate',
        'Experience certificate covering at least two years',
        'Legalised criminal record certificate',
        'The Chinese company licence (or we register it first)',
      ],
      faqs: [
        {
          question: 'How long does it take?',
          answer:
            'Usually two to three months from complete legalised documents to the residence card, depending on the city and how quickly legalisation goes in your country.',
        },
      ],
    },
  },
  {
    slug: 'family-reunion-visa',
    order: 430,
    featured: false,
    icon: 'users',
    category: 'visas',
    priceFrom: 1500,
    applicationType: 'visa',
    ar: {
      title: 'تأشيرة لمّ الشمل',
      summary:
        'تأشيرة وإقامة لزوجك وأبنائك أو والديك للانضمام إليك في الصين، مرتبطة بإقامتك أو إقامة العمل الخاصة بك.',
      body: 'من يحمل إقامة عمل في الصين يمكنه استقدام أسرته: الزوج أو الزوجة، الأبناء دون 18 عامًا، والوالدين. تحصل الأسرة على تأشيرة S1 أو Q1 من بلدها، ثم على بطاقة إقامة مرتبطة بمدة إقامتك.\n\nالمستندات الحساسة هنا هي إثبات القرابة: عقد الزواج وشهادات الميلاد يجب ترجمتها وتصديقها من الخارجية والسفارة الصينية في بلدك، وأي نقص فيها يعيد الطلب من البداية. نراجع مستنداتك قبل التصديق، ونتابع الملف من التأشيرة حتى بطاقة الإقامة وتسجيل الأبناء في المدارس إن رغبت.',
      highlights: [
        'الزوج والأبناء والوالدان',
        'مراجعة مستندات القرابة قبل التصديق',
        'التأشيرة من بلدك ثم بطاقة الإقامة في الصين',
        'مدة الإقامة مرتبطة بإقامتك',
        'مساعدة في تسجيل الأبناء في المدارس',
      ],
      requirements: [
        'إقامة العمل الخاصة بك',
        'جوازات سفر أفراد الأسرة',
        'عقد الزواج وشهادات الميلاد مصدّقة',
      ],
    },
    en: {
      title: 'Family reunion visa',
      summary:
        'A visa and residence permit for your spouse, children or parents to join you in China, tied to your own residence or work permit.',
      body: 'A holder of a work residence permit in China can bring their family: spouse, children under 18, and parents. The family obtains an S1 or Q1 visa in their country, then a residence card matching the length of yours.\n\nThe sensitive documents here are proof of kinship: the marriage certificate and birth certificates must be translated and legalised by your foreign ministry and the Chinese embassy, and any gap sends the application back to the start. We check your documents before legalisation, and follow the file from visa to residence card — and to school registration for the children if you wish.',
      highlights: [
        'Spouse, children and parents',
        'Kinship documents checked before legalisation',
        'Visa in your country, then the residence card in China',
        'Residence matched to your own permit',
        'Help with school registration for children',
      ],
      requirements: [
        'Your own work residence permit',
        'Passports of the family members',
        'Legalised marriage and birth certificates',
      ],
    },
  },
]
