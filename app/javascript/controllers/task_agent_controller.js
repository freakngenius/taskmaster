import { Controller } from "@hotwired/stimulus"
import { Room, RoomEvent, Track } from "livekit-client"

export default class extends Controller {
  static targets = ["startCircle", "waveformContainer", "waveformCanvas", "tutorialHeader", "tutorialList", "activateLink", "activateSpinner", "activateDenied", "activateSilence", "content", "heading"]
  static values = { freshUser: Boolean }

  connect() {
    this.room = null
    this.audioContext = null
    this.micAnalyser = null
    this.agentAnalyser = null
    this.animationId = null
    this.resizeObserver = null
    this.pageRevealed = false
    this.isThinking = false
    this.thinkingStartTime = 0
    this.inactivityTimeout = null
    this.INACTIVITY_TIMEOUT_MS = 3 * 60 * 1000 // 3 minutes

    // Debug: click heading to toggle thinking animation
    this.headingTarget.addEventListener("click", () => this.toggleThinking())
  }

  resetInactivityTimeout() {
    if (this.inactivityTimeout) {
      clearTimeout(this.inactivityTimeout)
    }
    this.inactivityTimeout = setTimeout(() => {
      console.log("[Inactivity] Timeout reached, disconnecting...")
      this.stopAgent()
    }, this.INACTIVITY_TIMEOUT_MS)
  }

  clearInactivityTimeout() {
    if (this.inactivityTimeout) {
      clearTimeout(this.inactivityTimeout)
      this.inactivityTimeout = null
    }
  }

  toggleThinking() {
    this.isThinking = !this.isThinking
    if (this.isThinking) {
      this.thinkingStartTime = performance.now()
    }
    console.log("[Debug] Thinking:", this.isThinking)
  }

  activateMic() {
    this.activateLinkTarget.classList.add("hidden")
    this.activateSpinnerTarget.classList.add("visible")

    this.preloadAgent()

    navigator.mediaDevices.getUserMedia({audio: true})
      .then(stream => {
        this.verifyMicAudio(stream)
      })
      .catch(error => {
        this.activateSpinnerTarget.classList.remove("visible")
        if (error.name === "NotAllowedError") {
          this.activateDeniedTarget.classList.add("visible")
        } else {
          this.revealPage()
        }
      })
  }

  preloadAgent() {
    const baseUrl = window.location.origin.includes("localhost")
      ? "https://tunnel.keithschacht.com"
      : window.location.origin

    this.agentConfig = {
      instructions: `You are named Task Master, a personal assistant who helps manage a task list. You are warm but professional and straight to the point.

NEVER use bullets in your response. NEVER make lists. NEVER write long, complex, compound sentences.
Don't repeat yourself or rephrase statements. ALWAYS use simple words and short sentences.
Write as you would speak. Remember, you are a teacher talking to an advanced student who wants short back-and-forths.
Even single word responses are sufficient, if that answers the question accurately.

Keep in mind that the client is talking to you over voice. Everything you say will be spoken aloud using
text-to-speech so never make lists or use emojis. You ARE having a voice conversation - you hear their
speech (transcribed to text) and they hear your text (spoken via TTS). If asked "can you hear me?", say
yes because you effectively can. Never break the voice conversation illusion.

When the client asks a question, answer it succinctly. But BEFORE you reply, consider
whether the question is highly ambiguous. If it is, ask a clarifying question first. But only do this when
the question really was unclear. Don't try to keep the conversation flowing if the client seems done.

You have the ability to manage your clients task list (aka todo list). When they ask you to do task related things, be INCREDIBLY
succinct in your responses since they're watching it happen. If they ask you to add something, update, delete, just a single word
response is generally best, e.g. "Added.", "Updated.", "Deleted.", "Done.", "Changed.", etc.

If the user randomly tells you they DID something (past tense) that's their way of asking you to mark that task as done (provided there is a task that matches it). If the user randomly tells you they WANT TO DO or NEED to do something or PLAN to do something, that's their way of asking you to create a task.

If the user randomly tells you something is the most important, or top priority, or they need to do it next, that's their way of asking you to reorder it to the top of the list.

You don't need to say, "Added, anything else?" nor say "Deleted, what's next?" It's actually more helpful to be INCREDIBLY SUCCINCT
without those questions tacked on. In other cases it's okay to do that, just not for task-related requests.

EVERY TIME that the user refers to a task by position (e.g. "second task on list") always do a get_all_tasks before proceeding. Assume
any fully returned list of tasks in your conversation history is already out of date since the user is updating directly on screen.
${this.freshUserValue ? `
LASTLY, the user is trying you for the VERY FIRST TIME. Immediately after you execute your very first tool call (most likely it will be adding a task) you should acknowledge and then give this exact preamble, word-for-word: "See how I did that for you? Now you should say 'clear the list' and then try adding three real tasks you need to get done. Just talk naturally, I can modify, reorder, and mark tasks complete. I can also undo any mistakes. When you're done, ask me to stop listening. Go ahead!" AND THEN, after this they're going to add three tasks. After you add the third one give this additional preamble, word-for-word: "Now you've got it! Try using this as your task list for a day or two. The tasks save in your browser and you can click "copy list" to export."
` : ''}`,

      greeting_instructions: `Greet by saying: "Hey, Task Master here." and NOTHING else`,

      tts: {
        model: "elevenlabs/eleven_flash_v2_5",
        voice: "cgSgspJ2msm6clMCkdW9",
        language: "en-US"
      },

      tools: [
        {
          type: "server",
          name: "get_all_tasks",
          description: "Get all tasks from the user's task list. Returns an array of tasks with their details.",
          url: `${baseUrl}/api/tasks`,
          method: "GET",
          args: {}
        },
        {
          type: "server",
          name: "create_task",
          description: "Create a new task in the user's task list. If user says they need to do something, that means they want it added as a task.",
          url: `${baseUrl}/api/tasks`,
          method: "POST",
          args: {
            title: "The title of the task to create, capitalize the first letter"
          }
        },
        {
          type: "server",
          name: "update_task",
          description: "Update an existing task title or mark it as completed/incomplete. If the user tells you they did something, that means they want you to mark it completed.",
          url: `${baseUrl}/api/tasks`,
          method: "PATCH",
          args: {
            id: "(required) The ID of the task to update",
            title: "(optional) New title for the task, capitalize the first letter",
            completed: "(optional) Set to true to mark complete, false to mark incomplete"
          }
        },
        {
          type: "server",
          name: "delete_task",
          description: "Permanently delete a task. This action cannot be undone.",
          url: `${baseUrl}/api/tasks`,
          method: "DELETE",
          args: {
            id: "(required) The ID of the task to delete"
          }
        },
        {
          type: "server",
          name: "reorder_task",
          description: "Move a task to a new position in the list. Use positive numbers for absolute position (1 = first), or negative numbers to count from the end (-1 = last, -2 = second to last).",
          url: `${baseUrl}/api/reorder_task`,
          method: "PATCH",
          args: {
            id: "(required) The ID of the task to move",
            position: "(required) The new position: positive for absolute (1 = first), negative to count from end (-1 = last)"
          }
        },
        {
          type: "server",
          name: "clear_list",
          description: "Delete all visible (non-completed) tasks from the list. Use when the user wants to clear, empty, or delete everything from their list.",
          url: `${baseUrl}/api/clear_list`,
          method: "DELETE",
          args: {}
        },
        {
          type: "client",
          name: "stop_conversation",
          description: "End the voice conversation. Use this when the user indicates they want you to stop listening, says goodbye, says 'shut up', DO NOT use this when they say they're done with a task, use update_task for that."
        }
      ]
    }

    this.preloadedRoom = new Room({
      adaptiveStream: true,
      dynacast: true
    })

    this.tokenPromise = fetch("/api/livekit", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({agentConfig: this.agentConfig})
    }).then(async response => {
      const data = await response.json()
      if (!response.ok || data.error) {
        throw new Error(data.error_message || data.error || `Token fetch failed: ${response.status}`)
      }
      return data
    })
  }

  verifyMicAudio(stream) {
    const audioContext = new AudioContext()
    const source = audioContext.createMediaStreamSource(stream)
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)

    const timeDomainData = new Uint8Array(analyser.fftSize)
    let consecutiveFlatFrames = 0
    const flatFramesForMuted = 60 // ~1 second of perfectly flat = muted
    let mutedWarningShown = false

    const cleanup = () => {
      stream.getTracks().forEach(track => track.stop())
      audioContext.close()
      this.activateSpinnerTarget.classList.remove("visible")
      this.activateSilenceTarget.classList.remove("visible")
    }

    const checkAudio = async () => {
      // Check time-domain: working mic has tiny electronic noise, muted is exactly 128
      analyser.getByteTimeDomainData(timeDomainData)
      let maxDeviation = 0
      for (let i = 0; i < timeDomainData.length; i++) {
        const deviation = Math.abs(timeDomainData[i] - 128)
        if (deviation > maxDeviation) maxDeviation = deviation
      }

      if (maxDeviation > 0) {
        // Mic is working - wait for sounds to decode before revealing
        const soundController = this.application.getControllerForElementAndIdentifier(this.element, "sound")
        if (soundController?.ready) {
          await soundController.ready
        }
        cleanup()
        this.revealPage({animate: true})
        return
      }

      // Perfectly flat signal - likely muted
      consecutiveFlatFrames++

      if (!mutedWarningShown && consecutiveFlatFrames >= flatFramesForMuted) {
        // Show muted warning but keep waiting for them to fix it
        this.activateSilenceTarget.classList.add("visible")
        mutedWarningShown = true
      }

      // Keep checking until they unmute
      requestAnimationFrame(checkAudio)
    }

    checkAudio()
  }

  revealPage({animate = true} = {}) {
    if (this.pageRevealed) return
    this.pageRevealed = true

    this.activateLinkTarget.classList.add("hidden")
    this.shrinkHeading(animate)
    this.startCircleTarget.classList.add("fade-in")
    this.startCircleTarget.offsetHeight
    this.startCircleTarget.classList.remove("pre-activation")
    this.contentTarget.classList.remove("pre-activation")
    this.element.dispatchEvent(new CustomEvent("mic:activated", {bubbles: false}))
    if (animate) {
      setTimeout(() => this.startTutorialTyping(), 2000)
    }
  }

  shrinkHeading(animate = true) {
    const heading = this.headingTarget

    // Already shrunk via server-side class, nothing to do
    if (heading.classList.contains("heading-shrunk")) return

    const fitTextController = this.application.getControllerForElementAndIdentifier(heading, "fit-text")
    if (fitTextController) {
      fitTextController.disconnect()
    }

    if (animate) {
      const rect = heading.getBoundingClientRect()
      heading.style.position = "fixed"
      heading.style.top = rect.top + "px"
      heading.style.left = rect.left + "px"
      heading.style.margin = "0"
      heading.style.zIndex = "100"
      heading.style.whiteSpace = "nowrap"
      heading.offsetHeight

      heading.style.transition = "top 0.23s cubic-bezier(0.5, 0, 0.75, 0), left 0.23s cubic-bezier(0.5, 0, 0.75, 0), transform 0.23s cubic-bezier(0.5, 0, 0.75, 0)"
      heading.style.transformOrigin = "top left"
      heading.style.top = "10px"
      heading.style.left = "10px"
      heading.style.transform = "scale(0.15)"

      // After animation completes, switch from transform to responsive font-size
      heading.addEventListener("transitionend", () => {
        heading.style.transition = ""
        heading.style.transform = ""
        heading.style.transformOrigin = ""
        heading.style.fontSize = "clamp(18px, calc(3.3px + 2.3vw), 24px)"
        heading.classList.add("heading-shrunk")
      }, {once: true})
    } else {
      heading.style.position = "fixed"
      heading.style.top = "10px"
      heading.style.left = "10px"
      heading.style.margin = "0"
      heading.style.zIndex = "100"
      heading.style.fontSize = "clamp(18px, calc(3.3px + 2.3vw), 24px)"
      heading.style.whiteSpace = "nowrap"
    }
  }

  startTutorialTyping() {
    if (!this.hasTutorialHeaderTarget) return

    const header = this.tutorialHeaderTarget
    const text = header.dataset.text
    let index = 0

    header.innerHTML = '<span class="cursor"></span>'
    header.classList.add("typing")

    const typeChar = () => {
      if (index < text.length) {
        const char = text[index]
        const cursor = header.querySelector(".cursor")
        header.insertBefore(document.createTextNode(char), cursor)
        index++

        const delay = 45 + Math.random() * 60
        setTimeout(typeChar, delay)
      } else {
        const cursor = header.querySelector(".cursor")
        setTimeout(() => cursor?.remove(), 1500)
        this.revealTutorialItems()
      }
    }

    typeChar()
  }

  revealTutorialItems() {
    if (!this.hasTutorialListTarget) return

    setTimeout(() => {
      this.revealTutorialItem(0)
    }, 500)
  }

  revealTutorialItem(index) {
    if (!this.hasTutorialListTarget) return

    const items = this.tutorialListTarget.querySelectorAll("li")
    if (index < items.length) {
      items[index].classList.add("revealing")
      if (index === 1) {
        items[index].classList.add("glowing")
      }
    }
  }

  collapseTutorialItem(index) {
    if (!this.hasTutorialListTarget) return

    const items = this.tutorialListTarget.querySelectorAll("li")
    if (index < items.length) {
      const item = items[index]
      item.style.maxHeight = item.offsetHeight + "px"
      item.offsetHeight
      item.classList.add("collapsing")
    }
  }

  revealAllRemainingTutorialItems() {
    if (!this.hasTutorialListTarget) return

    const items = this.tutorialListTarget.querySelectorAll("li")
    items.forEach((item, index) => {
      if (index > 1 && !item.classList.contains("revealing")) {
        item.classList.add("revealing")
      }
    })
  }

  listenForFirstTurboStream() {
    this.turboStreamHandler = () => {
      this.collapseTutorialItem(1)
      this.revealAllRemainingTutorialItems()
      document.removeEventListener("turbo:before-stream-render", this.turboStreamHandler)
      this.turboStreamHandler = null
    }
    document.addEventListener("turbo:before-stream-render", this.turboStreamHandler)
  }

  hideTutorial() {
    const columnRight = this.element.querySelector(".column-right")
    if (columnRight) {
      columnRight.style.maxHeight = columnRight.offsetHeight + "px"
      columnRight.offsetHeight
      columnRight.classList.add("fading-out")
      columnRight.style.maxHeight = "0"
    }
  }

  disconnect() {
    this.clearInactivityTimeout()
    if (this.room) {
      this.room.disconnect()
      this.room = null
    }
    if (this.turboStreamHandler) {
      document.removeEventListener("turbo:before-stream-render", this.turboStreamHandler)
      this.turboStreamHandler = null
    }
    this.hideWaveform()
  }

  async startAgent() {
    if (this.room) return

    // Notify wakeword to stop listening (prevents agent's own voice from re-triggering)
    this.element.dispatchEvent(new CustomEvent("agent:starting", {bubbles: false}))

    // Reset to base state and force reflow
    this.startCircleTarget.classList.remove("shrinking", "stretching")
    void this.startCircleTarget.offsetHeight

    // Add shrinking class and wait for width transition via Web Animations API
    this.startCircleTarget.classList.add("shrinking")
    const animations = this.startCircleTarget.getAnimations()
    const widthTransition = animations.find(a => a.transitionProperty === "width")
    const shrinkComplete = widthTransition ? widthTransition.finished : Promise.resolve()

    try {
      const {token, url} = await this.tokenPromise

      // Start sound immediately (highest priority) - don't await yet
      const soundController = this.application.getControllerForElementAndIdentifier(this.element, "sound")
      const soundPromise = soundController?.playSound("acknowledgement") || Promise.resolve()

      // Run animations in parallel with sound
      await shrinkComplete

      const startWidth = this.startCircleTarget.offsetWidth + "px"
      this.startCircleTarget.classList.remove("shrinking")
      this.startCircleTarget.classList.add("stretching")
      const stretchAnimation = this.startCircleTarget.animate(
        [{width: startWidth}, {width: "100%"}],
        {duration: 300, easing: "ease"}
      )

      // Wait for BOTH animation and sound to complete before connecting
      await Promise.all([stretchAnimation.finished, soundPromise])

      // NOW connect to room (after animations and sound are done)
      this.room = this.preloadedRoom
      this.preloadedRoom = null

      this.room.on(RoomEvent.Connected, () => {
        console.log("[Connected] Room:", this.room.name)
        this.resetInactivityTimeout()
        this.startCircleTarget.classList.add("fading")
        this.showWaveform()
        setTimeout(() => {
          this.startCircleTarget.classList.add("hidden")
          this.startCircleTarget.classList.remove("stretching", "fading")
          setTimeout(() => {
            this.collapseTutorialItem(0)
            this.revealTutorialItem(1)
            this.listenForFirstTurboStream()
          }, 2000)
        }, 300)
      })

      this.room.on(RoomEvent.Reconnecting, () => {
        console.log("[Reconnecting] Connection interrupted, attempting to reconnect...")
      })

      this.room.on(RoomEvent.Reconnected, () => {
        console.log("[Reconnected] Successfully reconnected")
      })

      this.room.on(RoomEvent.Disconnected, (reason) => {
        console.log("[Disconnected] Reason:", reason)
        this.clearInactivityTimeout()
        this.room = null
        this.reverseAnimation()
      })

      this.room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        console.log("[TrackSubscribed]", track.kind, "from", participant.identity)
        if (track.kind === Track.Kind.Audio) {
          const element = track.attach()
          document.body.appendChild(element)
          this.setupAgentAudioAnalyser(track)
        }
      })

      this.room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
        console.log("[TrackUnsubscribed]", track.kind, "from", participant.identity)
        if (track.kind === Track.Kind.Audio) {
          this.agentAnalyser = null
        }
      })

      this.room.on(RoomEvent.LocalTrackPublished, (publication) => {
        console.log("[LocalTrackPublished]", publication.kind)
        if (publication.source === Track.Source.Microphone) {
          this.setupMicrophoneAnalyser()
        }
      })

      this.room.registerTextStreamHandler("lk.transcription", async (reader, participantInfo) => {
        const info = reader.info
        const isFinal = info.attributes?.["lk.transcription_final"] === "true"
        const isUser = participantInfo.identity.startsWith("user-")

        // Agent started responding - stop thinking animation immediately
        // (before reading chunks, so we don't delay while streaming)
        if (!isUser) {
          this.isThinking = false
        }

        let fullText = ""
        for await (const chunk of reader) {
          fullText += chunk
        }

        if (!isUser || isFinal) {
          console.log("[Transcription]", {
            from: participantInfo.identity,
            text: fullText,
            isFinal
          })
        }

        // User finished speaking - start thinking animation and reset inactivity timeout
        if (isUser && isFinal) {
          this.isThinking = true
          this.thinkingStartTime = performance.now()
          this.resetInactivityTimeout()
        }
      })

      await this.room.connect(url, token)
      await this.room.localParticipant.setMicrophoneEnabled(true)

      // Fallback: try to set up mic analyser now in case LocalTrackPublished already fired
      this.setupMicrophoneAnalyser()

      this.room.localParticipant.registerRpcMethod("stopConversation", async (data) => {
        console.log("%c[RPC RECEIVED: stopConversation]", "background: #22c55e; color: white; padding: 2px 6px;", {
          callerIdentity: data.callerIdentity
        })
        this.stopAgent()
        return JSON.stringify({success: true})
      })

      console.log("[Ready] Local participant:", this.room.localParticipant.identity, "| Microphone enabled")

    } catch (error) {
      console.error("[Error] Connection error:", error)
      this.startCircleTarget.classList.remove("shrinking", "stretching")
      this.room = null
    }
  }

  setupMicrophoneAnalyser() {
    const micTrack = this.room.localParticipant.getTrackPublication(Track.Source.Microphone)?.track
    if (!micTrack) return

    if (!this.audioContext) {
      this.audioContext = new AudioContext()
    }

    const mediaStream = new MediaStream([micTrack.mediaStreamTrack])
    const source = this.audioContext.createMediaStreamSource(mediaStream)

    this.micAnalyser = this.audioContext.createAnalyser()
    this.micAnalyser.fftSize = 256
    this.micAnalyser.smoothingTimeConstant = 0.7
    source.connect(this.micAnalyser)
  }

  setupAgentAudioAnalyser(track) {
    if (!this.audioContext) {
      this.audioContext = new AudioContext()
    }

    const mediaStream = new MediaStream([track.mediaStreamTrack])
    const source = this.audioContext.createMediaStreamSource(mediaStream)

    this.agentAnalyser = this.audioContext.createAnalyser()
    this.agentAnalyser.fftSize = 256
    this.agentAnalyser.smoothingTimeConstant = 0.7
    source.connect(this.agentAnalyser)
  }

  showWaveform() {
    if (!this.hasWaveformContainerTarget) return

    this.waveformContainerTarget.classList.add("active")

    this.resizeObserver = new ResizeObserver(() => this.resizeCanvas())
    this.resizeObserver.observe(this.waveformContainerTarget)

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.resizeCanvas()
        this.waveformContainerTarget.classList.add("visible")
        this.startVisualization()
      })
    })
  }

  hideWaveform() {
    if (!this.hasWaveformContainerTarget) return
    this.waveformContainerTarget.classList.remove("active", "visible")
    this.startCircleTarget.classList.remove("hidden", "shrinking", "stretching", "fading")
    this.cleanupAudio()
  }

  resizeCanvas() {
    if (!this.hasWaveformCanvasTarget) return

    const canvas = this.waveformCanvasTarget
    const container = this.waveformContainerTarget
    const dpr = window.devicePixelRatio || 1

    canvas.width = container.clientWidth * dpr
    canvas.height = container.clientHeight * dpr

    const ctx = canvas.getContext("2d")
    ctx.scale(dpr, dpr)
  }

  startVisualization() {
    const canvas = this.waveformCanvasTarget
    const ctx = canvas.getContext("2d")
    const dpr = window.devicePixelRatio || 1

    const barWidth = 3
    const barGap = 2
    const minBarHeight = 2

    const textColor = getComputedStyle(this.element).color
    const rgb = textColor.match(/\d+/g)
    const glowColor = rgb ? `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.6)` : "rgba(255, 255, 255, 0.6)"

    const draw = () => {
      this.animationId = requestAnimationFrame(draw)

      const width = canvas.width / dpr
      const height = canvas.height / dpr
      const centerX = width / 2
      const centerY = height / 2

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const halfBarCount = Math.floor((width / 2) / (barWidth + barGap))

      let micData = new Uint8Array(128)
      let agentData = new Uint8Array(128)

      if (this.micAnalyser) {
        this.micAnalyser.getByteFrequencyData(micData)
      }
      if (this.agentAnalyser) {
        this.agentAnalyser.getByteFrequencyData(agentData)
      }

      // Check if user started speaking again - stop thinking animation
      if (this.isThinking && this.micAnalyser) {
        const micSum = micData.reduce((a, b) => a + b, 0)
        if (micSum > 1000) {
          this.isThinking = false
        }
      }

      ctx.shadowColor = glowColor
      ctx.shadowBlur = 8
      ctx.fillStyle = textColor

      const maxBarHeight = (height / 2) - 4

      for (let i = 0; i < halfBarCount; i++) {
        let barHeight

        if (this.isThinking) {
          // Ripple wave animation - propagates outward from center
          const elapsed = (performance.now() - this.thinkingStartTime) / 1000
          const spreadSpeed = 40 // bars per second the wave reaches
          const waveReach = elapsed * spreadSpeed

          if (i > waveReach) {
            // Wave hasn't reached this bar yet
            barHeight = minBarHeight
          } else {
            const waveSpeed = 3
            const waveFrequency = 0.3
            const phase = elapsed * waveSpeed - i * waveFrequency
            const wave = Math.sin(phase) * 0.5 + 0.5
            barHeight = minBarHeight + wave * maxBarHeight * 0.4
          }
        } else {
          // Normal audio-reactive visualization
          const dataIndex = Math.floor((i / halfBarCount) * 64)
          const micValue = micData[dataIndex] || 0
          const agentValue = agentData[dataIndex] || 0
          const combinedValue = Math.max(micValue, agentValue)
          const normalizedValue = combinedValue / 255
          barHeight = Math.max(minBarHeight, normalizedValue * maxBarHeight)
        }

        const offsetFromCenter = i * (barWidth + barGap) + barGap / 2

        ctx.beginPath()
        ctx.roundRect(centerX + offsetFromCenter, centerY - barHeight, barWidth, barHeight * 2, 1)
        ctx.fill()

        ctx.beginPath()
        ctx.roundRect(centerX - offsetFromCenter - barWidth, centerY - barHeight, barWidth, barHeight * 2, 1)
        ctx.fill()
      }

      ctx.shadowBlur = 0
    }

    draw()
  }

  stopAgent() {
    if (this.room) {
      this.room.disconnect()
      this.room = null
    }
    this.freshUserValue = false
    this.preloadAgent()
    this.hideTutorial()
    this.element.dispatchEvent(new CustomEvent("sound:play", {detail: {name: "turningOff"}, bubbles: true}))
  }

  refreshTasks() {
    console.log("[TaskAgent] Refreshing tasks...")
    document.getElementById("task_list")?.reload()
  }

  reverseAnimation() {
    this.startCircleTarget.classList.remove("hidden")
    this.startCircleTarget.classList.add("stretching", "fading")
    this.waveformContainerTarget.classList.remove("visible")

    setTimeout(() => {
      this.waveformContainerTarget.classList.remove("active")
      this.cleanupAudio()
      this.startCircleTarget.classList.remove("fading")

      requestAnimationFrame(() => {
        const startWidth = this.startCircleTarget.offsetWidth + "px"
        this.startCircleTarget.classList.remove("stretching")
        this.startCircleTarget.classList.add("shrinking")
        // Animate from line to dot
        const shrinkAnimation = this.startCircleTarget.animate(
          [{width: startWidth}, {width: "5px"}],
          {duration: 300, easing: "ease"}
        )

        shrinkAnimation.onfinish = () => {
          this.startCircleTarget.classList.remove("shrinking")
          // Animate from dot to circle
          this.startCircleTarget.animate(
            [{width: "5px", height: "5px"}, {width: "40px", height: "40px"}],
            {duration: 300, easing: "ease"}
          ).onfinish = () => {
            this.element.dispatchEvent(new CustomEvent("agent:stopped", {bubbles: false}))
          }
        }
      })
    }, 300)
  }

  cleanupAudio() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }

    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }

    this.micAnalyser = null
    this.agentAnalyser = null
  }
}
