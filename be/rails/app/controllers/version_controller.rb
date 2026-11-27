class VersionController < ApplicationController
  def show
    render json: JSON.parse(File.read(Rails.root.join("version.json")))
  end
end
