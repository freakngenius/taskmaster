import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["board"]

  connect() {
    this.handleKeydown = this.handleKeydown.bind(this)
    document.addEventListener('keydown', this.handleKeydown)
    this.selectedSticky = null
    this.inTodayPane = false
    this.lastMicToggle = 0
  }

  disconnect() {
    document.removeEventListener('keydown', this.handleKeydown)
  }

  handleKeydown(event) {
    // Handle Cmd+Enter to finish editing
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      if (document.activeElement && document.activeElement.contentEditable === 'true') {
        event.preventDefault()
        document.activeElement.blur()
        return
      }
    }

    // Ignore other shortcuts if user is typing in an input/textarea/contenteditable
    if (event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target.contentEditable === 'true') {
      return
    }

    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        event.preventDefault()
        this.navigateStickies(event.key)
        break

      case 'Tab':
        event.preventDefault()
        this.togglePane()
        break

      case 't':
      case 'T':
        // Move selected sticky to Today
        if (this.selectedSticky) {
          this.moveToToday(this.selectedSticky)
        }
        break

      case 'c':
      case 'C':
        // Check off selected sticky
        if (this.selectedSticky) {
          this.toggleComplete(this.selectedSticky)
        }
        break

      case 'h':
      case 'H':
        // Toggle hide completed (trigger eye toggle)
        const eyeToggleBtn = document.querySelector('[data-controller="eye-toggle"]')
        if (eyeToggleBtn) {
          eyeToggleBtn.click()
        }
        break

      case 'l':
      case 'L':
        // Toggle list/project view
        event.preventDefault()
        const viewToggleBtn = document.querySelector('.view-toggle-btn')
        if (viewToggleBtn) {
          viewToggleBtn.click()
        }
        break

      case 'p':
      case 'P':
        // Show add project dialog
        event.preventDefault()
        const projectAddBtn = document.querySelector('[data-action="click->project-add#show"]')
        if (projectAddBtn) {
          projectAddBtn.click()
        }
        break

      case '=':
      case '+':
        // Zoom in
        event.preventDefault()
        const zoomInBtn = document.querySelector('[data-action="click->zoom#zoomIn"]')
        if (zoomInBtn) {
          zoomInBtn.click()
        }
        break

      case '-':
      case '_':
        // Zoom out
        event.preventDefault()
        const zoomOutBtn = document.querySelector('[data-action="click->zoom#zoomOut"]')
        if (zoomOutBtn) {
          zoomOutBtn.click()
        }
        break

      case 'm':
      case 'M':
      case ' ':
        // Toggle microphone (ignore key repeat from holding)
        event.preventDefault()
        event.stopPropagation()
        if (!event.repeat) {
          this.toggleMic()
        }
        break

      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
        // Add sticky to project N
        event.preventDefault()
        const projectIndex = parseInt(event.key) - 1
        this.addStickyToProject(projectIndex)
        break
    }
  }

  getAllStickies() {
    if (this.inTodayPane) {
      return Array.from(document.querySelectorAll('.today-tasks .sticky-note'))
    }

    // Check if list view is active
    const listContainer = document.querySelector('.list-view-container')
    if (listContainer && listContainer.style.display !== 'none') {
      return Array.from(document.querySelectorAll('.list-view-container .sticky-note'))
    }

    return Array.from(document.querySelectorAll('.projects-container .sticky-note'))
  }

  navigateStickies(direction) {
    const stickies = this.getAllStickies()
    if (stickies.length === 0) return

    // Find current selection index
    let currentIndex = -1
    if (this.selectedSticky) {
      currentIndex = stickies.indexOf(this.selectedSticky)
    }

    // Calculate new index based on direction
    let newIndex
    if (direction === 'ArrowDown' || direction === 'ArrowRight') {
      newIndex = currentIndex < stickies.length - 1 ? currentIndex + 1 : 0
    } else {
      newIndex = currentIndex > 0 ? currentIndex - 1 : stickies.length - 1
    }

    // Update selection
    this.selectSticky(stickies[newIndex])
  }

  selectSticky(sticky) {
    // Remove previous selection
    if (this.selectedSticky) {
      this.selectedSticky.classList.remove('selected')
    }

    // Set new selection
    this.selectedSticky = sticky
    if (sticky) {
      sticky.classList.add('selected')
      sticky.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }

  togglePane() {
    this.inTodayPane = !this.inTodayPane

    // Clear current selection
    if (this.selectedSticky) {
      this.selectedSticky.classList.remove('selected')
    }

    // Select first sticky in new pane
    const stickies = this.getAllStickies()
    if (stickies.length > 0) {
      this.selectSticky(stickies[0])
    } else {
      this.selectedSticky = null
    }
  }

  moveToToday(sticky) {
    const taskId = sticky.dataset.taskId
    if (!taskId) return

    // Toggle starred status - starred tasks appear in Do Today
    const isStarred = sticky.classList.contains('starred')

    fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': document.querySelector('[name="csrf-token"]').content
      },
      body: JSON.stringify({ starred: !isStarred })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success || data.task || data.id) {
        // The Turbo Stream will handle the UI update
        this.selectedSticky = null
      }
    })
    .catch(error => {
      console.error('Error toggling task starred status:', error)
    })
  }

  toggleComplete(sticky) {
    const taskId = sticky.dataset.taskId
    if (!taskId) return

    const isCompleted = sticky.classList.contains('completed')

    fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': document.querySelector('[name="csrf-token"]').content
      },
      body: JSON.stringify({ completed: !isCompleted })
    })
    .then(response => response.json())
    .then(data => {
      if (data.task || data.id) {
        sticky.classList.toggle('completed')
        const textEl = sticky.querySelector('.sticky-text')
        if (textEl) {
          textEl.contentEditable = isCompleted ? 'true' : 'false'
        }
      }
    })
    .catch(error => {
      console.error('Error updating task:', error)
    })
  }

  addStickyToProject(index) {
    const projectColumns = document.querySelectorAll('.project-column')
    if (projectColumns[index]) {
      // Click the add-sticky button for this project to reuse its logic
      const addStickyBtn = projectColumns[index].querySelector('.add-sticky-btn')
      if (addStickyBtn) {
        addStickyBtn.click()
      }
    }
  }

  toggleMic() {
    // Debounce - prevent rapid toggling
    const now = Date.now()
    if (now - this.lastMicToggle < 2000) {
      return
    }
    this.lastMicToggle = now

    // Check if agent is in transition (animating) - don't interfere
    const startCircle = document.querySelector('.start-circle')
    if (startCircle && (startCircle.classList.contains('shrinking') || startCircle.classList.contains('stretching'))) {
      return
    }

    // Check if waveform is visible (agent is running)
    const waveformContainer = document.querySelector('.waveform-container.visible')
    if (waveformContainer) {
      // Agent is running, stop it
      waveformContainer.click()
      return
    }

    // Agent not running - try to start
    if (startCircle && !startCircle.classList.contains('hidden') && !startCircle.classList.contains('pre-activation')) {
      startCircle.click()
      return
    }

    // Need to activate mic first
    const activateLink = document.querySelector('.activate-link:not(.hidden)')
    if (activateLink) {
      activateLink.click()
    }
  }
}
