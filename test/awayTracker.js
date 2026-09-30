import AwayTracker from '../app/utils/awayTracker'
import { vi } from 'vitest'
import 'chai/register-should'

describe('AwayTracker', function () {
  beforeEach(function () { vi.useFakeTimers() })
  afterEach(function () { vi.useRealTimers() })

  const run = (idleByTick, durationMs) => {
    let i = 0
    const tracker = new AwayTracker(() => idleByTick[Math.min(i++, idleByTick.length - 1)], 1000)
    tracker.start()
    vi.advanceTimersByTime(idleByTick.length * 1000)
    return tracker.wasAway(durationMs)
  }

  it('is away when idle reaches 60% of the break', function () {
    run([0, 10, 20, 30, 40], 60000).should.equal(true) // peak 40s >= 36s
  })

  it('is not away when the user kept using the computer', function () {
    run([0, 2, 0, 5, 1], 60000).should.equal(false)
  })

  it('keeps the peak after stop and resets on start', function () {
    const tracker = new AwayTracker(() => 50, 1000)
    tracker.start()
    vi.advanceTimersByTime(2000)
    tracker.stop().should.equal(50)
    tracker.stop().should.equal(50)
    tracker.start()
    tracker.peak.should.equal(0)
    tracker.stop()
  })
})
