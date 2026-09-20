import * as migration_20260920_061227_initial from './20260920_061227_initial';

export const migrations = [
  {
    up: migration_20260920_061227_initial.up,
    down: migration_20260920_061227_initial.down,
    name: '20260920_061227_initial'
  },
];
