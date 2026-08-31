import { getDatabase, type DatabaseConnection } from "@netlify/database";

let db: DatabaseConnection | null = null;

export function getDb(): DatabaseConnection {
  if (!db) {
    db = getDatabase();
  }
  return db;
}
