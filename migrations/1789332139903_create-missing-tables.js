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
    // Tablas creadas previamente en produccion con SQL directo
    // (no versionadas). Se versionan aqui para reproducir el esquema.

    // 1. balanc_energetic
    pgm.createTable('balanc_energetic', {
        id: {
            type: 'uuid',
            notNull: true,
            primaryKey: true,
            default: pgm.func('uuid_generate_v4()')
        },
        user_id: {
            type: 'uuid',
            notNull: true,
            references: 'users(id)',
            onDelete: 'CASCADE'
        },
        cups: { type: 'text', notNull: true },
        generator_code: { type: 'text', notNull: true },
        participation_pct: { type: 'numeric(5,2)', notNull: true },
        generator_total_cumulative_wh: { type: 'numeric', notNull: true, default: 0 },
        generator_total_wh: { type: 'numeric', notNull: true, default: 0 },
        allocated_wh: { type: 'numeric', notNull: true, default: 0 },
        consumption_wh: { type: 'numeric', notNull: true, default: 0 },
        balance_wh: { type: 'numeric', notNull: true, default: 0 },
        timestamp: { type: 'timestamptz', notNull: true },
        created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
        interpolated_at: { type: 'timestamptz', notNull: false }
    });

    pgm.addConstraint('balanc_energetic', 'unique_user_generator_timestamp', {
        unique: ['user_id', 'generator_code', 'timestamp']
    });
    pgm.createIndex('balanc_energetic', 'interpolated_at', { name: 'balanc_energetic_interpolated_at_index' });
    pgm.createIndex('balanc_energetic', ['generator_code', 'timestamp'], { name: 'idx_balanc_generator_time' });
    pgm.createIndex('balanc_energetic', 'timestamp', { name: 'idx_balanc_timestamp', method: 'btree' });
    pgm.createIndex('balanc_energetic', ['user_id', 'timestamp'], { name: 'idx_balanc_user_time' });

    // 2. consums
    pgm.createTable('consums', {
        id: 'id',
        timestamp: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
        device_id: { type: 'varchar(50)', notNull: true },
        cups: { type: 'varchar(30)', notNull: true },
        dispositiu: { type: 'varchar(80)', notNull: true },
        energia_wh: { type: 'numeric(12,3)', notNull: false },
        potencia_w: { type: 'numeric(10,2)', notNull: false },
        energia_total_wh: { type: 'numeric(15,3)', notNull: true },
        created_at: { type: 'timestamptz', notNull: false, default: pgm.func('NOW()') },
        interpolated_at: { type: 'timestamptz', notNull: false }
    });

    pgm.createIndex('consums', 'interpolated_at', { name: 'consums_interpolated_at_index' });
    pgm.createIndex('consums', ['cups', 'device_id', { name: 'timestamp', sort: 'DESC' }], { name: 'idx_consums_cups_device' });
    pgm.createIndex('consums', ['cups', { name: 'timestamp', sort: 'DESC' }], { name: 'idx_consums_cups_timestamp' });
    pgm.createIndex('consums', ['dispositiu', { name: 'timestamp', sort: 'DESC' }], { name: 'idx_consums_dispositiu' });
    pgm.createIndex('consums', 'energia_total_wh', { name: 'idx_consums_energia_total' });
    pgm.createIndex('consums', { name: 'timestamp', sort: 'DESC' }, { name: 'idx_consums_timestamp' });

    // 3. datadis_cache
    pgm.createTable('datadis_cache', {
        id: 'id',
        user_id: {
            type: 'uuid',
            notNull: true,
            references: 'users(id)'
        },
        cups: { type: 'text', notNull: true },
        date: { type: 'date', notNull: true },
        consumption_kwh: { type: 'double precision', notNull: false },
        surplus_kwh: { type: 'double precision', notNull: false },
        generation_kwh: { type: 'double precision', notNull: false },
        self_consumption_kwh: { type: 'double precision', notNull: false },
        obtain_method: { type: 'text', notNull: false },
        fetched_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') }
    });

    pgm.addConstraint('datadis_cache', 'datadis_cache_user_date_unique', {
        unique: ['user_id', 'date']
    });
    pgm.createIndex('datadis_cache', ['user_id', 'cups', 'date'], { name: 'datadis_cache_user_id_cups_date_index' });

    // 4. datadis_cache_hourly
    pgm.createTable('datadis_cache_hourly', {
        id: 'id',
        user_id: {
            type: 'uuid',
            notNull: true,
            references: 'users(id)'
        },
        cups: { type: 'text', notNull: true },
        timestamp: { type: 'timestamptz', notNull: true },
        consumption_kwh: { type: 'double precision', notNull: false },
        surplus_kwh: { type: 'double precision', notNull: false },
        generation_kwh: { type: 'double precision', notNull: false },
        self_consumption_kwh: { type: 'double precision', notNull: false },
        obtain_method: { type: 'text', notNull: false },
        fetched_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') }
    });

    pgm.addConstraint('datadis_cache_hourly', 'datadis_cache_hourly_user_ts_unique', {
        unique: ['user_id', 'timestamp']
    });
    pgm.createIndex('datadis_cache_hourly', ['user_id', 'cups', 'timestamp'], { name: 'datadis_cache_hourly_user_id_cups_timestamp_index' });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
    pgm.dropTable('datadis_cache_hourly');
    pgm.dropTable('datadis_cache');
    pgm.dropTable('consums');
    pgm.dropTable('balanc_energetic');
};