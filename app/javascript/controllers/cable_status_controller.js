import { Controller } from "@hotwired/stimulus"
import consumer from "channels/consumer"

// Cable Status Controller
//
// Monitors ActionCable WebSocket connection state and provides visual feedback.
// Can trigger actions on other Stimulus controllers via outlets when connection
// state changes.
//
// Usage:
//   <div data-controller="cable-status"
//        data-cable-status-connected-color-value="#22c55e"
//        data-cable-status-disconnected-color-value="#ef4444"
//        data-cable-status-other-outlet=".other-controller-element"
//        data-cable-status-on-connect-value="refresh"
//        data-cable-status-on-disconnect-value="pause">
//   </div>
//
// Values:
//   connected-color:    CSS color when connected (default: #22c55e)
//   disconnected-color: CSS color when disconnected (default: #ef4444)
//   on-connect:         Method name to call on outlets when connected
//   on-disconnect:      Method name to call on outlets when disconnected
//
// Outlets:
//   Define outlets to other controllers that should be notified on state changes.
//   Any Stimulus controller can be an outlet - just add it to the outlets array
//   and configure via data-cable-status-[name]-outlet attribute.

export default class extends Controller {
  static outlets = ["task-agent"]
  static values = {
    connectedColor: {type: String, default: "#22c55e"},
    disconnectedColor: {type: String, default: "#ef4444"},
    onConnect: String,
    onDisconnect: String
  }

  connect() {
    this.previousState = null
    this.pollInterval = null
    // Ensure the ActionCable connection is opened (it's lazy by default)
    consumer.connection.open()
    this.startPolling()
  }

  disconnect() {
    this.stopPolling()
  }

  startPolling() {
    this.pollInterval = setInterval(() => this.checkState(), 500)
    this.checkState()
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
  }

  checkState() {
    const isConnected = consumer.connection.isOpen()

    if (isConnected !== this.previousState) {
      if (this.previousState !== null) {
        if (isConnected) {
          console.log("[Cable] Connected")
          this.dispatchConnected()
        } else {
          console.log("[Cable] Disconnected")
          this.attemptReconnect()
          this.dispatchDisconnected()
        }
      }
      this.previousState = isConnected
    }

    this.updateIndicator(isConnected)
  }

  attemptReconnect() {
    console.log("[Cable] Attempting reconnect...")
    consumer.connection.open()
  }

  updateIndicator(isConnected) {
    this.element.style.backgroundColor = isConnected
      ? this.connectedColorValue
      : this.disconnectedColorValue
  }

  dispatchConnected() {
    this.dispatch("connected")
    this.callOutletMethod(this.onConnectValue)
  }

  dispatchDisconnected() {
    this.dispatch("disconnected")
    this.callOutletMethod(this.onDisconnectValue)
  }

  callOutletMethod(methodName) {
    if (!methodName) return

    this.constructor.outlets.forEach(outletName => {
      const propertyName = `${this.camelize(outletName)}Outlets`
      const outlets = this[propertyName] || []
      outlets.forEach(outlet => {
        if (typeof outlet[methodName] === "function") {
          outlet[methodName]()
        }
      })
    })
  }

  camelize(value) {
    return value.replace(/(?:[_-])([a-z0-9])/g, (_, char) => char.toUpperCase())
  }
}
