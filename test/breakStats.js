import BreakStats from '../app/utils/breakStats'
import 'chai/register-should'
import { join } from 'path'
import { tmpdir } from 'os'
import { mkdtempSync, rmSync } from 'node:fs'

describe('BreakStats', function () {
  let dir, stats
  const at = (s) => new Date(s + 'T12:00:00')

  beforeEach(function () {
    dir = mkdtempSync(join(tmpdir(), 'stretchly-stats-'))
    stats = new BreakStats(join(dir, 'stats.jsonl'))
  })
  afterEach(function () { rmSync(dir, { recursive: true, force: true }) })

  it('returns empty data without a file', function () {
    stats.streak(at('2026-09-30')).should.equal(0)
    stats.yesterday(at('2026-09-30')).should.eql({ started: 0, completed: 0, postponed: 0, skipped: 0 })
  })

  it('counts consecutive days with a completed break', function () {
    stats.record('mini', 'completed', at('2026-09-28'))
    stats.record('mini', 'completed', at('2026-09-29'))
    stats.record('long', 'completed', at('2026-09-30'))
    stats.streak(at('2026-09-30')).should.equal(3)
  })

  it('keeps the streak alive when today has no completed break yet', function () {
    stats.record('mini', 'completed', at('2026-09-28'))
    stats.record('mini', 'completed', at('2026-09-29'))
    stats.streak(at('2026-09-30')).should.equal(2)
  })

  it('breaks the streak on a gap and ignores non-completed events', function () {
    stats.record('mini', 'completed', at('2026-09-27'))
    stats.record('mini', 'postponed', at('2026-09-29'))
    stats.streak(at('2026-09-30')).should.equal(0)
  })

  describe('adherenceFactor', function () {
    const run = (started, completed) => {
      for (let i = 0; i < started; i++) stats.record('mini', 'started', at('2026-09-29'))
      for (let i = 0; i < completed; i++) stats.record('mini', 'completed', at('2026-09-29'))
      return stats.adherenceFactor(at('2026-09-30'))
    }

    it('does not change anything with too little data', function () {
      run(4, 0).should.equal(1)
    })
    it('keeps 1 at 60% or more', function () {
      run(10, 6).should.equal(1)
    })
    it('stretches 10% between 40% and 60%', function () {
      run(10, 4).should.equal(1.1)
    })
    it('stretches 20% below 40%', function () {
      run(10, 3).should.equal(1.2)
    })
    it('ignores events older than 7 days', function () {
      for (let i = 0; i < 10; i++) stats.record('mini', 'started', at('2026-09-01'))
      stats.adherenceFactor(at('2026-09-30')).should.equal(1)
    })
  })

  it('summarizes yesterday by action', function () {
    stats.record('mini', 'started', at('2026-09-29'))
    stats.record('mini', 'completed', at('2026-09-29'))
    stats.record('long', 'postponed', at('2026-09-29'))
    stats.record('mini', 'skipped', at('2026-09-30'))
    stats.yesterday(at('2026-09-30')).should.eql({ started: 1, completed: 1, postponed: 1, skipped: 0 })
  })
})
