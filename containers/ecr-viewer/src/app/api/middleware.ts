import { NextApiRequest, NextApiResponse } from "next";

import { getDbUtils } from "@/app/data/db/utils";

import { getUnvalidatedDb } from "./services/database";

/**
 *
 * @param handler
 */
export function withMigrationCheck(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>,
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const db = getUnvalidatedDb<any>();
    try {
      const hasPending = await getDbUtils().hasPendingMigrations(db);
      if (hasPending) {
        res.status(422).json({ error: "Database needs migration" });
        return;
      }
      await handler(req, res);
    } catch (error) {
      res
        .status(500)
        .json({ error: `Migration check failed: ${error.message}` });
    } finally {
      await db.destroy();
    }
  };
}
