import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  connect() {
    // Resize on connect
    this.resize()

    // Resize on input
    this.element.addEventListener('input', () => this.resize())

    // Resize on window resize
    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(this.element)
  }

  disconnect() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
    }
  }

  resize() {
    const element = this.element
    const text = element.textContent || element.innerText || ''

    // If empty, reset to default size
    if (text.trim() === '' || text === 'Enter task') {
      this.resetFontSize()
      return
    }

    // Get the container dimensions (sticky-content)
    const container = element.closest('.sticky-content')
    if (!container) return

    const containerHeight = container.clientHeight
    const containerWidth = container.clientWidth

    // Reserve space for due date if present
    const dueDateLabel = container.querySelector('.sticky-due-date')
    const reservedHeight = dueDateLabel ? dueDateLabel.offsetHeight + 8 : 0 // 8px for padding
    const availableHeight = containerHeight - reservedHeight

    // Get current computed font size
    const computedStyle = window.getComputedStyle(element)
    const currentFontSize = parseFloat(computedStyle.fontSize)
    const lineHeight = parseFloat(computedStyle.lineHeight) || currentFontSize * 1.4

    // Determine if we're in the today pane or projects container
    const isToday = element.closest('.today-pane') !== null
    const maxFontSize = isToday ? 24 : 27 // Match the CSS defaults
    const minFontSize = isToday ? 12 : 14

    // Binary search for optimal font size
    let low = minFontSize
    let high = maxFontSize
    let optimalSize = maxFontSize

    // Try the max size first
    element.style.fontSize = `${maxFontSize}px`
    if (this.fitsInContainer(element, availableHeight, containerWidth)) {
      optimalSize = maxFontSize
    } else {
      // Binary search for the right size
      while (high - low > 0.5) {
        const mid = (low + high) / 2
        element.style.fontSize = `${mid}px`

        if (this.fitsInContainer(element, availableHeight, containerWidth)) {
          low = mid
          optimalSize = mid
        } else {
          high = mid
        }
      }
    }

    // Apply the optimal font size
    element.style.fontSize = `${optimalSize}px`
  }

  fitsInContainer(element, maxHeight, maxWidth) {
    // Check if content fits within the available space
    const contentHeight = element.scrollHeight
    const contentWidth = element.scrollWidth

    return contentHeight <= maxHeight && contentWidth <= maxWidth
  }

  resetFontSize() {
    // Reset to default CSS size
    this.element.style.fontSize = ''
  }
}
