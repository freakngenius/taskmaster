class Project < ApplicationRecord
  belongs_to :list
  has_many :tasks, dependent: :destroy

  validates :name, presence: true
  validates :color, presence: true

  before_validation :ensure_default_color
  after_update :update_task_colors, if: :saved_change_to_color?

  acts_as_list scope: :list

  def as_json(options = nil)
    {
      id: id,
      name: name,
      color: safe_color,
      font_color: safe_font_color,
      position: position,
      notes: tasks.order(Arel.sql('due_at ASC NULLS LAST, position ASC')).map(&:as_json)
    }
  end

  # Graceful fallback to default color if color is blank
  def safe_color
    color.presence || "#FEF3C7"
  end

  # Graceful fallback if font_color column doesn't exist yet
  def safe_font_color
    return "#1a1a1a" unless self.class.column_names.include?("font_color")
    font_color.presence || "#1a1a1a"
  end

  private

  def ensure_default_color
    self.color = "#FEF3C7" if color.blank?
  end

  def update_task_colors
    # Update all tasks in this project to match the new project color
    tasks.update_all(color: color)

    # Broadcast update to refresh the UI
    tasks.each(&:broadcast_changes)
  end
end
