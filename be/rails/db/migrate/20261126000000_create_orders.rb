class CreateOrders < ActiveRecord::Migration[8.1]
  def change
    create_table :orders do |t|
      t.decimal :total, precision: 12, scale: 2, null: false
      t.datetime :created_at, null: false, default: -> { "now()" }
    end
  end
end
