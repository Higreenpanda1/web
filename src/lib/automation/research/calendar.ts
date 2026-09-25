/**
 * The trade calendar this audience lives by. The research job reads what is
 * coming in the next few weeks and asks for articles that arrive before the
 * event, not after it: a Canton Fair guide published on opening day is a
 * guide nobody found in time.
 *
 * Fixed dates recur every year; moving dates (lunar and Hijri) are listed for
 * the years we can see. When the last listed year passes, add the next one —
 * the job simply stops seeing that event rather than guessing.
 */
export type TradeEvent = {
  key: string
  name: string
  nameAr: string
  /** ISO date, or MM-DD for an event on the same date every year. */
  start: string
  /** Same form as start. Defaults to the start date. */
  end?: string
  /** How many weeks before the start readers begin searching. */
  leadWeeks: number
  /** What to write about it — the angle that serves an importer. */
  angle: string
}

export const TRADE_EVENTS: TradeEvent[] = [
  {
    key: 'canton-spring',
    name: 'Canton Fair, spring session (Guangzhou)',
    nameAr: 'معرض كانتون، دورة الربيع',
    start: '04-15',
    end: '05-05',
    leadWeeks: 10,
    angle:
      'invitations and visas, which phase carries which products, hotel and transport costs, how to turn a visit into orders',
  },
  {
    key: 'canton-autumn',
    name: 'Canton Fair, autumn session (Guangzhou)',
    nameAr: 'معرض كانتون، دورة الخريف',
    start: '10-15',
    end: '11-04',
    leadWeeks: 10,
    angle:
      'invitations and visas, which phase carries which products, hotel and transport costs, how to turn a visit into orders',
  },
  {
    key: 'yiwu-fair',
    name: 'Yiwu International Commodities Fair',
    nameAr: 'معرض ييوو الدولي للسلع',
    start: '10-21',
    end: '10-25',
    leadWeeks: 6,
    angle: 'small-goods sourcing, mixed containers, the Yiwu market versus 1688',
  },
  {
    key: 'ciie',
    name: 'China International Import Expo (Shanghai)',
    nameAr: 'معرض الصين الدولي للاستيراد، شنغهاي',
    start: '11-05',
    end: '11-10',
    leadWeeks: 6,
    angle: 'selling Arab products into China, exhibitor costs, the Shanghai trip',
  },
  {
    key: 'hk-electronics-spring',
    name: 'Hong Kong Electronics Fair (spring)',
    nameAr: 'معرض هونغ كونغ للإلكترونيات، الربيع',
    start: '04-13',
    end: '04-16',
    leadWeeks: 6,
    angle: 'combining Hong Kong with the Canton Fair in one trip',
  },
  {
    key: 'hk-electronics-autumn',
    name: 'Hong Kong Electronics Fair (autumn)',
    nameAr: 'معرض هونغ كونغ للإلكترونيات، الخريف',
    start: '10-13',
    end: '10-16',
    leadWeeks: 6,
    angle: 'combining Hong Kong with the Canton Fair in one trip',
  },
  {
    key: 'golden-week',
    name: 'China National Day holiday (Golden Week)',
    nameAr: 'عطلة العيد الوطني الصيني',
    start: '10-01',
    end: '10-07',
    leadWeeks: 4,
    angle: 'factories and ports close for a week; what to order and ship before it',
  },
  {
    key: 'labour-day',
    name: 'China Labour Day holiday',
    nameAr: 'عطلة عيد العمال في الصين',
    start: '05-01',
    end: '05-05',
    leadWeeks: 3,
    angle: 'a five-day production pause right after the Canton Fair',
  },
  {
    key: '618',
    name: '618 shopping festival (JD, Tmall)',
    nameAr: 'مهرجان التسوق 618',
    start: '06-18',
    leadWeeks: 4,
    angle: 'what sells in China, prices and stock behaviour, selling into China online',
  },
  {
    key: 'singles-day',
    name: 'Singles Day (11.11)',
    nameAr: 'يوم العزاب 11.11',
    start: '11-11',
    leadWeeks: 5,
    angle: 'factory capacity is booked for domestic demand; lead times stretch in October',
  },
  {
    key: 'black-friday',
    name: 'Black Friday and White Friday (Gulf e-commerce)',
    nameAr: 'الجمعة البيضاء',
    start: '11-24',
    end: '11-30',
    leadWeeks: 12,
    angle: 'stock must ship from China by early October; air versus sea for the last weeks',
  },
  {
    key: 'peak-season',
    name: 'Peak shipping season (freight rates rise)',
    nameAr: 'موسم ذروة الشحن',
    start: '08-01',
    end: '10-15',
    leadWeeks: 4,
    angle: 'container rates, booking early, LCL versus FCL, rate surcharges',
  },
  {
    key: 'year-end-rush',
    name: 'Year-end production rush before Chinese New Year',
    nameAr: 'ذروة الإنتاج قبل رأس السنة الصينية',
    start: '12-01',
    end: '01-15',
    leadWeeks: 4,
    angle: 'ordering before the factories close, deposits, the quality dip in January',
  },
  {
    key: 'saudi-national-day',
    name: 'Saudi National Day',
    nameAr: 'اليوم الوطني السعودي',
    start: '09-23',
    leadWeeks: 8,
    angle: 'promotional goods and green merchandise sourced in time',
  },
  {
    key: 'saudi-founding-day',
    name: 'Saudi Founding Day',
    nameAr: 'يوم التأسيس السعودي',
    start: '02-22',
    leadWeeks: 8,
    angle: 'promotional goods sourced in time',
  },
  {
    key: 'uae-national-day',
    name: 'UAE National Day',
    nameAr: 'اليوم الوطني الإماراتي',
    start: '12-02',
    leadWeeks: 8,
    angle: 'promotional goods sourced in time',
  },
  {
    key: 'back-to-school',
    name: 'Back to school in the Gulf',
    nameAr: 'العودة إلى المدارس',
    start: '08-20',
    end: '09-05',
    leadWeeks: 12,
    angle: 'stationery, bags, uniforms: ordering in May, SABER for children’s goods',
  },
  {
    key: 'gitex',
    name: 'GITEX Global (Dubai)',
    nameAr: 'جيتكس دبي',
    start: '10-12',
    end: '10-16',
    leadWeeks: 4,
    angle: 'Chinese tech suppliers exhibiting in the Gulf',
  },
  // Moving dates.
  { ...lunar('2026-02-17'), key: 'cny-2026' },
  { ...lunar('2027-02-06'), key: 'cny-2027' },
  { ...lunar('2028-01-26'), key: 'cny-2028' },
  { ...ramadan('2026-02-18', '2026-03-19'), key: 'ramadan-2026' },
  { ...ramadan('2027-02-08', '2027-03-09'), key: 'ramadan-2027' },
  { ...ramadan('2028-01-28', '2028-02-26'), key: 'ramadan-2028' },
  { ...adha('2026-05-27'), key: 'adha-2026' },
  { ...adha('2027-05-16'), key: 'adha-2027' },
  { ...adha('2028-05-05'), key: 'adha-2028' },
]

function lunar(date: string): Omit<TradeEvent, 'key'> {
  const start = shift(date, -10)
  const end = shift(date, 20)
  return {
    name: `Chinese New Year (${date.slice(0, 4)}) — factories closed roughly ${start} to ${end}`,
    nameAr: `رأس السنة الصينية ${date.slice(0, 4)}: المصانع مغلقة تقريبًا`,
    start,
    end,
    leadWeeks: 8,
    angle:
      'the closure calendar, ordering and paying before it, the staff turnover and quality dip after it, shipping backlog',
  }
}

function ramadan(start: string, end: string): Omit<TradeEvent, 'key'> {
  return {
    name: `Ramadan ${start.slice(0, 4)} (ends around ${end}, then Eid al-Fitr)`,
    nameAr: `رمضان ${start.slice(0, 4)} وعيد الفطر`,
    start,
    end,
    leadWeeks: 14,
    angle:
      'Ramadan and Eid stock (dates, lanterns, clothing, gifts, kitchenware) must leave China 8 to 10 weeks earlier; working hours in the Gulf',
  }
}

function adha(date: string): Omit<TradeEvent, 'key'> {
  return {
    name: `Eid al-Adha ${date.slice(0, 4)}`,
    nameAr: `عيد الأضحى ${date.slice(0, 4)}`,
    start: date,
    end: shift(date, 3),
    leadWeeks: 12,
    angle: 'seasonal goods sourced in time; Hajj-related supplies',
  }
}

function shift(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export type UpcomingEvent = TradeEvent & { startsOn: string; endsOn: string; weeksAway: number }

/**
 * Events whose "write about it now" window includes `from`: the event starts
 * within `leadWeeks` of the date, or is under way. Sorted by start date.
 */
export function upcomingEvents(from: Date = new Date(), horizonWeeks = 12): UpcomingEvent[] {
  const today = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()))
  const out: UpcomingEvent[] = []
  for (const event of TRADE_EVENTS) {
    for (const occurrence of occurrences(event, today.getUTCFullYear())) {
      const start = new Date(`${occurrence.start}T00:00:00Z`)
      const end = new Date(`${occurrence.end}T00:00:00Z`)
      const daysAway = Math.round((start.getTime() - today.getTime()) / 86_400_000)
      const lead = Math.min(event.leadWeeks, horizonWeeks) * 7
      if (daysAway > lead) continue
      if (end.getTime() < today.getTime()) continue
      out.push({
        ...event,
        startsOn: occurrence.start,
        endsOn: occurrence.end,
        weeksAway: Math.max(0, Math.round(daysAway / 7)),
      })
    }
  }
  return out.sort((a, b) => a.startsOn.localeCompare(b.startsOn))
}

function occurrences(event: TradeEvent, year: number): Array<{ start: string; end: string }> {
  if (event.start.length === 10) {
    return [{ start: event.start, end: event.end ?? event.start }]
  }
  // Recurring: this year and next, so a December lookahead sees January.
  return [year, year + 1].map((y) => {
    const start = `${y}-${event.start}`
    const endMonthDay = event.end ?? event.start
    // An end before the start month wraps into the next year (Dec → Jan).
    const wraps = endMonthDay < event.start
    const end = `${wraps ? y + 1 : y}-${endMonthDay}`
    return { start, end }
  })
}

/** The calendar as the research prompt reads it. */
export function describeUpcoming(events: UpcomingEvent[]): string {
  if (events.length === 0) return 'No trade events in the next few weeks.'
  return events
    .map(
      (event) =>
        `- ${event.name} (${event.nameAr}): ${event.startsOn}${event.endsOn !== event.startsOn ? ` to ${event.endsOn}` : ''}, ${event.weeksAway === 0 ? 'now' : `in ${event.weeksAway} week(s)`}. Angle: ${event.angle}.`,
    )
    .join('\n')
}
