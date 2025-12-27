import { Controller } from "@hotwired/stimulus"

// Plays sound when a highlighted task is added to the DOM
// This replaces the MutationObserver approach which doesn't work on iOS Safari
export default class extends Controller {
  connect() {
    document.dispatchEvent(new CustomEvent("sound:play", {detail: {name: "taskAck"}}))
  }
}
