import { Controller } from "@hotwired/stimulus"
import Sortable from "sortablejs"

export default class extends Controller {
  static values = { group: String }

  connect() {
    // Small delay to ensure DOM is ready
    setTimeout(() => {
      this.initSortable()
    }, 100)
  }

  initSortable() {
    if (this.sortable) return

    const isToday = this.groupValue === "today"

    this.sortable = Sortable.create(this.element, {
      animation: 150,
      ghostClass: "sortable-ghost",
      dragClass: "sortable-drag",
      draggable: "> turbo-frame, > .sticky-note",
      group: this.groupValue || "tasks",
      // Only allow dragging if:
      // - It's in the "today" group (all tasks in Do Today are draggable), OR
      // - The task doesn't have a due date set (project tasks without dates are draggable)
      filter: function(evt, target) {
        if (isToday) return false // Allow all tasks in Today to be dragged

        // For project columns, check if task has a due date
        const stickyNote = target.querySelector?.('.sticky-note') || target
        const dueDate = stickyNote?.dataset?.taskActionDueDateValue
        // Filter out (prevent dragging) if task has a due date
        return dueDate && dueDate !== '' && dueDate !== 'null'
      },
      onEnd: this.onEnd.bind(this),
      forceFallback: true,  // Use JS-based dragging instead of native HTML5
      fallbackClass: "sortable-fallback"
    })
  }

  onEnd(event) {
    const taskFrame = event.item
    // Handle both turbo-frame IDs and data-task-id attributes
    let taskId = taskFrame.id?.replace('task_', '')
    if (!taskId) {
      // Try getting from sticky-note data attribute
      const stickyNote = taskFrame.querySelector?.('.sticky-note') || taskFrame
      taskId = stickyNote.dataset?.taskId
    }
    if (!taskId) {
      console.error('[Sortable] Could not find task ID')
      return
    }

    // Update position via API
    const newPosition = event.newIndex
    console.log('[Sortable] Reordering task', taskId, 'to position', newPosition)

    fetch(`/api/tasks/${taskId}/reorder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': document.querySelector('[name="csrf-token"]').content
      },
      body: JSON.stringify({ position: newPosition })
    })
    .then(response => response.json())
    .then(data => console.log('[Sortable] Reorder response:', data))
    .catch(error => console.error('[Sortable] Reorder error:', error))
  }

  disconnect() {
    if (this.sortable) {
      this.sortable.destroy()
      this.sortable = null
    }
  }
}
