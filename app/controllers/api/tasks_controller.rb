class Api::TasksController < ApplicationController
  include ToolTokenAuthenticatable

  skip_before_action :verify_authenticity_token
  before_action :authenticate_tool_token!
  before_action :set_default_list
  before_action :set_task, only: [:update, :destroy, :reorder]
  after_action :log_response

  def index
    tasks = @default_list.tasks.not_completed.order(:position)
    render json: {tasks:, undo_by: "This is a read-only action, no undo needed"}
  end

  def create
    task = @default_list.tasks.build(task_params)

    if task.save
      render json: {task:, undo_by: "delete_task(id: #{task.id})"}, status: :created
    else
      render json: {error: task.errors.full_messages.join(", ")}, status: :unprocessable_entity
    end
  end

  def update
    previous_values = {title: @task.title, note: @task.note, completed: @task.completed}

    if @task.update(task_params)
      undo_params = ["id: #{@task.id}"]
      undo_params << "title: #{previous_values[:title].inspect}" if params[:title].present?
      undo_params << "note: #{previous_values[:note].inspect}" if params.key?(:note)
      undo_params << "completed: #{previous_values[:completed]}" if params.key?(:completed)

      render json: {task: @task, undo_by: "update_task(#{undo_params.join(", ")})"}
    else
      render json: {error: @task.errors.full_messages.join(", ")}, status: :unprocessable_entity
    end
  end

  def destroy
    undo_params = ["title: #{@task.title.inspect}"]
    undo_params << "note: #{@task.note.inspect}" if @task.note.present?

    @task.destroy
    render json: {success: true, undo_by: "create_task(#{undo_params.join(", ")})"}
  end

  def reorder
    previous_position = @task.position
    new_position = params[:position].to_i

    if new_position < 0
      task_count = @default_list.tasks.not_completed.count
      new_position = task_count + new_position + 1
    end

    new_position = [1, new_position].max

    if @task.update(position: new_position)
      render json: {task: @task, undo_by: "reorder_task(id: #{@task.id}, position: #{previous_position})"}
    else
      render json: {error: @task.errors.full_messages.join(", ")}, status: :unprocessable_entity
    end
  end

  def clear_list
    tasks = @default_list.tasks.not_completed
    count = tasks.count

    if count == 0
      render json: {success: true, deleted_count: 0, undo_by: "No tasks were deleted"}
      return
    end

    deleted_tasks = tasks.map { |t| {title: t.title, note: t.note} }
    tasks.destroy_all

    undo_instructions = deleted_tasks.map do |t|
      params = ["title: #{t[:title].inspect}"]
      params << "note: #{t[:note].inspect}" if t[:note].present?
      "create_task(#{params.join(", ")})"
    end.join(", then ")

    render json: {success: true, deleted_count: count, undo_by: undo_instructions}
  end

  private

  def set_default_list
    @default_list = current_guest.lists.first
  end

  def set_task
    @task = @default_list.tasks.find(params[:id])
  rescue ActiveRecord::RecordNotFound
    render json: {error: "Task not found"}, status: :not_found
  end

  def task_params
    params.permit(:title, :note, :completed, :due_at)
  end

  def log_response
    Rails.logger.info "\n#{"=" * 60}\n[LLM RESPONSE] #{action_name.upcase}\n#{JSON.pretty_generate(JSON.parse(response.body))}\n#{"=" * 60}\n"
  end
end
