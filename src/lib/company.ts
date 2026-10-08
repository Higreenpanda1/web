/**
 * The legal facts behind the brand, shown on /licences: the two licensed
 * companies, the accounting licence and the Shenzhen headquarters.
 *
 * Kept in code rather than the CMS because these change once in years and
 * must never be edited by accident. Licence scans live in public/licences/;
 * an entry whose `image` is null shows "available on request" instead.
 * Fields left null are simply not rendered — fill them from the documents,
 * never from guesswork.
 */

export type Licence = {
  /** Anchor id on the page, also the translation key under `licences.items`. */
  id: 'guangzhou' | 'nasher' | 'accounting'
  /** The registered name exactly as printed on the licence. */
  legalName: string
  /** Chinese registered name, as printed. */
  chineseName: string | null
  /** Unified social credit code (统一社会信用代码) or licence number. */
  number: string | null
  /** Path under /public, e.g. '/licences/guangzhou.webp'. */
  image: string | null
}

export const LICENCES: Licence[] = [
  {
    id: 'guangzhou',
    legalName: 'Guangzhou HIGP International Business Services Co., Ltd',
    chineseName: null,
    number: null,
    image: null,
  },
  {
    id: 'nasher',
    legalName: 'Nasher',
    chineseName: '那社尔电子商贸（上海）有限公司',
    number: '91310120MADC3UP68E',
    image: null,
  },
  {
    id: 'accounting',
    legalName: 'Amber',
    chineseName: null,
    number: null,
    image: null,
  },
]

export const HEADQUARTERS = {
  /** Street address in English, one line per array entry. Null until confirmed. */
  addressEn: [
    '41F-35, Tower A, KK100',
    '5016 Shennan East Road, Luohu District',
    'Shenzhen, China',
  ] as string[] | null,
  /** The same address in Chinese, for taxi drivers and couriers. */
  addressZh: '深圳市罗湖区深南东路5016号京基一百大厦A座41楼35' as string | null,
  /** A map link (Amap, Baidu or Google). */
  mapUrl:
    'https://www.google.com/maps/search/?api=1&query=KK100+Tower+A+5016+Shennan+East+Road+Shenzhen' as
      | string
      | null,
}
