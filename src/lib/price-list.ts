/**
 * HiGP's service price list (edition October 2026), the one the owner
 * approved for quotes and invoices. Whole yuan.
 *
 * The same lines are the products in HubSpot (SKU = `sku`), so a quote
 * printed from the site and a deal in HubSpot say the same thing. Change a
 * price here only from a list the owner has approved, and change the HubSpot
 * product in the same go. The company-formation estimate keeps its own table
 * in ./quote.ts; the prices there must match these.
 *
 * HubSpot also has "Work Permit Government Fees" (HGP-WP-GOVFEE, 400). It is
 * left out here on purpose: the client pays those fees to the government
 * directly, never to us, so they are not on our quotes or invoices.
 *
 * `passThrough`: money that is not ours — the registered address is rent paid
 * on to the landlord. The owner's rule (26 Oct 2026): it is paid in full with
 * the first payment, never split and never discounted.
 */

export type PriceListItem = {
  sku: string
  en: string
  zh: string
  price: number
  yearly: boolean
  passThrough: boolean
}

const item = (
  sku: string,
  en: string,
  zh: string,
  price: number,
  extra: Partial<Pick<PriceListItem, 'yearly' | 'passThrough'>> = {},
): PriceListItem => ({ sku, en, zh, price, yearly: false, passThrough: false, ...extra })

export const PRICE_LIST: readonly PriceListItem[] = [
  item('HGP-REG-INPERSON', 'Company Registration – In person', '公司注册 – 现场办理', 7200),
  item('HGP-REG-REMOTE', 'Company Registration – Remote', '公司注册 – 远程办理', 8200),
  item(
    'HGP-ADDR-BASIC',
    'Registered Address – no work permit',
    '注册地址 – 不可办理工作许可',
    3200,
    { yearly: true, passThrough: true },
  ),
  item(
    'HGP-ADDR-WP',
    'Registered Address – work-permit eligible',
    '注册地址 – 可办理工作许可',
    12000,
    { yearly: true, passThrough: true },
  ),
  item('HGP-ACCT', 'Accounting & Tax Filing', '会计及纳税申报', 3800, { yearly: true }),
  item('HGP-WP', 'Work Permit & Residence Permit', '工作许可和居留许可', 7600),
  item('HGP-BANK-CN', 'Bank Account – Mainland', '银行开户 – 内地', 1400),
  item('HGP-BANK-HK', 'Bank Account – Hong Kong', '银行开户 – 香港', 1700),
  item('HGP-ALIPAY', 'Alipay Business Account', '支付宝企业账户', 1700),
  item('HGP-WECHAT', 'WeChat Pay Business Account', '微信支付企业账户', 2100),
  item('HGP-LICENCE-CHG', 'Business Licence Changes', '营业执照变更', 1800),
  item('HGP-HK-CO', 'Hong Kong Company Registration', '香港公司注册', 8900),
  item('HGP-TM', 'Trademark Registration (per class)', '商标注册（每类）', 1900),
  item('HGP-INVITE', 'Business Invitation Letter', '商务邀请函', 600),
  item('HGP-VISA-M', 'Business Visa (M)', '商务签证（M）', 4000),
  item('HGP-VISA-FAMILY', 'Family Reunion Visa', '家庭团聚签证', 1500),
  item('HGP-STORE-TEMU', 'Store Setup – TEMU', '店铺开设 – TEMU', 2800),
  item('HGP-STORE-AMAZON', 'Store Setup – Amazon', '店铺开设 – 亚马逊', 2800),
  item('HGP-STORE-ALIEXPRESS', 'Store Setup – AliExpress', '店铺开设 – 速卖通', 3300),
  item('HGP-STORE-ALIBABA', 'Store Setup – Alibaba', '店铺开设 – 阿里巴巴', 3300),
]

export function priceListItem(sku: string | null | undefined): PriceListItem | null {
  return PRICE_LIST.find((entry) => entry.sku === sku) ?? null
}
