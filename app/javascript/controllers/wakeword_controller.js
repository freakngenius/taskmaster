import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["trigger"]
  static values = {
    wakeword: {type: String, default: "master"},
    enabled: {type: Boolean, default: true}
  }

  connect() {
    this.recognition = null
    this.isListening = false
    this.masterString = ""
    this.audioErrorCount = 0
    this.agentActive = false

    // Don't stop/start speech recognition when agent starts/stops - iOS plays loud sounds
    // Instead, just ignore wakeword detections while agent is active
    this.handleAgentStopped = () => { this.agentActive = false }
    this.element.addEventListener("agent:stopped", this.handleAgentStopped)

    this.handleAgentStarting = () => { this.agentActive = true }
    this.element.addEventListener("agent:starting", this.handleAgentStarting)

    this.handleMicActivated = () => {
      if (this.enabledValue && this.checkSpeechAPIAvailable()) {
        this.initializeRecognition()
        this.startListening()
      }
    }
    this.element.addEventListener("mic:activated", this.handleMicActivated)
  }

  disconnect() {
    this.element.removeEventListener("agent:stopped", this.handleAgentStopped)
    this.element.removeEventListener("agent:starting", this.handleAgentStarting)
    this.element.removeEventListener("mic:activated", this.handleMicActivated)
    this.stopListening()
  }

  checkSpeechAPIAvailable() {
    return "webkitSpeechRecognition" in window || "SpeechRecognition" in window
  }

  initializeRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    this.recognition = new SpeechRecognition()

    this.recognition.continuous = true
    this.recognition.interimResults = true
    this.recognition.lang = "en-US"
    this.wasNoSpeech = false

    this.recognition.onstart = () => {
      console.log(this.wasNoSpeech ? "[Wakeword] Listening restarted" : "[Wakeword] Listening started")
      this.wasNoSpeech = false
    }

    this.recognition.onaudiostart = () => {
      this.audioErrorCount = 0
    }

    this.recognition.onresult = (event) => {
      let incomingString = ""
      for (let i = event.resultIndex; i < event.results.length; i++) {
        incomingString += event.results[i][0].transcript
      }

      if (this.masterString === "") {
        this.masterString = incomingString
      } else {
        const masterLower = this.masterString.toLowerCase()
        const incomingLower = incomingString.toLowerCase()
        if (incomingLower.startsWith(masterLower)) {
          this.masterString = incomingString
        }
      }

      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          console.log(`[Wakeword] Heard: "${this.masterString}"`)
          this.checkForWakeword(this.masterString)
          this.masterString = ""
        }
      }
    }

    this.recognition.onerror = (event) => {
      if (event.error === "no-speech") {
        this.wasNoSpeech = true
      } else {
        console.log("[Wakeword] Error:", event.error)
        if (event.error === "audio-capture") {
          this.audioErrorCount++
          if (this.audioErrorCount >= 3) {
            console.error("[Wakeword] Microphone access failed repeatedly")
            this.isListening = false
          }
        }
      }
    }

    this.recognition.onend = () => {
      if (this.isListening && this.audioErrorCount < 3) {
        try {
          this.recognition.start()
        } catch (e) {
          console.log("[Wakeword] Failed to restart:", e.message)
        }
      }
    }
  }

  checkForWakeword(text) {
    // Ignore wakeword while agent is active (prevents agent's voice from re-triggering)
    if (this.agentActive) return

    const normalizedText = text.toLowerCase().replace(/\s/g, "")
    const normalizedWakeword = this.wakewordValue.toLowerCase().replace(/\s/g, "")
    if (normalizedText.includes(normalizedWakeword)) {
      console.log(`[Wakeword] Detected: "${this.wakewordValue}"`)
      this.triggerStart()
    }
  }

  triggerStart() {
    // Don't stop listening - just set agentActive flag to ignore further detections
    // Stopping/starting speech recognition on iOS plays loud system sounds
    this.agentActive = true

    if (this.hasTriggerTarget) {
      this.triggerTarget.click()
    } else {
      this.element.dispatchEvent(new CustomEvent("wakeword:detected", {bubbles: true}))
    }
  }

  startListening() {
    if (this.isListening || !this.recognition) return

    try {
      this.audioErrorCount = 0
      this.masterString = ""
      this.recognition.start()
      this.isListening = true
    } catch (e) {
      console.log("[Wakeword] Failed to start:", e.message)
    }
  }

  stopListening() {
    if (!this.recognition) return

    this.isListening = false
    try {
      this.recognition.stop()
    } catch (e) {
      // Ignore
    }
  }

  start() {
    if (!this.recognition && this.checkSpeechAPIAvailable()) {
      this.initializeRecognition()
    }
    this.startListening()
  }

  stop() {
    this.stopListening()
  }
}
