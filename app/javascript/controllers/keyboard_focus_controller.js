import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["proxy"]

  activate() {
    this.proxyTarget.focus()
  }
}
