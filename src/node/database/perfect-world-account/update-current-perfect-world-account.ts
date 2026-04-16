import { db } from 'csdm/node/database/database';

export async function updateCurrentPerfectWorldAccount(accountId: string) {
  await db.transaction().execute(async (transaction) => {
    await transaction
      .updateTable('perfect_world_accounts')
      .set({
        is_current: false,
      })
      .where('id', '<>', accountId)
      .execute();
    await transaction
      .updateTable('perfect_world_accounts')
      .set({
        is_current: true,
      })
      .where('id', '=', accountId)
      .execute();
  });
}
