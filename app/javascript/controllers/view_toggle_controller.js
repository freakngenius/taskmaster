import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  connect() {
    const savedView = localStorage.getItem('stickyboard-view')
    if (savedView === 'list') {
      this.applyListView()
    } else {
      this.applyProjectView()
    }
  }

  toggle() {
    const board = document.querySelector('.sticky-board')
    const isListView = board && board.classList.contains('view-list')

    if (isListView) {
      this.applyProjectView()
      localStorage.setItem('stickyboard-view', 'projects')
    } else {
      this.applyListView()
      localStorage.setItem('stickyboard-view', 'list')
    }
  }

  applyListView() {
    const board = document.querySelector('.sticky-board')
    const projectsContainer = document.querySelector('.projects-container')
    const listContainer = document.querySelector('.list-view-container')

    if (board) board.classList.add('view-list')
    if (projectsContainer) projectsContainer.style.display = 'none'
    if (listContainer) listContainer.style.display = 'grid'

    // Toggle icon visibility
    const projectIcon = this.element.querySelector('.view-icon-projects')
    const listIcon = this.element.querySelector('.view-icon-list')
    if (projectIcon) projectIcon.style.display = 'none'
    if (listIcon) listIcon.style.display = 'block'
  }

  applyProjectView() {
    const board = document.querySelector('.sticky-board')
    const projectsContainer = document.querySelector('.projects-container')
    const listContainer = document.querySelector('.list-view-container')

    if (board) board.classList.remove('view-list')
    if (projectsContainer) projectsContainer.style.display = 'flex'
    if (listContainer) listContainer.style.display = 'none'

    // Toggle icon visibility
    const projectIcon = this.element.querySelector('.view-icon-projects')
    const listIcon = this.element.querySelector('.view-icon-list')
    if (projectIcon) projectIcon.style.display = 'block'
    if (listIcon) listIcon.style.display = 'none'
  }
}
