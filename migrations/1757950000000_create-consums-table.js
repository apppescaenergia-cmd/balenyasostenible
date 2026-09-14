/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
    // Taula creada historicament en produccio amb SQL directe fora de migracions.
    // cap_energetic/datadis ara ja estan versionades per la branca main upstream.
    // La columna interpolated_at l'afegeix la migracio 1758000000000_add-interpolated-at,
    // per tant no es crea aqui.
    pgm.createTable('consums', {
        id: 'id',
        timestamp: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
        device_id: { type: 'varchar(50)', notNull: true },
        cups: { type: 'varchar(30)', notNull: true },
        dispositiu: { type: 'varchar(80)', notNull: true },
        energia_wh: { type: 'numeric(12,3)', notNull: false },
        potencia_w: { type: 'numeric(10,2)', notNull: false },
        energia_total_wh: { type: 'numeric(15,3)', notNull: true },
        created_at: { type: 'timestamptz', notNull: false, default: pgm.func('NOW()') }
    });

    pgm.createIndex('consums', ['cups', 'device_id', { name: 'timestamp', sort: 'DESC' }], { name: 'idx_consums_cups_device' });
    pgm.createIndex('consums', ['cups', { name: 'timestamp', sort: 'DESC' }], { name: 'idx_consums_cups_timestamp' });
    pgm.createIndex('consums', ['dispositiu', { name: 'timestamp', sort: 'DESC' }], { name: 'idx_consums_dispositiu' });
    pgm.createIndex('consums', 'energia_total_wh', { name: 'idx_consums_energia_total' });
    pgm.createIndex('consums', { name: 'timestamp', sort: 'DESC' }, { name: 'idx_consums_timestamp' });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
    pgm.dropTable('consums');
};