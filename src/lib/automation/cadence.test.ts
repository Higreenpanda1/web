import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { autopublishConfig, draftWeekdays, researchWeekday } from './cadence.ts'

describe('draftWeekdays', () => {
  it('spreads the week’s drafts over Gulf working days', () => {
    assert.deepEqual(draftWeekdays({}), [0, 2, 4])
    assert.deepEqual(draftWeekdays({ DRAFTS_PER_WEEK: '5' }), [0, 1, 2, 3, 4])
    assert.deepEqual(draftWeekdays({ DRAFTS_PER_WEEK: '7' }), [0, 1, 2, 3, 4, 5, 6])
    assert.deepEqual(draftWeekdays({ DRAFTS_PER_WEEK: '0' }), [])
  })
  it('honours an explicit list and the old single-day setting', () => {
    assert.deepEqual(draftWeekdays({ DRAFT_WEEKDAYS: '1, 3,5' }), [1, 3, 5])
    assert.deepEqual(draftWeekdays({ DRAFTS_PER_WEEK: '1', DRAFT_WEEKDAY: '4' }), [4])
    assert.deepEqual(draftWeekdays({ DRAFT_WEEKDAYS: 'x' }), [0, 2, 4])
  })
})

describe('researchWeekday and autopublish', () => {
  it('defaults to Saturday and off', () => {
    assert.equal(researchWeekday({}), 6)
    assert.equal(researchWeekday({ RESEARCH_WEEKDAY: '0' }), 0)
    assert.deepEqual(autopublishConfig({}), { enabled: false, delayHours: 48 })
    assert.deepEqual(
      autopublishConfig({ BLOG_AUTOPUBLISH: 'true', BLOG_PUBLISH_DELAY_HOURS: '12' }),
      {
        enabled: true,
        delayHours: 12,
      },
    )
  })
})
