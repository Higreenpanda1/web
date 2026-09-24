/**
 * The opening content queue: the questions this audience asks that the
 * recovered archive does not yet answer well, grouped by category. Arabic is
 * written first (brief section 10). Priorities: 10 urgent, 30 soon, 50 normal.
 *
 * Every entry is a search phrase a Gulf or Yemeni importer types, not a topic
 * the company wants to talk about — that is the difference between a blog that
 * ranks and one that does not.
 */
export type SeedTopic = {
  category: string
  priority: number
  ar: { title: string; keyword: string; brief: string }
  en: { title: string; keyword: string; brief: string }
}

export const TOPICS: SeedTopic[] = [
  {
    category: 'importing',
    priority: 10,
    ar: {
      title: 'كم تكلفة الاستيراد من الصين إلى السعودية؟ حساب كامل بالأرقام',
      keyword: 'تكلفة الاستيراد من الصين إلى السعودية',
      brief:
        'حساب التكلفة الكاملة لشحنة نموذجية: سعر المصنع، الشحن، التأمين، الجمارك السعودية (5% و15% ضريبة القيمة المضافة)، رسوم سابر، النقل المحلي. جدول واحد بالأرقام وقاعدة سريعة للتقدير.',
    },
    en: {
      title: 'How much does importing from China to Saudi Arabia cost? A full worked example',
      keyword: 'cost of importing from China to Saudi Arabia',
      brief:
        'Full landed-cost calculation for a sample shipment: factory price, freight, insurance, Saudi customs duty (5%) and VAT (15%), SABER fees, local delivery. One table with figures and a rule of thumb.',
    },
  },
  {
    category: 'importing',
    priority: 10,
    ar: {
      title: 'الاستيراد من الصين إلى الإمارات: الخطوات والرسوم والمستندات 2026',
      keyword: 'الاستيراد من الصين إلى الإمارات',
      brief:
        'رخصة الاستيراد، رمز المستورد في الجمارك، الرسوم 5%، المستندات المطلوبة، مدة الشحن إلى جبل علي، والأخطاء الشائعة.',
    },
    en: {
      title: 'Importing from China to the UAE: steps, duties and documents in 2026',
      keyword: 'importing from China to UAE',
      brief:
        'Import licence, customs importer code, the 5% duty, required documents, transit time to Jebel Ali, common mistakes.',
    },
  },
  {
    category: 'importing',
    priority: 30,
    ar: {
      title: 'الاستيراد من الصين إلى اليمن: الطرق الممكنة والتكلفة والمخاطر',
      keyword: 'الاستيراد من الصين إلى اليمن',
      brief:
        'الموانئ العاملة (عدن، الحديدة، المكلا)، الشحن عبر جيبوتي والسعودية، التأمين، التحويلات المالية، ومن يتعامل معه المستورد اليمني.',
    },
    en: {
      title: 'Importing from China to Yemen: routes, costs and risks',
      keyword: 'importing from China to Yemen',
      brief:
        'Working ports (Aden, Hodeidah, Mukalla), routing via Djibouti and Saudi Arabia, insurance, payments, who a Yemeni importer deals with.',
    },
  },
  {
    category: 'importing',
    priority: 30,
    ar: {
      title: 'ما هو الحد الأدنى للطلب (MOQ) وكيف تتفاوض عليه مع المصانع الصينية؟',
      keyword: 'الحد الأدنى للطلب من الصين',
      brief:
        'لماذا يفرض المصنع حدًا أدنى، الأرقام المعتادة حسب المنتج، ست طرق لتخفيضه، ومتى يكون الوسيط أفضل من المصنع.',
    },
    en: {
      title: 'What is MOQ and how do you negotiate it with Chinese factories?',
      keyword: 'MOQ China factory negotiate',
      brief:
        'Why factories set a minimum, typical figures by product type, six ways to lower it, and when a trading company beats a factory.',
    },
  },
  {
    category: 'importing',
    priority: 50,
    ar: {
      title: 'شهادة سابر (SABER) للمنتجات المستوردة من الصين: الدليل الكامل',
      keyword: 'شهادة سابر للاستيراد من الصين',
      brief:
        'ما هي شهادة المطابقة، أي المنتجات تحتاجها، الخطوات، التكلفة، المدة، والجهات المعتمدة في الصين.',
    },
    en: {
      title: 'SABER certification for products imported from China: the complete guide',
      keyword: 'SABER certificate China import',
      brief:
        'What the conformity certificate is, which products need it, steps, cost, timing, and the approved bodies in China.',
    },
  },
  {
    category: 'suppliers-sourcing',
    priority: 10,
    ar: {
      title: 'كيف تتحقق من مصنع صيني قبل التحويل؟ 9 فحوصات في 48 ساعة',
      keyword: 'التحقق من مصنع صيني',
      brief:
        'رخصة العمل ورقم التسجيل الموحد، التحقق عبر منصات الشركات الحكومية، الفيديو المباشر، العنوان، العينة، تقرير الطرف الثالث. قائمة تحقق قابلة للطباعة.',
    },
    en: {
      title: 'How to verify a Chinese factory before you pay: 9 checks in 48 hours',
      keyword: 'verify Chinese supplier',
      brief:
        'Business licence and unified social credit code, checking the government registry, live video, address, sample, third-party report. A printable checklist.',
    },
  },
  {
    category: 'suppliers-sourcing',
    priority: 30,
    ar: {
      title: 'علي بابا أم 1688 أم وكيل توريد: أي طريق يناسب حجمك؟',
      keyword: 'الفرق بين علي بابا و 1688',
      brief:
        'مقارنة صادقة بالأسعار والمخاطر واللغة والدفع، مع أمثلة لكميات مختلفة ومتى يستحق الوكيل عمولته.',
    },
    en: {
      title: 'Alibaba, 1688 or a sourcing agent: which route fits your volume?',
      keyword: 'Alibaba vs 1688 vs sourcing agent',
      brief:
        'An honest comparison on price, risk, language and payment, with examples at different volumes and when an agent earns the commission.',
    },
  },
  {
    category: 'suppliers-sourcing',
    priority: 50,
    ar: {
      title: 'النصب في الاستيراد من الصين: 7 حيل شائعة وكيف تكشفها مبكرًا',
      keyword: 'النصب في الاستيراد من الصين',
      brief:
        'المصنع الوهمي، تغيير الحساب البنكي، العينة الذهبية، الشحن الجزئي، الفواتير المزورة. علامات الإنذار والرد على كل واحدة.',
    },
    en: {
      title: 'Import scams from China: 7 common tricks and how to spot them early',
      keyword: 'China import scams',
      brief:
        'The ghost factory, the changed bank account, the golden sample, the short shipment, forged invoices. Warning signs and the response to each.',
    },
  },
  {
    category: 'shipping-logistics',
    priority: 10,
    ar: {
      title: 'الشحن من الصين إلى السعودية: البحري مقابل الجوي بالأسعار والمدد 2026',
      keyword: 'الشحن من الصين إلى السعودية',
      brief:
        'أسعار تقديرية للحاوية 20 و40 قدمًا وللشحن الجزئي والجوي إلى الدمام وجدة والرياض، المدة، ومتى يستحق الجوي فرق السعر.',
    },
    en: {
      title:
        'Shipping from China to Saudi Arabia: sea versus air, with 2026 prices and transit times',
      keyword: 'shipping from China to Saudi Arabia',
      brief:
        'Indicative rates for 20ft and 40ft containers, LCL and air to Dammam, Jeddah and Riyadh, transit times, and when air is worth the premium.',
    },
  },
  {
    category: 'shipping-logistics',
    priority: 30,
    ar: {
      title: 'ما الفرق بين FOB و CIF و EXW عند الشراء من الصين؟ أمثلة بالأرقام',
      keyword: 'الفرق بين FOB و CIF',
      brief:
        'ثلاثة عروض أسعار للمنتج نفسه بالشروط الثلاثة، من يدفع ماذا في كل مرحلة، وأي شرط يناسب المستورد المبتدئ.',
    },
    en: {
      title: 'FOB, CIF or EXW when buying from China? Worked examples',
      keyword: 'FOB vs CIF vs EXW China',
      brief:
        'Three quotes for the same product on the three terms, who pays what at each stage, and which term suits a first-time importer.',
    },
  },
  {
    category: 'shipping-logistics',
    priority: 50,
    ar: {
      title: 'الشحن الجزئي LCL من الصين: متى يوفّر ومتى يكلّف أكثر',
      keyword: 'الشحن الجزئي من الصين',
      brief:
        'حساب نقطة التعادل بين LCL والحاوية الكاملة، رسوم الوجهة المخفية، وكيف تقلل حجم الشحنة بالتغليف.',
    },
    en: {
      title: 'LCL shipping from China: when it saves money and when it costs more',
      keyword: 'LCL shipping from China',
      brief:
        'The break-even between LCL and a full container, hidden destination charges, and how packaging reduces volume.',
    },
  },
  {
    category: 'company-setup',
    priority: 10,
    ar: {
      title: 'تكلفة تأسيس شركة في الصين للأجانب 2026: الرسوم الحقيقية سنة بعد سنة',
      keyword: 'تكلفة تأسيس شركة في الصين',
      brief:
        'رسوم التسجيل، العنوان، الحساب البنكي، المحاسبة الشهرية، التدقيق السنوي، تصريح العمل. جدول للسنة الأولى والثانية، وما الذي لا يُذكر في الإعلانات.',
    },
    en: {
      title:
        'The cost of setting up a company in China as a foreigner in 2026: real fees, year by year',
      keyword: 'cost of setting up a company in China',
      brief:
        'Registration, address, bank account, monthly bookkeeping, annual audit, work permit. A table for year one and year two, and what the adverts leave out.',
    },
  },
  {
    category: 'company-setup',
    priority: 30,
    ar: {
      title: 'WFOE أم مكتب تمثيلي أم شركة في هونغ كونغ: أي كيان يناسب المستورد العربي؟',
      keyword: 'أنواع الشركات في الصين للأجانب',
      brief:
        'مقارنة الكيانات الثلاثة في التكلفة والضرائب وإمكانية الفوترة والتصدير واستلام الأموال، مع توصية حسب الحالة.',
    },
    en: {
      title:
        'WFOE, representative office or a Hong Kong company: which entity suits an Arab importer?',
      keyword: 'WFOE vs Hong Kong company',
      brief:
        'The three entities compared on cost, tax, invoicing, exporting and receiving funds, with a recommendation by situation.',
    },
  },
  {
    category: 'company-setup',
    priority: 50,
    ar: {
      title: 'فتح حساب بنكي تجاري في الصين للشركة الأجنبية: المتطلبات والمدة والبنوك',
      keyword: 'فتح حساب بنكي في الصين للشركات',
      brief: 'لماذا يرفض البنك، المستندات، حضور المدير، البنوك الأسهل، مدة الفتح، وبديل هونغ كونغ.',
    },
    en: {
      title:
        'Opening a business bank account in China for a foreign company: requirements, timing and banks',
      keyword: 'open business bank account in China',
      brief:
        "Why banks refuse, the documents, the director's presence, the easier banks, how long it takes, and the Hong Kong alternative.",
    },
  },
  {
    category: 'trade-fairs',
    priority: 10,
    ar: {
      title: 'معرض كانتون 2026: المواعيد والمراحل والتأشيرة وكيف تستعد',
      keyword: 'معرض كانتون 2026',
      brief:
        'مواعيد الدورتين 139 و140، المراحل الثلاث وما يُعرض في كل واحدة، الدعوة والتأشيرة، الفنادق، وخطة يومية للزائر.',
    },
    en: {
      title: 'Canton Fair 2026: dates, phases, visa and how to prepare',
      keyword: 'Canton Fair 2026 dates',
      brief:
        'Dates of the 139th and 140th sessions, the three phases and what each shows, invitation and visa, hotels, and a day-by-day plan.',
    },
  },
  {
    category: 'trade-fairs',
    priority: 50,
    ar: {
      title: 'أهم المعارض التجارية في الصين 2026 حسب القطاع (غير كانتون)',
      keyword: 'المعارض التجارية في الصين 2026',
      brief:
        'تقويم المعارض المتخصصة: الإلكترونيات في شنجن، الأثاث في دونغقوان، المنسوجات في شنغهاي، الطاقة الشمسية، السيارات. لكل معرض: الموعد، المكان، لمن يناسب.',
    },
    en: {
      title: 'The most important trade fairs in China in 2026 by sector (beyond the Canton Fair)',
      keyword: 'China trade fairs 2026',
      brief:
        'A calendar of specialist fairs: electronics in Shenzhen, furniture in Dongguan, textiles in Shanghai, solar, automotive. For each: dates, venue, who it suits.',
    },
  },
  {
    category: 'quality-inspection',
    priority: 30,
    ar: {
      title: 'فحص البضاعة قبل الشحن من الصين: ماذا يشمل وكم يكلف ومتى يُطلب',
      keyword: 'فحص البضاعة قبل الشحن من الصين',
      brief:
        'أنواع الفحص (أولي، أثناء الإنتاج، نهائي، تحميل الحاوية)، معيار AQL بلغة بسيطة، التكلفة اليومية، وما يفعله المستورد بتقرير سلبي.',
    },
    en: {
      title: 'Pre-shipment inspection in China: what it covers, what it costs and when to book it',
      keyword: 'pre-shipment inspection China cost',
      brief:
        'Inspection types (initial, during production, final, container loading), AQL in plain words, the daily cost, and what to do with a failed report.',
    },
  },
  {
    category: 'ecommerce',
    priority: 30,
    ar: {
      title: 'البيع على نون وأمازون السعودية بمنتجات من الصين: الخطوات والهوامش الحقيقية',
      keyword: 'البيع على نون بمنتجات من الصين',
      brief:
        'اختيار المنتج، تكلفة الوصول، رسوم المنصة، الهامش بعد كل شيء، والعلامة الخاصة مقابل إعادة البيع.',
    },
    en: {
      title:
        'Selling on Noon and Amazon Saudi Arabia with products from China: steps and real margins',
      keyword: 'sell on Noon products from China',
      brief:
        'Product selection, landed cost, platform fees, the margin after everything, and private label versus reselling.',
    },
  },
  {
    category: 'ecommerce',
    priority: 50,
    ar: {
      title: 'العلامة التجارية الخاصة من الصين: من العينة إلى أول ألف قطعة',
      keyword: 'علامة تجارية خاصة من الصين',
      brief:
        'التعديل على المنتج، التغليف، تسجيل العلامة في الصين وبلدك، الحد الأدنى، والجدول الزمني الواقعي.',
    },
    en: {
      title: 'Private label from China: from the sample to the first thousand units',
      keyword: 'private label products from China',
      brief:
        'Modifying the product, packaging, registering the mark in China and at home, minimums, and a realistic timeline.',
    },
  },
  {
    category: 'legal-compliance',
    priority: 50,
    ar: {
      title: 'تسجيل العلامة التجارية في الصين: لماذا قبل أول طلب، وكيف، وبكم',
      keyword: 'تسجيل العلامة التجارية في الصين',
      brief: 'نظام الأسبقية في التسجيل، قصص العلامات المخطوفة، الخطوات، الفئات، التكلفة والمدة.',
    },
    en: {
      title: 'Registering a trademark in China: why before your first order, how, and for how much',
      keyword: 'register trademark in China',
      brief: 'First-to-file, stories of hijacked marks, the steps, the classes, cost and timing.',
    },
  },
  {
    category: 'business-culture',
    priority: 50,
    ar: {
      title: 'كيف تتواصل مع المورد الصيني على وي تشات: قواعد تحفظ لك السعر والوقت',
      keyword: 'التواصل مع المورد الصيني',
      brief:
        'أوقات العمل والأعياد الصينية، الترجمة، ما يُكتب وما يُقال، متابعة الإنتاج بالصور، ومتى تتصل بدلًا من الكتابة.',
    },
    en: {
      title:
        'How to communicate with a Chinese supplier on WeChat: rules that protect your price and your time',
      keyword: 'communicate with Chinese supplier WeChat',
      brief:
        'Working hours and Chinese holidays, translation, what to write versus say, following production by photo, and when to call instead of type.',
    },
  },
  {
    category: 'economy-belt-road',
    priority: 50,
    ar: {
      title: 'التجارة بين الصين والسعودية 2026: الأرقام وما يستورده الخليج فعلًا',
      keyword: 'التجارة بين الصين والسعودية',
      brief:
        'حجم التبادل، أهم السلع في الاتجاهين، أثر رؤية 2030 والحزام والطريق، وما يعنيه للمستورد الصغير.',
    },
    en: {
      title: 'China–Saudi trade in 2026: the figures and what the Gulf really imports',
      keyword: 'China Saudi Arabia trade 2026',
      brief:
        'Trade volume, the main goods in each direction, the effect of Vision 2030 and the Belt and Road, and what it means for a small importer.',
    },
  },
  {
    category: 'investment',
    priority: 50,
    ar: {
      title: 'الشراكة مع مصنع صيني بدل الاستيراد منه: نماذج التعاقد والمخاطر',
      keyword: 'شراكة مع مصنع صيني',
      brief:
        'المشروع المشترك، التوزيع الحصري، الترخيص، ما الذي يجب أن يكون في العقد، وقصص نجاح وفشل حقيقية.',
    },
    en: {
      title:
        'Partnering with a Chinese factory instead of importing from it: deal structures and risks',
      keyword: 'partner with Chinese factory',
      brief:
        'Joint venture, exclusive distribution, licensing, what the contract must say, and real successes and failures.',
    },
  },
  {
    category: 'industries',
    priority: 50,
    ar: {
      title: 'استيراد السيارات الكهربائية من الصين إلى الخليج: التكلفة والمواصفات والتحديات',
      keyword: 'استيراد السيارات الكهربائية من الصين',
      brief:
        'العلامات المتاحة، مواصفات الخليج (GSO)، الشحن، الرسوم، الضمان وقطع الغيار، ومن يناسبه هذا الاستيراد.',
    },
    en: {
      title: 'Importing electric vehicles from China to the Gulf: cost, standards and challenges',
      keyword: 'import electric cars from China to Gulf',
      brief:
        'The available brands, Gulf standards (GSO), shipping, duties, warranty and parts, and who this import suits.',
    },
  },
]
