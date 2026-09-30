import ScheduledBreaks from '../app/utils/scheduledBreaks'
import 'chai/register-should'
import { join } from 'path'
import { tmpdir } from 'os'
import { mkdtempSync, rmSync } from 'node:fs'

describe('ScheduledBreaks', function () {
  let dir, file
  const d = (hhmm) => new Date(`2026-09-30T${hhmm}:00`)
  const settings = (o) => ({ get: (k) => o[k] })

  beforeEach(function () {
    dir = mkdtempSync(join(tmpdir(), 'stretchly-sched-'))
    file = join(dir, 'state.json')
  })
  afterEach(function () { rmSync(dir, { recursive: true, force: true }) })

  const collect = (opts, ticks) => {
    const sb = new ScheduledBreaks(settings(opts), file)
    const fired = []
    sb.on('scheduledBreak', (t) => fired.push(t))
    ticks.forEach(t => sb.tick(d(t)))
    return fired
  }

  it('fires a slot once at its time', function () {
    collect({ scheduledBreaks: ['12:35'], scheduledBreaksAnchor: false }, ['08:00', '12:34', '12:35', '12:36'])
      .should.eql(['12:35'])
  })

  it('does not fire a slot missed by more than 5 minutes', function () {
    collect({ scheduledBreaks: ['12:35'], scheduledBreaksAnchor: false }, ['08:00', '13:00'])
      .should.eql([])
  })

  it('shifts slots earlier when the day started before 08:00', function () {
    // first tick at 05:00 anchors the day: 12:35 -> 09:35
    collect({ scheduledBreaks: ['12:35'], scheduledBreaksAnchor: true }, ['05:00', '09:35', '12:35'])
      .should.eql(['12:35'])
    // and it fired at 09:35, not 12:35
  })

  it('fires at the shifted time, not the original one', function () {
    const sb = new ScheduledBreaks(settings({ scheduledBreaks: ['12:35'], scheduledBreaksAnchor: true }), file)
    const at = []
    sb.on('scheduledBreak', () => at.push(1))
    sb.tick(d('05:00'))
    sb.tick(d('09:34'))
    at.length.should.equal(0)
    sb.tick(d('09:35'))
    at.length.should.equal(1)
  })

  it('does not re-fire after a restart the same day', function () {
    collect({ scheduledBreaks: ['12:35'], scheduledBreaksAnchor: false }, ['08:00', '12:35'])
      .should.eql(['12:35'])
    collect({ scheduledBreaks: ['12:35'], scheduledBreaksAnchor: false }, ['12:36'])
      .should.eql([])
  })

  it('does nothing with no slots configured', function () {
    collect({ scheduledBreaks: [], scheduledBreaksAnchor: true }, ['08:00']).should.eql([])
  })
})
