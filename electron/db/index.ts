import {createRequire} from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database, {type Database as DatabaseType} from 'better-sqlite3';
import SCHEMA_SQL from './schema.sql?raw';

let db: DatabaseType | null = null;

function resolveUserDataPath(): string {
  const testPath = process.env.KEVLAR_TEST_DB_PATH;
  if (testPath) return path.dirname(testPath);

  try {
    const require = createRequire(import.meta.url);
    const electron = require('electron') as {app?: {getPath(name: string): string}} | string;
    if (typeof electron === 'object' && electron.app) {
      return electron.app.getPath('userData');
    }
  } catch {
    // Tests import the store outside Electron; fall back to a deterministic local path.
  }

  return path.join(os.homedir(), 'Library', 'Application Support', 'Kevlar Codex Desktop');
}

export function getDatabasePath(): string {
  const testPath = process.env.KEVLAR_TEST_DB_PATH;
  if (testPath) return testPath;
  return path.join(resolveUserDataPath(), 'kevlar-codex.db');
}

export function getDB(): DatabaseType {
  if (db) return db;
  const dbPath = getDatabasePath();
  const userData = path.dirname(dbPath);
  fs.mkdirSync(userData, {recursive: true});
  const next = new Database(dbPath);
  next.pragma('journal_mode = WAL');
  next.pragma('foreign_keys = ON');
  next.exec(SCHEMA_SQL);
  db = next;
  return next;
}

export function closeDB(): void {
  db?.close();
  db = null;
}

export type {DatabaseType};
