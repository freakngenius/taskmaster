import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["circleIcon", "checkIcon"]

  connect() {
    this.completing = false
  }

  showCheck() {
    this.circleIconTarget.classList.add("hidden")
    this.checkIconTarget.classList.remove("hidden")
  }

  showCircle() {
    if (this.completing) return
    this.circleIconTarget.classList.remove("hidden")
    this.checkIconTarget.classList.add("hidden")
  }

  complete() {
    this.completing = true
    this.showCheck()
  }
}
