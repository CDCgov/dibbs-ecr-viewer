import fs from "fs";

/**
 * Playwright has a bug with following symlinks. This hacks around it to make sure
 * the viewer is tested in all modes.
 */
export default function gobalSetup() {
  fs.copyFileSync(
    "./e2e/dual/ecr-viewer.spec.ts",
    "./e2e/integrated/ecr-viewer.spec.ts",
  );
}
