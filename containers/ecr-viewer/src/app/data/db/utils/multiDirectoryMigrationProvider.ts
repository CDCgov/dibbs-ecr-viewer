import { promises as fs } from "fs";
import * as path from "path";
import { Migration, MigrationProvider } from "kysely";

export class MultiDirectoryMigrationProvider implements MigrationProvider {
  private directories: string[];
  private fs: typeof fs;
  private path: typeof path;
  private migrationPathsPromise: Promise<Map<string, string>>;

  constructor(
    directories: string[],
    fileSystem: typeof fs,
    filePath: typeof path,
  ) {
    this.directories = directories;
    this.fs = fileSystem;
    this.path = filePath;
    this.migrationPathsPromise = this.getAllMigrationPaths();
  }

  private async getAllMigrationPaths(): Promise<Map<string, string>> {
    const migrationPaths = new Map<string, string>();

    for (const dir of this.directories) {
      const files = await this.fs.readdir(dir);
      for (const file of files) {
        if (file.endsWith(".ts") || file.endsWith(".js")) {
          const name = this.path.basename(file, this.path.extname(file));
          if (migrationPaths.has(name)) {
            throw new Error(
              `Duplicate migration name "${name}" found in "${migrationPaths.get(
                name,
              )}" and "${dir}"`,
            );
          }
          migrationPaths.set(name, this.path.join(dir, file));
        }
      }
    }
    return migrationPaths;
  }

  async getMigrations(): Promise<Record<string, Migration>> {
    const migrationPaths = await this.migrationPathsPromise;
    const migrations: Record<string, Migration> = {};

    for (const [name, filePath] of migrationPaths) {
      const module = await import(filePath);
      migrations[name] = module;
    }

    return migrations;
  }
}
