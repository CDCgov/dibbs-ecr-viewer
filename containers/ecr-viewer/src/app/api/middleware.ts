import { NextApiRequest, NextApiResponse } from "next";

import { hasPendingMigrations } from "@/app/data/db/utils/migrate";

/**
 *
 * @param handler Next request handler
 * @returns async callback function that checks for pending migrations before calling handler
 */
export function withMigrationCheck(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>,
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
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
    }
  };
}
