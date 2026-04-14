import { writeFileSync, readFileSync } from "fs";
import { join } from "path";

const [type = "core", name = "migration"] = process.argv.slice(2);

const timestamp = new Date()
  .toISOString()
  .replace(/[-:T]/g, "")
  .slice(0, 14);

const filename = `${timestamp}_${name}.ts`;
const filenameNoExt = `${timestamp}_${name}`;
const dir = join("src/app/api/migrate-db/migrations", type);
const filepath = join(dir, filename);

const template = `import { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {}

export async function down(db: Kysely<unknown>): Promise<void> {}
`;

writeFileSync(filepath, template);
console.log("Created", filepath);

const indexPath = join(dir, "index.ts");
const indexContent = readFileSync(indexPath, "utf8");
const newEntry = `  "${filename}": require("./${filenameNoExt}"),\n`;
const updated = indexContent.replace(/^};$/m, `${newEntry}};`);
writeFileSync(indexPath, updated);
console.log("Updated", indexPath);