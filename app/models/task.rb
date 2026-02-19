class Task < ApplicationRecord
  include Task::Position

  belongs_to :list
  belongs_to :project, optional: true

  before_validation :inherit_project_color
  before_save :auto_star_when_due_today
  before_save :add_to_today_when_starred
  after_commit :broadcast_changes, unless: :destroyed?
  after_destroy_commit :broadcast_destroy

  validates :title, length: { maximum: 500 }  # Allow blank titles for new task creation

  scope :not_completed, -> { where(completed: false) }
  scope :for_today, -> { where(today: true) }
  scope :for_projects, -> { where.not(project_id: nil) }
  scope :by_category, ->(category) { where(category: category) }  # Backward compatibility

  def as_json(options = nil)
    {
      id: id,
      text: title,  # React app uses "text" instead of "title"
      title: title,
      completed: completed,
      starred: starred,
      position: position,
      today: today,
      color: color,
      project_id: project_id,
      due_at: due_at&.to_date&.iso8601
    }
  end

  # Class method to star all tasks due today (can be called by a scheduled job)
  def self.star_tasks_due_today
    where(due_at: Date.current.all_day)
      .where(starred: [false, nil])
      .find_each do |task|
        task.update(starred: true)
      end
  end

  private

  def inherit_project_color
    if project_id && !color
      self.color = project.color
    end
  end

  def add_to_today_when_starred
    if starred_changed?
      if starred?
        self.today = true
      else
        self.today = false
      end
    end
  end

  def auto_star_when_due_today
    return unless due_at.present?

    # Compare dates as strings to avoid timezone issues
    task_date = due_at.to_date.to_s
    today_date = Date.current.to_s

    Rails.logger.info "[AUTO-STAR] Task #{id}: due_at=#{task_date}, today=#{today_date}, starred=#{starred?}, due_at_changed=#{due_at_changed?}"

    if task_date == today_date && !starred?
      Rails.logger.info "[AUTO-STAR] Starring task #{id} because it's due today"
      self.starred = true
      self.today = true
    end
  end

  def broadcast_changes
    # Broadcast to project column if task belongs to a project
    if project_id
      Turbo::StreamsChannel.broadcast_update_to(
        list,
        target: "project-#{project_id}",
        partial: "projects/project_notes",
        locals: {list: list, project: project}
      )
    end

    # Update today pane when starred changes, due_at changes, or on creation
    if saved_change_to_today? || saved_change_to_starred? || saved_change_to_id? || saved_change_to_due_at?
      Turbo::StreamsChannel.broadcast_update_to(
        list,
        target: "today-tasks",
        partial: "tasks/today_tasks",
        locals: {list: list}
      )
    end

    # Update list view (shows all tasks sorted by date)
    Turbo::StreamsChannel.broadcast_update_to(
      list,
      target: "list-view-tasks",
      partial: "tasks/list_view",
      locals: {list: list}
    )
  end

  def broadcast_destroy
    # Broadcast to project column
    if project_id
      Turbo::StreamsChannel.broadcast_update_to(
        list,
        target: "project-#{project_id}",
        partial: "projects/project_notes",
        locals: {list: list, project: project}
      )
    end

    # Always update today pane on destroy (might have been starred)
    Turbo::StreamsChannel.broadcast_update_to(
      list,
      target: "today-tasks",
      partial: "tasks/today_tasks",
      locals: {list: list}
    )

    # Update list view
    Turbo::StreamsChannel.broadcast_update_to(
      list,
      target: "list-view-tasks",
      partial: "tasks/list_view",
      locals: {list: list}
    )
  end
end
