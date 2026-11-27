exports.up = (pgm) => {
  pgm.createTable('orders', {
    id: 'id',
    total: { type: 'numeric(12,2)', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('orders');
};
