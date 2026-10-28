import './companies.css'

import type { ReactNode } from 'react'

/**
 * Tags for `t.rich` in the `companies` messages: `<hl>` is the course page's
 * gold highlighter under a key phrase, `<name>` a company name in gold with
 * a light passing over it. Both are styled in companies.css.
 */
export const companyTags = {
  hl: (chunks: ReactNode) => <mark className="co-hl">{chunks}</mark>,
  name: (chunks: ReactNode) => <span className="co-name">{chunks}</span>,
}
