import { NextApiRequest, NextApiResponse } from "next";

import { hasPendingMigrations } from "@/app/data/db/utils/migrate";
import { AnyDb } from "@/app/data/db/utils/types";

import { getUnvalidatedDb } from "./services/database";

/**
 *
 * @param handler Next request handler
 * @returns async callback function that checks for pending migrations before calling handler
 */
export function withMigrationCheck(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>,
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const db = getUnvalidatedDb<AnyDb>();
    try {
      const hasPending = await hasPendingMigrations();
      if (hasPending) {
        res.status(422).json({ error: "Database needs migration" });
        return;
      }
      await handler(req, res);
    } catch (error) {
      res.status(500).json({
        error: `Migration check failed: ${(error as Error)?.message}`,
      });
    } finally {
      await db.destroy();
    }
  };
}
