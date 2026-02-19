import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  connect() {
    console.log('[ViewToggle] Controller connected')
    // Delay to ensure DOM is ready
    setTimeout(() => {
      const savedView = localStorage.getItem('stickyboard-view')
      console.log('[ViewToggle] Saved view:', savedView)
      if (savedView === 'list') {
        this.applyListView()
      } else {
        this.applyProjectView()
      }
    }, 100)
  }

  toggle(event) {
    console.log('[ViewToggle] Toggle clicked')
    event?.preventDefault()

    const board = document.querySelector('.sticky-board')
    const isListView = board && board.classList.contains('view-list')

    console.log('[ViewToggle] Current view:', isListView ? 'list' : 'projects')

    if (isListView) {
      this.applyProjectView()
      localStorage.setItem('stickyboard-view', 'projects')
    } else {
      this.applyListView()
      localStorage.setItem('stickyboard-view', 'list')
    }
  }

  applyListView() {
    console.log('[ViewToggle] Applying list view')
    const board = document.querySelector('.sticky-board')
    const projectsContainer = document.querySelector('.projects-container')
    const listContainer = document.querySelector('.list-view-container')

    console.log('[ViewToggle] Elements found:', {
      board: !!board,
      projectsContainer: !!projectsContainer,
      listContainer: !!listContainer
    })

    if (board) board.classList.add('view-list')
    if (projectsContainer) projectsContainer.style.display = 'none'
    if (listContainer) listContainer.style.display = 'grid'

    // Toggle icon visibility - find button first
    const toggleBtn = this.element.querySelector('.view-toggle-btn') || this.element
    const projectIcon = toggleBtn.querySelector('.view-icon-projects')
    const listIcon = toggleBtn.querySelector('.view-icon-list')
    console.log('[ViewToggle] Icons found:', { projectIcon: !!projectIcon, listIcon: !!listIcon })
    if (projectIcon) projectIcon.style.display = 'none'
    if (listIcon) listIcon.style.display = 'block'
  }

  applyProjectView() {
    console.log('[ViewToggle] Applying project view')
    const board = document.querySelector('.sticky-board')
    const projectsContainer = document.querySelector('.projects-container')
    const listContainer = document.querySelector('.list-view-container')

    console.log('[ViewToggle] Elements found:', {
      board: !!board,
      projectsContainer: !!projectsContainer,
      listContainer: !!listContainer
    })

    if (board) board.classList.remove('view-list')
    if (projectsContainer) projectsContainer.style.display = 'flex'
    if (listContainer) listContainer.style.display = 'none'

    // Toggle icon visibility - find button first
    const toggleBtn = this.element.querySelector('.view-toggle-btn') || this.element
    const projectIcon = toggleBtn.querySelector('.view-icon-projects')
    const listIcon = toggleBtn.querySelector('.view-icon-list')
    console.log('[ViewToggle] Icons found:', { projectIcon: !!projectIcon, listIcon: !!listIcon })
    if (projectIcon) projectIcon.style.display = 'block'
    if (listIcon) listIcon.style.display = 'none'
  }
}
