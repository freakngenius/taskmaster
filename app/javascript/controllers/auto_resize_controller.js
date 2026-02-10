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

    // Get the sticky-note container to respect aspect ratio
    const stickyNote = element.closest('.sticky-note')
    if (!stickyNote) return

    // Get the container dimensions (sticky-content)
    const container = element.closest('.sticky-content')
    if (!container) return

    // Get actual rendered dimensions accounting for padding
    const containerStyle = window.getComputedStyle(container)
    const containerHeight = container.clientHeight
    const containerWidth = container.clientWidth
    const paddingTop = parseFloat(containerStyle.paddingTop) || 16
    const paddingBottom = parseFloat(containerStyle.paddingBottom) || 16
    const paddingLeft = parseFloat(containerStyle.paddingLeft) || 16
    const paddingRight = parseFloat(containerStyle.paddingRight) || 16

    // Reserve space for due date if present
    const dueDateLabel = container.querySelector('.sticky-due-date')
    const reservedHeight = dueDateLabel ? dueDateLabel.offsetHeight + 4 : 0

    // Calculate available space
    const availableHeight = containerHeight - paddingTop - paddingBottom - reservedHeight
    const availableWidth = containerWidth - paddingLeft - paddingRight

    // Determine if we're in the today pane or projects container
    const isToday = element.closest('.today-pane') !== null
    const maxFontSize = isToday ? 24 : 27 // Match the CSS defaults
    const minFontSize = isToday ? 10 : 12

    // Binary search for optimal font size
    let low = minFontSize
    let high = maxFontSize
    let optimalSize = maxFontSize

    // Try the max size first
    element.style.fontSize = `${maxFontSize}px`
    if (this.fitsInContainer(element, availableHeight, availableWidth)) {
      optimalSize = maxFontSize
    } else {
      // Binary search for the right size
      while (high - low > 0.5) {
        const mid = (low + high) / 2
        element.style.fontSize = `${mid}px`

        if (this.fitsInContainer(element, availableHeight, availableWidth)) {
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
