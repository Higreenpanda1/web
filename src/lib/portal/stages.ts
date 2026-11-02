/**
 * What a client sees for a deal's stage, as plain data with no I/O so it can
 * be tested. The client never sees the HubSpot stage names: those are the
 * team's working steps in English and Chinese, and several of them mean one
 * thing to the client ("Registered Address" and "Application Submitted" are
 * both "submitted to the authorities"). Wording approved by the owner on
 * 26 October 2026; the labels themselves are in src/messages (portal.steps).
 */

export type Track = 'higp' | 'nasher' | 'renewal'

export type Step =
  | 'received'
  | 'quote'
  | 'payment'
  | 'documents'
  | 'submitted'
  | 'established'
  | 'contract'
  | 'deposit'
  | 'production'
  | 'testing'
  | 'balance'
  | 'shipped'
  | 'active'
  | 'due'
  | 'invoiced'
  | 'renewed'
  | 'completed'

/** A request that stopped: "Not Completed", "Nasher · Lost", "Renewal · Churned". */
export type Stopped = 'onHold' | 'ended'

type StageInfo = { track: Track | null; step: Step } | { track: Track; stopped: Stopped }

/**
 * Every stage of the services pipeline (portal 247444202, pipeline "default").
 * `track: null` marks the first stages every request passes through, whatever
 * company it is for: a product request also starts at "New Inquiry".
 */
export const STAGES: Record<string, StageInfo> = {
  '4392706760': { track: null, step: 'received' }, // New Inquiry
  '4392706761': { track: null, step: 'received' }, // Consultation
  '4392706762': { track: null, step: 'quote' }, // Quote Sent
  '4392706763': { track: 'higp', step: 'payment' }, // Deposit Paid
  '4392706764': { track: 'higp', step: 'documents' }, // Collecting Documents
  '4392706765': { track: 'higp', step: 'submitted' }, // Registered Address
  '4392706766': { track: 'higp', step: 'submitted' }, // Application Submitted
  '4392706767': { track: 'higp', step: 'established' }, // Company Established
  '4392706768': { track: 'higp', step: 'established' }, // Tax Account
  '4392706769': { track: 'higp', step: 'established' }, // Bank Account
  '4392706770': { track: 'higp', step: 'completed' }, // Company Ready
  '4392706771': { track: 'higp', stopped: 'onHold' }, // Not Completed
  '4394109642': { track: 'nasher', step: 'contract' }, // Contract Received
  '4394109643': { track: 'nasher', step: 'contract' }, // Contract Stamped & Returned
  '4394109644': { track: 'nasher', step: 'deposit' }, // 30% Deposit Paid
  '4394109645': { track: 'nasher', step: 'production' }, // In Production
  '4394109646': { track: 'nasher', step: 'testing' }, // Training & Testing
  '4394109647': { track: 'nasher', step: 'balance' }, // 70% Balance Paid
  '4394109648': { track: 'nasher', step: 'shipped' }, // Shipped
  '4394109649': { track: 'nasher', step: 'completed' }, // Completed
  '4394109650': { track: 'nasher', stopped: 'onHold' }, // Lost
  '4398430915': { track: 'renewal', step: 'active' }, // Active Service
  '4398430916': { track: 'renewal', step: 'due' }, // Annual Report Due
  '4398430917': { track: 'renewal', step: 'due' }, // Renewal Due
  '4398430918': { track: 'renewal', step: 'invoiced' }, // Invoiced
  '4398430919': { track: 'renewal', step: 'renewed' }, // Renewed
  '4398430920': { track: 'renewal', stopped: 'ended' }, // Churned
}

/** Services whose last steps are a company being registered, then its tax and bank. */
const COMPANY_SERVICES = new Set(['company_registration', 'hk_company'])

export function stepsFor(track: Track, service: string | null): Step[] {
  if (track === 'nasher') {
    return [
      'received',
      'quote',
      'contract',
      'deposit',
      'production',
      'testing',
      'balance',
      'shipped',
      'completed',
    ]
  }
  if (track === 'renewal') return ['active', 'due', 'invoiced', 'renewed']
  // A visa or a bank account is never "registered as a company"; the step
  // would only confuse, so those requests go from submitted to completed.
  return service && COMPANY_SERVICES.has(service)
    ? ['received', 'quote', 'payment', 'documents', 'submitted', 'established', 'completed']
    : ['received', 'quote', 'payment', 'documents', 'submitted', 'completed']
}

export type Progress = {
  track: Track
  steps: Step[]
  /** Index into `steps` of where the request is now; every earlier step is done. */
  current: number
  stopped: Stopped | null
  /** Completed, renewed, or stopped: the request is no longer "current". */
  closed: boolean
}

/**
 * Where a request is, from its deal's stage. `fallbackTrack` decides the track
 * while the deal is still in the stages every request shares: Nasher for a
 * product or shipping request, HiGP otherwise.
 */
export function progressFor(
  stageId: string | null,
  fallbackTrack: Track,
  service: string | null,
): Progress {
  const info = stageId ? STAGES[stageId] : undefined
  const track = info?.track ?? fallbackTrack
  const steps = stepsFor(track, service)

  if (!info) return { track, steps, current: 0, stopped: null, closed: false }

  if ('stopped' in info) {
    return { track, steps, current: 0, stopped: info.stopped, closed: true }
  }

  // "Company established" on a service without that step counts as submitted.
  const step = steps.includes(info.step) ? info.step : 'submitted'
  const current = Math.max(0, steps.indexOf(step))
  const last = steps[steps.length - 1]
  return { track, steps, current, stopped: null, closed: step === last }
}

/**
 * The site's own status, for a request whose deal HubSpot could not tell us
 * about (HubSpot down, or the request never reached it).
 */
export function progressFromSiteStatus(
  status: string | null | undefined,
  track: Track,
  service: string | null,
): Progress {
  const steps = stepsFor(track, service)
  if (status === 'completed') {
    return { track, steps, current: steps.length - 1, stopped: null, closed: true }
  }
  if (status === 'lost') return { track, steps, current: 0, stopped: 'onHold', closed: true }
  const documents = steps.indexOf('documents')
  const current = status === 'documents' && documents >= 0 ? documents : 0
  return { track, steps, current, stopped: null, closed: false }
}

/** The Nasher application types; everything else is a HiGP service. */
export function trackForType(type: string): Track {
  return type === 'product-search' || type === 'shipping-quote' ? 'nasher' : 'higp'
}

/** A renewal deal is named "Work & Residence Permit Renewal …" or "… Annual Renewal …". */
export function renewalKind(dealName: string): 'annual' | 'permit' {
  return /work|permit|工作许可/i.test(dealName) ? 'permit' : 'annual'
}

/** The reference a hand-made deal carries in its name, e.g. "HGP-2026-0005". */
export function referenceIn(dealName: string): string | null {
  return dealName.match(/\b[A-Z]{2,4}-\d{4}-\d{3,6}\b/)?.[0] ?? null
}

/**
 * Whether a deal at this stage belongs to a client who has paid us, which is
 * when the portal opens their account by itself: from "Deposit Paid" on for
 * a HiGP service, from the 30% deposit on for a Nasher order, and any live
 * renewal (a renewal is only ever opened for a client who paid before).
 * Stopped deals, and the stages every request shares before payment, are not.
 */
export function isPaidStage(stageId: string | null | undefined): boolean {
  const info = stageId ? STAGES[stageId] : undefined
  if (!info || !info.track || 'stopped' in info) return false
  if (info.track === 'renewal') return true
  const steps = stepsFor(info.track, null)
  const from = steps.indexOf(info.track === 'nasher' ? 'deposit' : 'payment')
  const at = steps.indexOf(info.step === 'established' ? 'submitted' : info.step)
  return at >= from
}
