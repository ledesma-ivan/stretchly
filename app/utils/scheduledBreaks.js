import EventEmitter from 'events'
import { readFileSync, writeFileSync } from 'node:fs'

const BASELINE_HOUR = 8
const WINDOW_MS = 5 * 60 * 1000 // a slot fires up to 5 min late (e.g. after resume), then is skipped

const day = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
const at = (d, hhmm) => {
  const [h, m] = hhmm.split(':').map(Number)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m)
}

// Fires a long break at fixed HH:MM times. With `anchor` on, all times shift by
// how far from 08:00 the day started (first launch today), so waking at 05:00
// moves a 12:35 slot to 09:35. State (anchor + fired slots) persists per day so
// restarts neither reset the anchor nor re-fire a slot.
class ScheduledBreaks extends EventEmitter {
  constructor (settings, stateFile) {
    super()
    this.settings = settings
    this.stateFile = stateFile
    this.timer = null
  }

  start () {
    if (this.timer) return
    this.tick()
    this.timer = setInterval(() => this.tick(), 30000)
    this.timer.unref?.()
  }

  stop () {
    clearInterval(this.timer)
    this.timer = null
  }

  _state (now) {
    let s = {}
    try { s = JSON.parse(readFileSync(this.stateFile, 'utf8')) } catch (e) {}
    if (s.date !== day(now)) s = { date: day(now), anchor: now.toISOString(), fired: [] }
    return s
  }

  _save (s) {
    try { writeFileSync(this.stateFile, JSON.stringify(s)) } catch (e) {}
  }

  tick (now = new Date()) {
    const times = this.settings.get('scheduledBreaks') || []
    if (!times.length) return
    const s = this._state(now)
    const offset = this.settings.get('scheduledBreaksAnchor')
      ? new Date(s.anchor) - at(new Date(s.anchor), `${BASELINE_HOUR}:00`)
      : 0
    for (const t of times) {
      const target = at(now, t).getTime() + offset
      const late = now.getTime() - target
      if (late >= 0 && late < WINDOW_MS && !s.fired.includes(t)) {
        s.fired.push(t)
        this.emit('scheduledBreak', t)
      }
    }
    this._save(s)
  }
}

export default ScheduledBreaks
