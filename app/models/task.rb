class Task < ApplicationRecord
  include Task::Position

  belongs_to :list

  before_validation :set_default_due_at
  after_commit :broadcast_changes, unless: :destroyed?
  after_destroy_commit :broadcast_destroy

  validates :title, presence: true
  validates :due_at, presence: true

  def as_json(options = nil)
    {id:, title:, completed:, position:}
  end

  private

  def set_default_due_at
    self.due_at ||= Date.current
  end

  def broadcast_changes
    if saved_change_to_completed? && completed?
      Turbo::StreamsChannel.broadcast_action_to(
        list,
        action: :complete_animation,
        target: self
      )
    else
      Turbo::StreamsChannel.broadcast_update_to(
        list,
        target: "task_list",
        partial: "tasks/list",
        locals: {list:, highlight_task_id: (id if previously_new_record? || saved_change_to_title? || saved_change_to_position?)}
      )
    end
  end

  def broadcast_destroy
    Turbo::StreamsChannel.broadcast_action_to(
      list,
      action: :delete_animation,
      target: self
    )
  end
end
