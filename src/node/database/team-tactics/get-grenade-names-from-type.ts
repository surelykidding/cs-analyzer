import { GrenadeName } from 'csdm/common/types/counter-strike';
import { assertNever } from 'csdm/common/assert-never';
import {
  TeamTacticsGrenadeType,
  type TeamTacticsGrenadeType as TeamTacticsGrenadeTypeName,
} from 'csdm/common/types/team-tactics';

export function getGrenadeNamesFromType(grenadeType: TeamTacticsGrenadeTypeName): GrenadeName[] {
  switch (grenadeType) {
    case TeamTacticsGrenadeType.All:
      return [
        GrenadeName.Smoke,
        GrenadeName.Flashbang,
        GrenadeName.HE,
        GrenadeName.Molotov,
        GrenadeName.Incendiary,
        GrenadeName.Decoy,
      ];
    case TeamTacticsGrenadeType.Smoke:
      return [GrenadeName.Smoke];
    case TeamTacticsGrenadeType.Flashbang:
      return [GrenadeName.Flashbang];
    case TeamTacticsGrenadeType.HeGrenade:
      return [GrenadeName.HE];
    case TeamTacticsGrenadeType.Fire:
      return [GrenadeName.Molotov, GrenadeName.Incendiary];
    case TeamTacticsGrenadeType.Decoy:
      return [GrenadeName.Decoy];
    default:
      return assertNever(grenadeType, `Unsupported team tactics grenade type: ${grenadeType}`);
  }
}
