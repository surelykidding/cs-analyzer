import { describe, expect, it } from 'vite-plus/test';
import { GrenadeName } from 'csdm/common/types/counter-strike';
import { TeamTacticsGrenadeType } from 'csdm/common/types/team-tactics';
import { getGrenadeNamesFromType } from './get-grenade-names-from-type';

describe('getGrenadeNamesFromType', () => {
  it('should resolve all grenade names for the all filter', () => {
    expect(getGrenadeNamesFromType(TeamTacticsGrenadeType.All)).toEqual([
      GrenadeName.Smoke,
      GrenadeName.Flashbang,
      GrenadeName.HE,
      GrenadeName.Molotov,
      GrenadeName.Incendiary,
      GrenadeName.Decoy,
    ]);
  });

  it('should merge molotov and incendiary into the fire filter', () => {
    expect(getGrenadeNamesFromType(TeamTacticsGrenadeType.Fire)).toEqual([
      GrenadeName.Molotov,
      GrenadeName.Incendiary,
    ]);
  });
});
