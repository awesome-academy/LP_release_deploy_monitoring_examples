class HealthController < ApplicationController
  def show
    ActiveRecord::Base.with_connection { |conn| conn.execute("SELECT 1") }
    render json: { status: "ok", db: "up" }
  rescue StandardError => e
    Rails.logger.error("health: DB query failed: #{e.class}: #{e.message}\n#{e.backtrace.join("\n")}")
    render json: { status: "error", db: "down" }, status: :internal_server_error
  end
end
