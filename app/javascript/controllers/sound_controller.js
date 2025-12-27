import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = {
    acknowledgement: {type: String, default: "/sounds/computerbeep_8 - acknolwedgement.mp3"},
    turningOff: {type: String, default: "/sounds/computerbeep_26 - turning off.mp3"},
    taskFlash1: {type: String, default: "/sounds/computerbeep_9 - little more ack.mp3"},
    taskFlash2: {type: String, default: "/sounds/computerbeep_38 - single beep.mp3"},
    taskFlash3: {type: String, default: "/sounds/computerbeep_5 - single beep ack.mp3"}
  }

  connect() {
    this.audioContext = null
    this.buffers = {}
    this.unlocked = false

    this.soundGroups = {
      taskAck: ["taskFlash1", "taskFlash2", "taskFlash3"]
    }

    this.preloadSounds()

    // Listen for programmatic sound triggers (from turbo streams, other controllers)
    this.handleSoundEvent = (e) => this.playSound(e.detail?.name)
    document.addEventListener("sound:play", this.handleSoundEvent)
  }

  disconnect() {
    document.removeEventListener("sound:play", this.handleSoundEvent)
    if (this.audioContext) {
      this.audioContext.close()
    }
  }

  async preloadSounds() {
    const soundUrls = {
      acknowledgement: this.acknowledgementValue,
      turningOff: this.turningOffValue,
      taskFlash1: this.taskFlash1Value,
      taskFlash2: this.taskFlash2Value,
      taskFlash3: this.taskFlash3Value
    }

    // Fetch and decode all sounds
    for (const [name, url] of Object.entries(soundUrls)) {
      try {
        const response = await fetch(url)
        const arrayBuffer = await response.arrayBuffer()
        this.buffers[name] = arrayBuffer
      } catch (e) {
        console.warn(`Failed to load sound: ${name}`, e)
      }
    }
  }

  unlock() {
    if (this.unlocked) return
    this.unlocked = true

    // Create AudioContext on user gesture (required for iOS Safari)
    this.audioContext = new AudioContext()

    // Decode all buffers, exposing promise for critical sound
    const decodePromises = Object.entries(this.buffers).map(async ([name, arrayBuffer]) => {
      if (arrayBuffer instanceof ArrayBuffer) {
        try {
          const decoded = await this.audioContext.decodeAudioData(arrayBuffer.slice(0))
          this.buffers[name] = decoded
        } catch (e) {
          console.warn(`Failed to decode sound: ${name}`, e)
        }
      }
    })

    // Expose promise so other controllers can wait for sounds to be ready
    this.ready = Promise.all(decodePromises)
  }

  // Single entry point: use data-sound-name-param="soundName" in HTML
  // e.g. data-action="click->sound#play" data-sound-name-param="acknowledgement"
  play(event) {
    const name = event?.params?.name
    if (name) {
      this.playSound(name)
    }
  }

  async playSound(name) {
    if (!name || !this.audioContext) return

    if (this.ready) {
      await this.ready
    }

    const group = this.soundGroups[name]
    const soundName = group ? group[Math.floor(Math.random() * group.length)] : name
    const buffer = this.buffers[soundName]

    if (buffer instanceof AudioBuffer) {
      const source = this.audioContext.createBufferSource()
      source.buffer = buffer
      source.connect(this.audioContext.destination)
      source.start(0)

      return new Promise(resolve => {
        source.onended = resolve
      })
    }
  }
}
