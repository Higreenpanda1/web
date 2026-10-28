import type { ApplicationType } from '@/lib/catalogue'

/**
 * The application forms, as data.
 *
 * Nine forms, described once here and rendered by one component
 * (src/components/forms/ApplicationForm.tsx), validated by one schema builder
 * (src/forms/schema.ts) and emailed by one notification builder. Adding a
 * question is one line in this file plus two lines in the message catalogues;
 * nothing else changes. The old site's seventeen hand-built forms drifted
 * apart within months — different labels for the same question, a phone
 * field that was free text on one form and validated on another. This is the
 * fix for that.
 *
 * Every string a visitor sees comes from src/messages/*.json:
 *   apply.steps.<step>            the step title
 *   apply.fields.<name>           the field label
 *   apply.fields.<name>Hint       the help text, when `hint` is set
 *   apply.options.<name>.<value>  each option of a select / radio / checkboxes
 * A test (src/forms/definitions.test.ts) walks every form and fails if a key
 * is missing from either language, so a form cannot ship half-translated.
 *
 */

export type FieldKind =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'select'
  | 'checkboxes'
  | 'country'
  | 'tel'
  | 'email'
  | 'url'
  | 'file'

export type FieldDef = {
  name: string
  kind: FieldKind
  required?: boolean
  /** Option codes for select / checkboxes. Labels come from the catalogue. */
  options?: readonly string[]
  /** There is an `apply.fields.<name>Hint` message to show under the label. */
  hint?: boolean
  /** Half-width on wide screens; full otherwise. */
  width?: 'half' | 'full'
  rows?: number
  max?: number
  min?: number
  /**
   * Only shown — and only required — when another field in the same form has
   * one of these values. The server applies the same rule, so a hidden field
   * is never demanded and never stored.
   */
  showIf?: { field: string; in: readonly string[] }
  /**
   * For `tel` fields that only take one country's numbers: the visitor types
   * the national number and the server adds the country code.
   */
  country?: 'CN'
  /**
   * For `file` fields: accepted MIME types. Files are checked again on the
   * server by their first bytes, never trusted from the browser, and kept in
   * a private folder — see src/lib/documents.ts.
   */
  accept?: readonly string[]
  /**
   * For `file` fields: how many files the one input takes. Without it the
   * input takes a single file.
   */
  multiple?: number
  /** For `select` fields: the option chosen before the visitor touches it. */
  initial?: string
  /**
   * For `file` fields: catalogue keys under `apply.errors.*` to say instead
   * of the general ones, so photos and spreadsheets each get their own words.
   */
  errorKeys?: Partial<Record<FileErrorKey, string>>
}

export type FileErrorKey = 'required' | 'fileType' | 'fileTooBig' | 'tooManyFiles'

/** The error key to report for a file field, when the field names its own. */
export function errorKey(field: FieldDef, key: FileErrorKey): string {
  return field.errorKeys?.[key] ?? key
}

/**
 * A step whose fields describe one item of a list the visitor can grow — the
 * products of one product request. In the form each item's fields are posted
 * as `<name>.<key>.<field>` plus one `<name>.index` entry per item, in order;
 * in `details` the items become an array of objects under `<name>`.
 */
export type RepeatDef = {
  name: string
  max: number
  /** Names an item's uploaded files: `<reference>-<item><n>-<field>-<k>.jpg`. */
  item: string
}

export type StepDef = { key: string; fields: readonly FieldDef[]; repeat?: RepeatDef }

export type FormDef = {
  type: ApplicationType
  steps: readonly StepDef[]
  /** One line for the admin list and the email subject, from the answers. */
  headline: (details: Record<string, unknown>) => string
}

const YES_NO = ['yes', 'no'] as const

/** Every form opens the same way. Same names, same validation, everywhere. */
export const CONTACT_STEP: StepDef = {
  key: 'contact',
  fields: [
    { name: 'name', kind: 'text', required: true, width: 'half', max: 120 },
    { name: 'country', kind: 'country', required: true, width: 'half' },
    { name: 'whatsapp', kind: 'tel', required: true, width: 'half', hint: true },
    // Required: the client is sent a written confirmation of the request.
    { name: 'email', kind: 'email', required: true, width: 'half', hint: true },
  ],
}

/** Photos of an ID page or a stamp: what phones produce, plus PDF scans. */
export const DOCUMENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const

/** A portrait photo: images only, never a PDF. */
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

/**
 * A product list or a specification sheet: Excel (new and old) or PDF. The
 * extensions are for the file picker, which on some phones knows no MIME
 * type for a spreadsheet; the server decides by the file's bytes.
 */
export const SHEET_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/pdf',
  '.xlsx',
  '.xls',
  '.pdf',
] as const

const WORK = { field: 'visaType', in: ['work'] } as const

const WORK_PERMIT_DOCUMENTS: readonly FieldDef[] = [
  {
    name: 'passport',
    kind: 'file',
    required: true,
    hint: true,
    accept: DOCUMENT_TYPES,
    showIf: WORK,
  },
  {
    name: 'personalPhoto',
    kind: 'file',
    required: true,
    hint: true,
    accept: PHOTO_TYPES,
    showIf: WORK,
  },
  {
    name: 'degreeCertificate',
    kind: 'file',
    required: true,
    hint: true,
    accept: DOCUMENT_TYPES,
    showIf: WORK,
  },
  {
    name: 'experienceCertificate',
    kind: 'file',
    required: true,
    hint: true,
    accept: DOCUMENT_TYPES,
    showIf: WORK,
  },
  {
    name: 'policeClearance',
    kind: 'file',
    required: true,
    hint: true,
    accept: DOCUMENT_TYPES,
    showIf: WORK,
  },
  { name: 'medicalCertificate', kind: 'file', hint: true, accept: DOCUMENT_TYPES, showIf: WORK },
  {
    name: 'companyLicence',
    kind: 'file',
    hint: true,
    accept: DOCUMENT_TYPES,
    showIf: { field: 'hasChineseCompany', in: ['yes'] },
  },
]

const NOTES: FieldDef = { name: 'notes', kind: 'textarea', rows: 4, max: 4000 }

const str = (details: Record<string, unknown>, key: string) =>
  typeof details[key] === 'string' ? (details[key] as string) : ''

export const FORMS: Record<ApplicationType, FormDef> = {
  consultation: {
    type: 'consultation',
    steps: [
      CONTACT_STEP,
      {
        key: 'topic',
        fields: [
          {
            name: 'topic',
            kind: 'select',
            required: true,
            width: 'half',
            options: ['import', 'company', 'ecommerce', 'banking', 'visas', 'trademark', 'other'],
          },
          {
            name: 'stage',
            kind: 'select',
            required: true,
            width: 'half',
            options: ['idea', 'planning', 'started', 'operating'],
          },
          {
            name: 'duration',
            kind: 'select',
            required: true,
            options: ['min30', 'min60'],
          },
          { name: 'goals', kind: 'textarea', required: true, rows: 5, hint: true, max: 4000 },
        ],
      },
      {
        key: 'schedule',
        fields: [
          {
            name: 'preferredDays',
            kind: 'checkboxes',
            required: true,
            options: ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'],
          },
          {
            name: 'preferredTime',
            kind: 'select',
            required: true,
            width: 'half',
            hint: true,
            options: ['morning', 'afternoon', 'evening'],
          },
          { name: 'timezone', kind: 'text', width: 'half', hint: true, max: 80 },
          {
            name: 'channel',
            kind: 'select',
            required: true,
            width: 'half',
            options: ['whatsapp', 'video', 'phone'],
          },
          {
            name: 'language',
            kind: 'select',
            required: true,
            width: 'half',
            options: ['ar', 'en'],
          },
          NOTES,
        ],
      },
    ],
    headline: (d) => [str(d, 'topic'), str(d, 'stage')].filter(Boolean).join(' · '),
  },

  'company-registration': {
    type: 'company-registration',
    steps: [
      CONTACT_STEP,
      {
        key: 'legalRep',
        fields: [
          { name: 'fullName', kind: 'text', required: true, hint: true, max: 120 },
          {
            name: 'gender',
            kind: 'select',
            required: true,
            width: 'half',
            options: ['male', 'female'],
          },
          { name: 'dateOfBirth', kind: 'date', required: true, width: 'half' },
          { name: 'nationality', kind: 'country', required: true, width: 'half' },
          { name: 'residenceCountry', kind: 'country', required: true, width: 'half' },
          {
            name: 'chinesePhone',
            kind: 'select',
            required: true,
            width: 'half',
            options: YES_NO,
          },
          {
            name: 'chinesePhoneNumber',
            kind: 'tel',
            country: 'CN',
            required: true,
            width: 'half',
            hint: true,
            showIf: { field: 'chinesePhone', in: ['yes'] },
          },
          { name: 'inChinaNow', kind: 'select', required: true, width: 'half', options: YES_NO },
        ],
      },
      {
        key: 'documents',
        fields: [
          { name: 'passport', kind: 'file', required: true, hint: true, accept: DOCUMENT_TYPES },
          { name: 'entryStamp', kind: 'file', hint: true, accept: DOCUMENT_TYPES },
        ],
      },
      {
        key: 'company',
        fields: [
          {
            name: 'city',
            kind: 'select',
            required: true,
            width: 'half',
            options: ['shenzhen', 'guangzhou', 'shanghai', 'yiwu', 'hangzhou', 'nanjing', 'other'],
          },
          {
            name: 'cityOther',
            kind: 'text',
            required: true,
            width: 'half',
            max: 80,
            showIf: { field: 'city', in: ['other'] },
          },
          { name: 'companyNames', kind: 'textarea', required: true, rows: 3, hint: true, max: 600 },
          {
            name: 'businessScope',
            kind: 'textarea',
            required: true,
            rows: 3,
            hint: true,
            max: 1000,
          },
          {
            name: 'registeredCapital',
            kind: 'number',
            required: true,
            width: 'half',
            hint: true,
            min: 0,
            max: 100_000_000,
          },
          {
            name: 'capitalCurrency',
            kind: 'select',
            required: true,
            width: 'half',
            options: ['usd', 'cny'],
          },
          {
            name: 'addressOption',
            kind: 'select',
            required: true,
            width: 'half',
            hint: true,
            options: ['own-office', 'virtual-work-visa', 'virtual-basic', 'need-advice'],
          },
          {
            name: 'needResidence',
            kind: 'select',
            required: true,
            width: 'half',
            hint: true,
            options: YES_NO,
          },
        ],
      },
      {
        key: 'shareholders',
        fields: [
          {
            name: 'ownership',
            kind: 'select',
            required: true,
            width: 'half',
            options: ['sole', 'partners'],
          },
          {
            name: 'shareholders',
            kind: 'textarea',
            required: true,
            rows: 4,
            hint: true,
            max: 2000,
            showIf: { field: 'ownership', in: ['partners'] },
          },
          {
            name: 'decisionMaker',
            kind: 'text',
            required: true,
            hint: true,
            max: 120,
            showIf: { field: 'ownership', in: ['partners'] },
          },
        ],
      },
      {
        key: 'extras',
        fields: [
          {
            name: 'extras',
            kind: 'checkboxes',
            hint: true,
            options: [
              'bank-account',
              'bank-registrant',
              'alipay-wechat',
              'accounting',
              'financial-officer',
              'trademark',
              'work-visa',
            ],
          },
          NOTES,
        ],
      },
    ],
    headline: (d) =>
      [str(d, 'city') === 'other' ? str(d, 'cityOther') : str(d, 'city'), str(d, 'ownership')]
        .filter(Boolean)
        .join(' · '),
  },

  'visa-invitation': {
    type: 'visa-invitation',
    steps: [
      CONTACT_STEP,
      {
        key: 'applicant',
        fields: [
          { name: 'familyName', kind: 'text', required: true, width: 'half', hint: true, max: 80 },
          { name: 'givenNames', kind: 'text', required: true, width: 'half', max: 80 },
          {
            name: 'gender',
            kind: 'select',
            required: true,
            width: 'half',
            options: ['male', 'female'],
          },
          { name: 'dateOfBirth', kind: 'date', required: true, width: 'half' },
          { name: 'nationality', kind: 'country', required: true, width: 'half' },
          {
            name: 'passportNumber',
            kind: 'text',
            required: true,
            width: 'half',
            hint: true,
            max: 20,
          },
          { name: 'passportExpiry', kind: 'date', required: true, width: 'half' },
          { name: 'applyCity', kind: 'text', required: true, width: 'half', hint: true, max: 80 },
          { name: 'occupation', kind: 'text', required: true, width: 'half', max: 80 },
          { name: 'employer', kind: 'text', required: true, width: 'half', max: 120 },
        ],
      },
      {
        key: 'trip',
        fields: [
          {
            name: 'purpose',
            kind: 'select',
            required: true,
            width: 'half',
            options: ['factory-visits', 'trade-fair', 'both', 'other'],
          },
          {
            name: 'speed',
            kind: 'select',
            required: true,
            width: 'half',
            hint: true,
            options: ['normal', 'express'],
          },
          { name: 'arrivalDate', kind: 'date', required: true, width: 'half' },
          { name: 'departureDate', kind: 'date', required: true, width: 'half' },
          { name: 'cities', kind: 'text', required: true, hint: true, max: 200 },
          {
            name: 'visitedChina',
            kind: 'select',
            required: true,
            width: 'half',
            options: YES_NO,
          },
          {
            name: 'previousVisa',
            kind: 'select',
            required: true,
            width: 'half',
            options: YES_NO,
          },
          NOTES,
        ],
      },
    ],
    headline: (d) => [str(d, 'purpose'), str(d, 'arrivalDate')].filter(Boolean).join(' · '),
  },

  visa: {
    type: 'visa',
    steps: [
      CONTACT_STEP,
      {
        key: 'visa',
        fields: [
          {
            name: 'visaType',
            kind: 'select',
            required: true,
            width: 'half',
            options: ['business', 'work', 'family'],
          },
          {
            name: 'stayLength',
            kind: 'select',
            required: true,
            width: 'half',
            options: ['under-1m', '1-3m', '3-12m', 'over-1y'],
            // The authorities set how long a residence permit lasts, not us,
            // so the work permit does not ask.
            showIf: { field: 'visaType', in: ['business', 'family'] },
          },
          { name: 'nationality', kind: 'country', required: true, width: 'half' },
          { name: 'residenceCountry', kind: 'country', required: true, width: 'half' },
          { name: 'passportExpiry', kind: 'date', required: true, width: 'half', hint: true },
          { name: 'plannedArrival', kind: 'date', width: 'half' },
        ],
      },
      {
        key: 'background',
        fields: [
          {
            name: 'purpose',
            kind: 'textarea',
            required: true,
            rows: 3,
            hint: true,
            max: 2000,
            showIf: { field: 'visaType', in: ['business'] },
          },
          {
            name: 'hasChineseCompany',
            kind: 'select',
            required: true,
            width: 'half',
            hint: true,
            options: YES_NO,
            showIf: { field: 'visaType', in: ['work'] },
          },
          {
            name: 'companyName',
            kind: 'text',
            width: 'half',
            max: 160,
            showIf: { field: 'visaType', in: ['work'] },
          },
          {
            name: 'education',
            kind: 'select',
            required: true,
            width: 'half',
            hint: true,
            options: ['high-school', 'diploma', 'bachelor', 'master', 'phd'],
            showIf: { field: 'visaType', in: ['work'] },
          },
          {
            name: 'experienceYears',
            kind: 'number',
            required: true,
            width: 'half',
            hint: true,
            min: 0,
            max: 60,
            showIf: { field: 'visaType', in: ['work'] },
          },
          {
            name: 'chinesePhone',
            kind: 'select',
            required: true,
            width: 'half',
            options: YES_NO,
            showIf: { field: 'visaType', in: ['work'] },
          },
          {
            name: 'chinesePhoneNumber',
            kind: 'tel',
            country: 'CN',
            required: true,
            width: 'half',
            hint: true,
            showIf: { field: 'chinesePhone', in: ['yes'] },
          },
          // The work permit file, uploaded by the client. Required ones follow
          // the price list's "Required Documents for the Work Permit".
          ...WORK_PERMIT_DOCUMENTS,
          {
            name: 'familyMember',
            kind: 'text',
            required: true,
            hint: true,
            max: 200,
            showIf: { field: 'visaType', in: ['family'] },
          },
          NOTES,
        ],
      },
    ],
    headline: (d) => [str(d, 'visaType'), str(d, 'stayLength')].filter(Boolean).join(' · '),
  },

  'product-search': {
    type: 'product-search',
    steps: [
      CONTACT_STEP,
      {
        // Until October 2026 this was one product per request, with its
        // answers at the top level of `details` (productName, quantity...).
        // Rows from then still look like that; newer ones carry `products`.
        key: 'products',
        repeat: { name: 'products', max: 10, item: 'product' },
        fields: [
          { name: 'productName', kind: 'text', required: true, hint: true, max: 160 },
          {
            // Required since October 2026: a factory cannot quote without
            // seeing the product.
            name: 'photos',
            kind: 'file',
            required: true,
            hint: true,
            accept: PHOTO_TYPES,
            multiple: 5,
            errorKeys: { required: 'photosRequired', fileType: 'photoType' },
          },
          {
            name: 'productFiles',
            kind: 'file',
            hint: true,
            accept: SHEET_TYPES,
            multiple: 3,
            errorKeys: {
              fileType: 'sheetType',
              fileTooBig: 'sheetTooBig',
              tooManyFiles: 'tooManySheets',
            },
          },
          { name: 'productLink', kind: 'url', hint: true, max: 500 },
          {
            name: 'quantity',
            kind: 'number',
            required: true,
            width: 'half',
            min: 1,
            max: 10_000_000,
          },
          {
            name: 'unit',
            kind: 'select',
            required: true,
            width: 'half',
            options: ['pieces', 'sets', 'pairs', 'cartons', 'metres', 'kg'],
            initial: 'pieces',
          },
          {
            name: 'targetPrice',
            kind: 'number',
            width: 'half',
            hint: true,
            min: 0,
            max: 10_000_000,
          },
          {
            name: 'priceCurrency',
            kind: 'select',
            width: 'half',
            options: ['usd', 'cny', 'sar', 'aed'],
            initial: 'usd',
          },
          { name: 'sizes', kind: 'textarea', rows: 2, hint: true, max: 1000 },
          { name: 'colours', kind: 'textarea', rows: 2, hint: true, max: 1000 },
          { name: 'specs', kind: 'textarea', rows: 3, hint: true, max: 3000 },
        ],
      },
      {
        key: 'delivery',
        fields: [
          // For the proforma invoice: the bank matches the payer to its name.
          { name: 'companyName', kind: 'text', width: 'half', hint: true, max: 160 },
          { name: 'companyAddress', kind: 'text', width: 'half', max: 300 },
          { name: 'destinationCountry', kind: 'country', required: true, width: 'half' },
          {
            name: 'timeline',
            kind: 'select',
            required: true,
            width: 'half',
            options: ['asap', '1-3m', '3-6m', 'exploring'],
          },
          NOTES,
        ],
      },
    ],
    headline: (d) => {
      const products = Array.isArray(d.products) ? (d.products as Record<string, unknown>[]) : []
      const first = products[0] ?? d
      const line = [str(first, 'productName'), first.quantity ? `× ${String(first.quantity)}` : '']
        .filter(Boolean)
        .join(' ')
      return products.length > 1 ? `${line} +${products.length - 1}` : line
    },
  },

  'shipping-quote': {
    type: 'shipping-quote',
    steps: [
      CONTACT_STEP,
      {
        key: 'cargo',
        fields: [
          { name: 'productType', kind: 'text', required: true, width: 'half', max: 160 },
          { name: 'originCity', kind: 'text', required: true, width: 'half', hint: true, max: 80 },
          { name: 'destinationCountry', kind: 'country', required: true, width: 'half' },
          { name: 'destinationCity', kind: 'text', required: true, width: 'half', max: 80 },
          {
            name: 'quantity',
            kind: 'number',
            required: true,
            width: 'half',
            min: 1,
            max: 10_000_000,
          },
          { name: 'cartons', kind: 'number', width: 'half', min: 0, max: 1_000_000 },
          {
            name: 'weightKg',
            kind: 'number',
            required: true,
            width: 'half',
            hint: true,
            min: 0,
            max: 10_000_000,
          },
          { name: 'volumeCbm', kind: 'number', width: 'half', hint: true, min: 0, max: 100_000 },
          {
            name: 'packaging',
            kind: 'select',
            required: true,
            width: 'half',
            options: ['cartons', 'pallets', 'bags', 'other'],
          },
          { name: 'readyDate', kind: 'date', width: 'half', hint: true },
        ],
      },
      {
        key: 'service',
        fields: [
          {
            name: 'mode',
            kind: 'select',
            required: true,
            width: 'half',
            options: ['sea', 'air', 'express', 'unsure'],
          },
          {
            name: 'delivery',
            kind: 'select',
            required: true,
            width: 'half',
            options: ['door-to-door', 'port-to-port', 'door-to-port'],
          },
          {
            name: 'customs',
            kind: 'select',
            required: true,
            options: ['include', 'own-agent', 'unsure'],
          },
          NOTES,
        ],
      },
    ],
    headline: (d) =>
      [str(d, 'productType'), str(d, 'destinationCountry'), str(d, 'mode')]
        .filter(Boolean)
        .join(' · '),
  },

  'account-opening': {
    type: 'account-opening',
    steps: [
      CONTACT_STEP,
      {
        key: 'account',
        fields: [
          {
            name: 'accountType',
            kind: 'select',
            required: true,
            options: ['china-bank', 'hk-bank', 'alipay', 'wechat-pay'],
          },
          {
            name: 'hasChineseCompany',
            kind: 'select',
            required: true,
            width: 'half',
            hint: true,
            options: ['yes', 'hk-company', 'no'],
          },
          {
            name: 'legalRepInChina',
            kind: 'select',
            required: true,
            width: 'half',
            hint: true,
            options: YES_NO,
          },
          {
            name: 'companyName',
            kind: 'text',
            required: true,
            width: 'half',
            max: 160,
            showIf: { field: 'hasChineseCompany', in: ['yes', 'hk-company'] },
          },
          {
            name: 'companyCity',
            kind: 'text',
            required: true,
            width: 'half',
            max: 80,
            showIf: { field: 'hasChineseCompany', in: ['yes', 'hk-company'] },
          },
          { name: 'mainProducts', kind: 'text', required: true, max: 200 },
          {
            name: 'tradingCountries',
            kind: 'text',
            required: true,
            width: 'half',
            hint: true,
            max: 200,
          },
          {
            name: 'monthlyVolume',
            kind: 'select',
            required: true,
            width: 'half',
            hint: true,
            options: ['under-10k', '10k-50k', '50k-200k', 'over-200k'],
          },
          NOTES,
        ],
      },
    ],
    headline: (d) =>
      [str(d, 'accountType'), str(d, 'companyName') || str(d, 'hasChineseCompany')]
        .filter(Boolean)
        .join(' · '),
  },

  'store-setup': {
    type: 'store-setup',
    steps: [
      CONTACT_STEP,
      {
        key: 'store',
        fields: [
          {
            name: 'platform',
            kind: 'select',
            required: true,
            width: 'half',
            options: ['temu', 'amazon', 'aliexpress', 'alibaba', 'other'],
          },
          {
            name: 'hasChineseCompany',
            kind: 'select',
            required: true,
            width: 'half',
            hint: true,
            options: YES_NO,
          },
          {
            name: 'companyName',
            kind: 'text',
            required: true,
            max: 160,
            showIf: { field: 'hasChineseCompany', in: ['yes'] },
          },
          {
            name: 'hasAlipayBusiness',
            kind: 'select',
            required: true,
            width: 'half',
            hint: true,
            options: YES_NO,
            showIf: { field: 'platform', in: ['aliexpress'] },
          },
          { name: 'category', kind: 'text', required: true, width: 'half', hint: true, max: 120 },
          {
            name: 'targetMarkets',
            kind: 'text',
            required: true,
            width: 'half',
            hint: true,
            max: 200,
          },
          {
            name: 'firstProducts',
            kind: 'textarea',
            required: true,
            rows: 3,
            hint: true,
            max: 2000,
          },
          NOTES,
        ],
      },
    ],
    headline: (d) => [str(d, 'platform'), str(d, 'category')].filter(Boolean).join(' · '),
  },

  trademark: {
    type: 'trademark',
    steps: [
      CONTACT_STEP,
      {
        key: 'brand',
        fields: [
          { name: 'brandName', kind: 'text', required: true, width: 'half', max: 120 },
          { name: 'brandNameChinese', kind: 'text', width: 'half', hint: true, max: 60 },
          { name: 'hasLogo', kind: 'select', required: true, width: 'half', options: YES_NO },
          {
            name: 'applicantType',
            kind: 'select',
            required: true,
            width: 'half',
            options: ['individual', 'company'],
          },
          { name: 'applicantCountry', kind: 'country', required: true, width: 'half' },
          { name: 'classes', kind: 'number', width: 'half', hint: true, min: 1, max: 45 },
          { name: 'products', kind: 'textarea', required: true, rows: 3, hint: true, max: 2000 },
          {
            name: 'existingRegistration',
            kind: 'select',
            required: true,
            hint: true,
            options: YES_NO,
          },
          NOTES,
        ],
      },
    ],
    headline: (d) => [str(d, 'brandName'), str(d, 'applicantType')].filter(Boolean).join(' · '),
  },
}

/** Every field in a form, in order, contact step included. */
/** Every field of the form, the fields of a repeated step included once. */
export function allFields(def: FormDef): FieldDef[] {
  return def.steps.flatMap((step) => [...step.fields])
}

/** The fields answered once per form: everything outside a repeated step. */
export function singleFields(def: FormDef): FieldDef[] {
  return def.steps.flatMap((step) => (step.repeat ? [] : [...step.fields]))
}

/** How a repeated item's field is named in the form: `products.3.quantity`. */
export function itemFieldName(repeat: RepeatDef, key: string, field: string): string {
  return `${repeat.name}.${key}.${field}`
}
