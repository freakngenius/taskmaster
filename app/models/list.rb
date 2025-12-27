class List < ApplicationRecord
  STARTER_TASKS = ["Fix hyperdrive", "Calibrate flux capacitor", "Charge arc reactor"].freeze

  belongs_to :guest
  has_many :tasks, dependent: :destroy

  validates :name, presence: true

  def pristine?
    tasks.count == 3 &&
      tasks.none?(&:completed?) &&
      tasks.order(:position).pluck(:title) == STARTER_TASKS
  end

  broadcasts_to ->(list) { [list.guest, :lists] }, inserts_by: :prepend
end
