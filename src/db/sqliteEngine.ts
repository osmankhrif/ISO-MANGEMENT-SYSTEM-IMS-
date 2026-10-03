// @ts-ignore
import initSqlJs from 'sql.js/dist/sql-asm.js';
import type { Database, SqlJsStatic } from 'sql.js';
import { SCHEMA_SQL } from './schema.sql.ts';
import { SEED_DATA_SQL } from './seedData.ts';

const IDB_NAME = 'ISOSystemIMS_SQLiteDB';
const IDB_STORE = 'sqlite_storage';
const IDB_KEY = 'audit_database_binary';

class SqliteEngine {
  private db: Database | null = null;
  private SQL: SqlJsStatic | null = null;
  private isInitializing: Promise<void> | null = null;
  private saveTimeout: any = null;

  async init(): Promise<void> {
    if (this.db) return;
    if (this.isInitializing) return this.isInitializing;

    this.isInitializing = (async () => {
      try {
        // sql-asm.js is pure JavaScript SQLite (no .wasm file fetch or MIME type issues)
        this.SQL = await (initSqlJs as any)();

        if (!this.SQL) {
          throw new Error('SQLite engine failed to load');
        }

        // Try to load existing binary from IndexedDB
        const storedBinary = await this.loadFromIndexedDB();
        if (storedBinary && storedBinary.length > 0) {
          try {
            this.db = new this.SQL.Database(storedBinary);
            // Ensure any missing tables (e.g. from schema updates) are created
            this.db.exec(SCHEMA_SQL);
            const migrations = [
              'ALTER TABLE audits ADD COLUMN site TEXT;',
              'ALTER TABLE findings ADD COLUMN affected_procedures_json TEXT;',
              'ALTER TABLE findings ADD COLUMN affected_risks_json TEXT;',
              'ALTER TABLE findings ADD COLUMN affected_competencies_json TEXT;',
              'ALTER TABLE findings ADD COLUMN insurance_loss_prevention_json TEXT;',
              'ALTER TABLE corrective_actions ADD COLUMN implementation_decision TEXT;',
              'ALTER TABLE corrective_actions ADD COLUMN implementation_reviewer TEXT;',
              'ALTER TABLE corrective_actions ADD COLUMN implementation_date TEXT;',
              'ALTER TABLE corrective_actions ADD COLUMN implementation_evidence TEXT;',
              'ALTER TABLE corrective_actions ADD COLUMN effectiveness_decision TEXT;',
              'ALTER TABLE corrective_actions ADD COLUMN effectiveness_reviewer TEXT;',
              'ALTER TABLE corrective_actions ADD COLUMN effectiveness_date TEXT;',
              'ALTER TABLE corrective_actions ADD COLUMN effectiveness_evidence TEXT;',
              'ALTER TABLE corrective_actions ADD COLUMN evaluation_window_days INTEGER DEFAULT 60;',
              'ALTER TABLE corrective_actions ADD COLUMN affected_procedures_json TEXT;',
              'ALTER TABLE corrective_actions ADD COLUMN affected_risks_json TEXT;',
              'ALTER TABLE corrective_actions ADD COLUMN affected_competencies_json TEXT;',
              'ALTER TABLE corrective_actions ADD COLUMN insurance_loss_prevention_json TEXT;',
            ];
            for (const mig of migrations) {
              try {
                this.db.exec(mig);
              } catch {
                // column already exists, safe to ignore
              }
            }
            try {
              this.db.exec(`
                UPDATE settings SET value = 'ISO System (IMS)' WHERE key = 'company_name' AND value LIKE '%PetroApex%';
                UPDATE settings SET value = 'ISO System (IMS) - Proprietary Audit Document by Osman Khrif.' WHERE key = 'custom_report_disclaimer' AND (value LIKE '%PetroApex%' OR value = 'Proprietary audit data.');
                UPDATE users SET full_name = 'Osman Khrif (Lead Administrator)' WHERE id = 'usr-1';
              `);
            } catch {
              // ignore
            }
            console.log('SQLite database loaded from IndexedDB');
            return;
          } catch (e) {
            console.warn('Failed to parse stored SQLite database, creating fresh one:', e);
          }
        }

        // Fresh database initialization
        this.db = new this.SQL.Database();
        this.db.exec(SCHEMA_SQL);
        this.db.exec(SEED_DATA_SQL);
        await this.persistToIndexedDB();
        console.log('Fresh SQLite database initialized and seeded');
      } catch (err) {
        console.error('Fatal SQLite initialization error:', err);
        throw err;
      }
    })();

    return this.isInitializing;
  }

  getDb(): Database {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }
    return this.db;
  }

  query<T = any>(sql: string, params: any[] = []): T[] {
    const db = this.getDb();
    const stmt = db.prepare(sql);
    const results: T[] = [];
    try {
      stmt.bind(params);
      while (stmt.step()) {
        results.push(stmt.getAsObject() as unknown as T);
      }
    } finally {
      stmt.free();
    }
    return results;
  }

  queryOne<T = any>(sql: string, params: any[] = []): T | null {
    const rows = this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  run(sql: string, params: any[] = []): { changes: number } {
    const db = this.getDb();
    db.run(sql, params);
    const changes = db.getRowsModified();
    this.scheduleSave();
    return { changes };
  }

  exec(sql: string): void {
    const db = this.getDb();
    db.exec(sql);
    this.scheduleSave();
  }

  exportDatabase(): Uint8Array {
    const db = this.getDb();
    return db.export();
  }

  async importDatabase(binary: Uint8Array): Promise<void> {
    if (!this.SQL) {
      await this.init();
    }
    if (!this.SQL) throw new Error('SQL engine failed to load');

    // Close previous db if open
    if (this.db) {
      this.db.close();
    }

    this.db = new this.SQL.Database(binary);
    // Ensure all tables exist
    this.db.exec(SCHEMA_SQL);
    await this.persistToIndexedDB();
  }

  async resetToDemoData(): Promise<void> {
    if (!this.SQL) await this.init();
    if (this.db) this.db.close();
    this.db = new this.SQL!.Database();
    this.db.exec(SCHEMA_SQL);
    this.db.exec(SEED_DATA_SQL);
    await this.persistToIndexedDB();
  }

  async deleteDemoData(): Promise<void> {
    const db = this.getDb();
    // Remove all records where is_demo = 1 or linked to demo audits
    db.run("DELETE FROM corrective_actions WHERE finding_id IN (SELECT id FROM findings WHERE is_demo = 1)");
    db.run("DELETE FROM follow_ups WHERE audit_id IN (SELECT id FROM audits WHERE is_demo = 1)");
    db.run("DELETE FROM audit_responses WHERE audit_id IN (SELECT id FROM audits WHERE is_demo = 1)");
    db.run("DELETE FROM findings WHERE is_demo = 1");
    db.run("DELETE FROM checklist_items WHERE checklist_id IN (SELECT id FROM checklists WHERE audit_id IN (SELECT id FROM audits WHERE is_demo = 1))");
    db.run("DELETE FROM checklists WHERE audit_id IN (SELECT id FROM audits WHERE is_demo = 1)");
    db.run("DELETE FROM audits WHERE is_demo = 1");
    await this.persistToIndexedDB();
  }

  private scheduleSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.persistToIndexedDB().catch(console.error);
    }, 400);
  }

  private openIndexedDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(IDB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async loadFromIndexedDB(): Promise<Uint8Array | null> {
    try {
      const idb = await this.openIndexedDB();
      return new Promise((resolve) => {
        const tx = idb.transaction(IDB_STORE, 'readonly');
        const store = tx.objectStore(IDB_STORE);
        const req = store.get(IDB_KEY);
        req.onsuccess = () => {
          resolve(req.result ? new Uint8Array(req.result) : null);
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  private async persistToIndexedDB(): Promise<void> {
    if (!this.db) return;
    try {
      const binary = this.db.export();
      const idb = await this.openIndexedDB();
      return new Promise((resolve, reject) => {
        const tx = idb.transaction(IDB_STORE, 'readwrite');
        const store = tx.objectStore(IDB_STORE);
        const req = store.put(binary.buffer, IDB_KEY);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('Failed to persist SQLite database to IndexedDB:', err);
    }
  }
}

export const sqlite = new SqliteEngine();
