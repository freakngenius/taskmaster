class TasksController < ApplicationController
  include GuestAuth

  layout "tasks"

  before_action :require_guest
  before_action :set_task, only: [:show, :edit, :update, :destroy]
  before_action :set_lists, only: [:new]

  def index
    @list = current_guest.lists.find_by(id: params[:list_id]) || current_guest.lists.first
  end

  def show
  end

  def new
    @list = current_guest.lists.find_by(id: params[:list_id]) || current_guest.lists.first
    @task = @list.tasks.build
  end

  def edit
  end

  def create
    @list = current_guest.lists.find_by(id: task_params[:list_id]) || current_guest.lists.first
    @task = @list.tasks.build(task_params)

    if @task.save
      redirect_to @task
    else
      render :new, status: :unprocessable_entity
    end
  end

  def update
    if @task.update(task_params)
      respond_to do |format|
        format.json { head :ok } # Triggered by Sortable re-ordering
        format.html { redirect_to @task }
      end
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    list = @task.list
    @task.destroy
    respond_to do |format|
      format.turbo_stream { head :no_content }
      format.html { redirect_to list }
    end
  end

  private

  def set_task
    @task = Task.joins(:list).where(lists: {guest_id: current_guest.id}).find(params[:id])
  end

  def set_lists
    @lists = current_guest.lists
  end

  def task_params
    params.require(:task).permit(:title, :note, :completed, :due_at, :list_id, :position)
  end
end
