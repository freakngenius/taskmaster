import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = {
    dueDate: String
  }

  static targets = ['dueDate']

  connect() {
    this.updateDueDateLabel()
  }

  updateDueDateLabel() {
    if (!this.hasDueDateTarget || !this.dueDateValue) return

    const dueDate = new Date(this.dueDateValue + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const isToday = dueDate.getTime() === today.getTime()
    const isPast = dueDate.getTime() < today.getTime()

    if (isPast) {
      this.dueDateTarget.remove()
      return
    }

    this.dueDateTarget.textContent = isToday
      ? 'Today'
      : dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    this.dueDateTarget.classList.toggle('due-today', isToday)
  }

  complete(event) {
    event.preventDefault()
    event.stopPropagation()
    console.log('[complete] Called')

    const taskId = this.element.dataset.taskId
    if (!taskId) return

    const stickyNote = this.element
    const isCompleted = stickyNote.classList.contains('completed')

    fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': document.querySelector('[name="csrf-token"]')?.content || ''
      },
      body: JSON.stringify({ completed: !isCompleted })
    })
    .then(response => {
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      return response.json()
    })
    .then(data => {
      console.log('[complete] Response:', data)
      if (data.task || data.id) {
        // Remove the task from view (completed tasks are hidden)
        const turboFrame = this.element.closest('turbo-frame')
        if (turboFrame) {
          turboFrame.remove()
        } else {
          this.element.remove()
        }
      }
    })
    .catch(error => {
      console.error('Error updating task:', error)
    })
  }

  star(event) {
    event.preventDefault()
    event.stopPropagation()
    console.log('[star] Called')

    const taskId = this.element.dataset.taskId
    if (!taskId) {
      console.error('No task ID found for star action')
      return
    }

    const stickyNote = this.element
    const isStarred = stickyNote.classList.contains('starred')
    console.log('[star] Task:', taskId, 'Currently starred:', isStarred)

    fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': document.querySelector('[name="csrf-token"]')?.content || ''
      },
      body: JSON.stringify({ starred: !isStarred })
    })
    .then(response => {
      console.log('[star] Response status:', response.status)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return response.json()
    })
    .then(data => {
      console.log('[star] Response data:', data)
      // DOM updates are handled by Turbo Stream broadcasts from the server
    })
    .catch(error => {
      console.error('Error updating task:', error)
    })
  }

  delete(event) {
    event.preventDefault()
    event.stopPropagation()
    console.log('[delete] Called')

    const taskId = this.element.dataset.taskId
    if (!taskId) return

    fetch(`/api/tasks/${taskId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': document.querySelector('[name="csrf-token"]')?.content || ''
      }
    })
    .then(response => {
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      return response.json()
    })
    .then(data => {
      console.log('[delete] Response:', data)
      if (data.success) {
        // Remove the task element
        const turboFrame = this.element.closest('turbo-frame')
        if (turboFrame) {
          turboFrame.remove()
        } else {
          this.element.remove()
        }
      }
    })
    .catch(error => {
      console.error('Error deleting task:', error)
    })
  }

  openDatePicker(event) {
    event.preventDefault()
    event.stopPropagation()
    console.log('[openDatePicker] Called')

    const dateInput = this.element.querySelector('.hidden-date-input')
    console.log('[openDatePicker] Found date input:', dateInput)
    if (dateInput) {
      if (this.dueDateValue) {
        console.log('[openDatePicker] Setting existing date:', this.dueDateValue)
        dateInput.value = this.dueDateValue
      }
      console.log('[openDatePicker] Calling showPicker()')
      dateInput.showPicker()
    } else {
      console.error('[openDatePicker] Date input not found!')
    }
  }

  dateChanged(event) {
    event.preventDefault()
    event.stopPropagation()
    console.log('[dateChanged] Event fired', event.target.value)

    const taskId = this.element.dataset.taskId
    console.log('[dateChanged] Task ID:', taskId)
    if (!taskId) {
      console.error('[dateChanged] No task ID found')
      return
    }

    const newDate = event.target.value
    console.log('[dateChanged] New date:', newDate)
    if (!newDate) {
      console.error('[dateChanged] No date value')
      return
    }

    console.log('[dateChanged] Sending PATCH to /api/tasks/' + taskId)
    fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': document.querySelector('[name="csrf-token"]')?.content || ''
      },
      body: JSON.stringify({ due_at: newDate })
    })
    .then(response => {
      console.log('[dateChanged] Response status:', response.status)
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      return response.json()
    })
    .then(data => {
      console.log('[dateChanged] Response data:', data)
      if (data.task || data.id) {
        const task = data.task || data
        this.dueDateValue = task.due_at || ''
        this.updateDueDateLabel()
      }
    })
    .catch(error => {
      console.error('[dateChanged] Error:', error)
    })
  }
}
