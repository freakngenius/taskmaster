import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["link", "copied"]

  async copy() {
    const taskRows = document.querySelectorAll("#task_list .task-row")
    const lines = []

    taskRows.forEach(row => {
      const titleEl = row.querySelector(".task-title")
      if (titleEl) {
        const text = titleEl.textContent.trim()
        if (text) {
          lines.push(`[ ] ${text}`)
        }
      }
    })

    if (lines.length === 0) return

    try {
      await navigator.clipboard.writeText(lines.join("\n"))
      this.showCopied()
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  showCopied() {
    this.linkTarget.classList.add("hidden")
    this.copiedTarget.classList.remove("hidden")

    setTimeout(() => {
      this.copiedTarget.classList.add("hidden")
      this.linkTarget.classList.remove("hidden")
    }, 1500)
  }
}
