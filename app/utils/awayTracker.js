// Samples system idle time while a break runs, so we can tell if you really
// stepped away or just sat there until the timer ended.
class AwayTracker {
  constructor (getIdleSeconds, sampleMs = 5000) {
    this.getIdleSeconds = getIdleSeconds
    this.sampleMs = sampleMs
    this.peak = 0
    this.timer = null
  }

  start () {
    this.stop()
    this.peak = 0
    this.timer = setInterval(() => {
      this.peak = Math.max(this.peak, this.getIdleSeconds())
    }, this.sampleMs)
  }

  // Safe to call repeatedly; the peak stays readable until the next start().
  stop () {
    clearInterval(this.timer)
    this.timer = null
    return this.peak
  }

  // True if idle time reached `ratio` of the break duration (ms).
  wasAway (durationMs, ratio = 0.6) {
    return this.stop() * 1000 >= durationMs * ratio
  }
}

export default AwayTracker
