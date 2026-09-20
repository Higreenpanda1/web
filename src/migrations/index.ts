import * as migration_20260920_051310_initial from './20260920_051310_initial';

export const migrations = [
  {
    up: migration_20260920_051310_initial.up,
    down: migration_20260920_051310_initial.down,
    name: '20260920_051310_initial'
  },
];
