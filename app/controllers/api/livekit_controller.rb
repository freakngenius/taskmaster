class Api::LivekitController < ApplicationController
  include GuestAuth

  skip_before_action :verify_authenticity_token
  before_action :require_guest

  def create
    room_name = "agent-room-#{SecureRandom.hex(8)}"
    user_identity = "user-#{SecureRandom.hex(4)}"

    Rails.logger.info "[LiveKit API] Creating room: #{room_name}, user: #{user_identity}"

    access_token = LiveKit::AccessToken.new(
      api_key: Setting.livekit_api_key,
      api_secret: Setting.livekit_api_secret,
      identity: user_identity,
      name: "User",
      ttl: 15.minutes.to_i
    )
    access_token.video_grant = LiveKit::VideoGrant.new(
      roomJoin: true,
      room: room_name,
      canPublish: true,
      canSubscribe: true
    )

    tool_token = current_guest.create_tool_token!

    dispatch_client = LiveKit::AgentDispatchServiceClient.new(
      Setting.livekit_url,
      api_key: Setting.livekit_api_key,
      api_secret: Setting.livekit_api_secret
    )

    begin
      agent_config = build_agent_config(tool_token)
      metadata = agent_config.present? ? agent_config.to_json : nil
      dispatch = dispatch_client.create_dispatch(room_name, "Drew-94d", metadata:)
      Rails.logger.info "[LiveKit API] Agent dispatch created: #{dispatch.inspect}"
    rescue => e
      Rails.logger.error "[LiveKit API] Agent dispatch FAILED: #{e.class} - #{e.message}"
      Rails.logger.error e.backtrace.first(5).join("\n")
    end

    render json: {
      token: access_token.to_jwt,
      url: Setting.livekit_url,
      room_name:
    }
  end

  private

  def build_agent_config(tool_token)
    config = params[:agentConfig]&.to_unsafe_h || {}
    return config if config.empty?

    config["auth"] ||= {}
    config["auth"]["tool_token"] = tool_token.token
    config
  end
end
