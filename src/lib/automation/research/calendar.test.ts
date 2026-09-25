import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { TRADE_EVENTS, describeUpcoming, upcomingEvents } from './calendar.ts'

describe('upcomingEvents', () => {
  it('sees the autumn Canton Fair from late September and not the spring one', () => {
    const events = upcomingEvents(new Date('2026-09-25T00:00:00Z'))
    const keys = events.map((event) => event.key)
    assert.ok(keys.includes('canton-autumn'))
    assert.ok(!keys.includes('canton-spring'))
    const canton = events.find((event) => event.key === 'canton-autumn')!
    assert.equal(canton.startsOn, '2026-10-15')
    assert.equal(canton.weeksAway, 3)
  })
  it('includes an event that is under way', () => {
    const events = upcomingEvents(new Date('2026-10-03T00:00:00Z'))
    assert.ok(events.some((event) => event.key === 'golden-week' && event.weeksAway === 0))
  })
  it('wraps December events into January', () => {
    const events = upcomingEvents(new Date('2026-12-20T00:00:00Z'))
    const rush = events.find((event) => event.key === 'year-end-rush')!
    assert.equal(rush.startsOn, '2026-12-01')
    assert.equal(rush.endsOn, '2027-01-15')
  })
  it('finds moving dates such as Chinese New Year and Ramadan with their lead time', () => {
    const events = upcomingEvents(new Date('2026-12-28T00:00:00Z'))
    assert.ok(events.some((event) => event.key === 'cny-2027'))
    assert.ok(events.some((event) => event.key === 'ramadan-2027'))
    assert.ok(!events.some((event) => event.key === 'cny-2028'))
  })
  it('drops what has passed', () => {
    const events = upcomingEvents(new Date('2026-06-01T00:00:00Z'))
    assert.ok(!events.some((event) => event.key === 'cny-2026'))
    assert.ok(!events.some((event) => event.key === 'ramadan-2026'))
  })
  it('sorts by start date and describes itself', () => {
    const events = upcomingEvents(new Date('2026-09-25T00:00:00Z'))
    const starts = events.map((event) => event.startsOn)
    assert.deepEqual(starts, [...starts].sort())
    const text = describeUpcoming(events)
    assert.match(text, /Canton Fair, autumn session/)
    assert.match(text, /in 3 week\(s\)/)
  })
  it('every event has a lead time and an angle', () => {
    for (const event of TRADE_EVENTS) {
      assert.ok(event.leadWeeks > 0, event.key)
      assert.ok(event.angle.length > 10, event.key)
      assert.match(event.start, /^(\d{4}-)?\d{2}-\d{2}$/, event.key)
    }
  })
})
