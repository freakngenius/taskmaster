class ListsController < ApplicationController
  include GuestAuth

  layout "tasks"

  before_action :require_guest
  before_action :set_list, only: [:show, :edit, :update, :destroy]

  def index
    @lists = current_guest.lists
  end

  def show
    @list.tasks.where("due_at < ?", Date.current).update_all(due_at: Date.current)
  end

  def new
    @list = List.new
  end

  def edit
  end

  def create
    @list = current_guest.lists.build(list_params)

    if @list.save
      redirect_to @list
    else
      render :new, status: :unprocessable_entity
    end
  end

  def update
    if @list.update(list_params)
      redirect_to @list
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    @list.destroy
    redirect_to lists_url, notice: "List was successfully destroyed."
  end

  private

  def set_list
    @list = if params[:id]
      current_guest.lists.find(params[:id])
    else
      current_guest.lists.order(:id).first
    end
  end

  def list_params
    params.require(:list).permit(:name)
  end
end
