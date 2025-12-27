import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  connect() {
    document.fonts.ready.then(() => {
      requestAnimationFrame(() => {
        this.fit()
        this.observer = new ResizeObserver(() => this.fit())
        this.observer.observe(this.element.parentElement)
      })
    })
  }

  disconnect() {
    this.observer?.disconnect()
  }

  fit() {
    const parent = this.element.parentElement
    const style = getComputedStyle(parent)
    const availableWidth = parent.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)

    this.element.style.fontSize = "100px"
    this.element.style.whiteSpace = "nowrap"
    this.element.style.display = "inline-block"

    const scale = availableWidth / this.element.scrollWidth
    this.element.style.fontSize = `${100 * scale}px`
  }
}
