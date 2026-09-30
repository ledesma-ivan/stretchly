import { appendFileSync, readFileSync } from 'node:fs'

const day = (d) => {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// Append-only JSON Lines: one event per line, so a crash can't corrupt history.
// action: 'started' | 'completed' | 'postponed' | 'skipped'
class BreakStats {
  constructor (file) {
    this.file = file
  }

  record (type, action, now = new Date()) {
    try {
      appendFileSync(this.file, JSON.stringify({ date: day(now), time: now.toISOString(), type, action }) + '\n')
    } catch (e) {
      // stats must never break the break scheduler
    }
  }

  events () {
    try {
      return readFileSync(this.file, 'utf8').split('\n').filter(Boolean).map(JSON.parse)
    } catch (e) {
      return []
    }
  }

  // Consecutive days with at least one completed break. Today not counting yet
  // doesn't reset the streak: it starts from yesterday until you complete one.
  streak (now = new Date()) {
    const days = new Set(this.events().filter(e => e.action === 'completed').map(e => e.date))
    const d = new Date(now)
    if (!days.has(day(d))) d.setDate(d.getDate() - 1)
    let n = 0
    while (days.has(day(d))) {
      n++
      d.setDate(d.getDate() - 1)
    }
    return n
  }

  summary (date) {
    const out = { started: 0, completed: 0, postponed: 0, skipped: 0 }
    for (const e of this.events()) if (e.date === date) out[e.action]++
    return out
  }

  // Interval multiplier from the completion rate of the last 7 days: 1 if you
  // complete >= 60%, 1.1 if >= 40%, else 1.2. Under 5 breaks started = too
  // little data, no change.
  adherenceFactor (now = new Date()) {
    const from = new Date(now)
    from.setDate(from.getDate() - 7)
    const recent = this.events().filter(e => e.date >= day(from))
    const started = recent.filter(e => e.action === 'started').length
    if (started < 5) return 1
    const rate = recent.filter(e => e.action === 'completed').length / started
    return rate >= 0.6 ? 1 : rate >= 0.4 ? 1.1 : 1.2
  }

  yesterday (now = new Date()) {
    const d = new Date(now)
    d.setDate(d.getDate() - 1)
    return this.summary(day(d))
  }
}

export default BreakStats
