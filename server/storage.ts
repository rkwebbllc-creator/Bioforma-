import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc } from "drizzle-orm";
import {
  users, supplements, protocols, protocolSupplements, supplementLogs,
  nutritionLogs, dailyTargets, inbodyLogs, ouraSettings, ouraLogs, healthLogs, mealSchedule,
  type User, type InsertUser,
  type Supplement, type InsertSupplement,
  type Protocol, type InsertProtocol,
  type ProtocolSupplement, type InsertProtocolSupplement,
  type SupplementLog, type InsertSupplementLog,
  type NutritionLog, type InsertNutritionLog,
  type DailyTargets, type InsertDailyTargets,
  type InbodyLog, type InsertInbodyLog,
  type OuraSettings, type InsertOuraSettings,
  type OuraLog, type InsertOuraLog,
  type HealthLog, type InsertHealthLog,
  type MealSchedule, type InsertMealSchedule,
} from "@shared/schema";

const sqlite = new Database("fittrack.db");
const db = drizzle(sqlite);

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'free',
    goal TEXT,
    onboarding_complete INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS supplements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',
    dose REAL NOT NULL,
    unit TEXT NOT NULL DEFAULT 'mg',
    timing TEXT NOT NULL DEFAULT 'Any',
    notes TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    schedule_days TEXT
  );
  CREATE TABLE IF NOT EXISTS protocols (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    goal TEXT NOT NULL DEFAULT 'General',
    active INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS protocol_supplements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    protocol_id INTEGER NOT NULL,
    supplement_id INTEGER NOT NULL,
    custom_dose REAL,
    custom_unit TEXT,
    timing TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS supplement_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplement_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    taken_at TEXT,
    notes TEXT
  );
  CREATE TABLE IF NOT EXISTS nutrition_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    meal_name TEXT NOT NULL,
    calories REAL NOT NULL DEFAULT 0,
    protein REAL NOT NULL DEFAULT 0,
    carbs REAL NOT NULL DEFAULT 0,
    fat REAL NOT NULL DEFAULT 0,
    notes TEXT,
    logged_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS daily_targets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    calories REAL NOT NULL DEFAULT 2500,
    protein REAL NOT NULL DEFAULT 180,
    carbs REAL NOT NULL DEFAULT 250,
    fat REAL NOT NULL DEFAULT 80,
    water REAL NOT NULL DEFAULT 3
  );
  CREATE TABLE IF NOT EXISTS inbody_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    weight REAL,
    body_fat_percent REAL,
    muscle_mass REAL,
    bmi REAL,
    bmr REAL,
    visceral_fat REAL,
    body_water REAL,
    bone_mass REAL,
    protein_mass REAL,
    lean_mass REAL,
    notes TEXT
  );
  CREATE TABLE IF NOT EXISTS oura_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    personal_access_token TEXT,
    connected INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS meal_schedule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meal_count INTEGER NOT NULL DEFAULT 3,
    meals TEXT NOT NULL DEFAULT '[]',
    reminders_enabled INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS health_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    source TEXT DEFAULT 'Apple Health',
    hrv INTEGER,
    resting_heart_rate INTEGER,
    sleep_duration INTEGER,
    deep_sleep INTEGER,
    rem_sleep INTEGER,
    light_sleep INTEGER,
    steps INTEGER,
    active_calories INTEGER,
    total_calories INTEGER,
    respiratory_rate INTEGER,
    spo2 INTEGER,
    notes TEXT
  );
  CREATE TABLE IF NOT EXISTS oura_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    readiness_score INTEGER,
    sleep_score INTEGER,
    activity_score INTEGER,
    hrv INTEGER,
    resting_heart_rate INTEGER,
    sleep_duration INTEGER,
    deep_sleep INTEGER,
    rem_sleep INTEGER,
    steps INTEGER,
    active_calories INTEGER,
    total_calories INTEGER,
    notes TEXT
  );
`);

// Migrate: add schedule_days column if not present (safe to run repeatedly)
try { sqlite.exec("ALTER TABLE supplements ADD COLUMN schedule_days TEXT"); } catch (_) {}

// Seed defaults
if (!db.select().from(dailyTargets).get()) {
  db.insert(dailyTargets).values({ calories: 2500, protein: 180, carbs: 250, fat: 80, water: 3 }).run();
}
if (!db.select().from(ouraSettings).get()) {
  db.insert(ouraSettings).values({ personalAccessToken: null, connected: false }).run();
}

export interface IStorage {
  // Users
  createUser(data: InsertUser): User;
  getUserByEmail(email: string): User | undefined;
  getUserById(id: number): User | undefined;
  updateUser(id: number, data: Partial<InsertUser>): User | undefined;

  getSupplements(): Supplement[];
  getSupplement(id: number): Supplement | undefined;
  createSupplement(data: InsertSupplement): Supplement;
  updateSupplement(id: number, data: Partial<InsertSupplement>): Supplement | undefined;
  deleteSupplement(id: number): void;

  getProtocols(): Protocol[];
  getProtocol(id: number): Protocol | undefined;
  createProtocol(data: InsertProtocol): Protocol;
  updateProtocol(id: number, data: Partial<InsertProtocol>): Protocol | undefined;
  deleteProtocol(id: number): void;
  setActiveProtocol(id: number | null): void;

  getProtocolSupplements(protocolId: number): ProtocolSupplement[];
  addProtocolSupplement(data: InsertProtocolSupplement): ProtocolSupplement;
  removeProtocolSupplement(id: number): void;

  getSupplementLogs(date: string): SupplementLog[];
  logSupplement(data: InsertSupplementLog): SupplementLog;
  removeSupplementLog(id: number): void;

  getNutritionLogs(date: string): NutritionLog[];
  createNutritionLog(data: InsertNutritionLog): NutritionLog;
  updateNutritionLog(id: number, data: Partial<InsertNutritionLog>): NutritionLog | undefined;
  deleteNutritionLog(id: number): void;
  getNutritionHistory(days: number): NutritionLog[];

  getDailyTargets(): DailyTargets;
  updateDailyTargets(data: Partial<InsertDailyTargets>): DailyTargets;

  getInbodyLogs(): InbodyLog[];
  getLatestInbodyLog(): InbodyLog | undefined;
  createInbodyLog(data: InsertInbodyLog): InbodyLog;
  updateInbodyLog(id: number, data: Partial<InsertInbodyLog>): InbodyLog | undefined;
  deleteInbodyLog(id: number): void;

  getOuraSettings(): OuraSettings;
  updateOuraSettings(data: Partial<InsertOuraSettings>): OuraSettings;

  getOuraLogs(days?: number): OuraLog[];
  getLatestOuraLog(): OuraLog | undefined;
  upsertOuraLog(data: InsertOuraLog): OuraLog;
  importOuraLogs(rows: InsertOuraLog[]): { imported: number; updated: number };

  getHealthLogs(days?: number): HealthLog[];
  getLatestHealthLog(): HealthLog | undefined;
  upsertHealthLog(data: InsertHealthLog): HealthLog;
  syncHealthLogs(rows: InsertHealthLog[]): { synced: number; updated: number };

  getMealSchedule(): MealSchedule;
  updateMealSchedule(data: Partial<InsertMealSchedule>): MealSchedule;

  exportAllData(): {
    exportDate: string;
    supplements: Supplement[];
    protocols: Protocol[];
    protocolSupplements: ProtocolSupplement[];
    supplementLogs: SupplementLog[];
    nutritionLogs: NutritionLog[];
    dailyTargets: DailyTargets | null;
    inbodyLogs: InbodyLog[];
    healthLogs: HealthLog[];
    mealSchedule: MealSchedule | null;
  };
}

export class Storage implements IStorage {
  // ── Users ──────────────────────────────────────────────────────────────────
  createUser(data: InsertUser) { return db.insert(users).values(data).returning().get(); }
  getUserByEmail(email: string) { return db.select().from(users).where(eq(users.email, email)).get(); }
  getUserById(id: number) { return db.select().from(users).where(eq(users.id, id)).get(); }
  updateUser(id: number, data: Partial<InsertUser>) {
    return db.update(users).set(data).where(eq(users.id, id)).returning().get();
  }

  getSupplements() { return db.select().from(supplements).all(); }
  getSupplement(id: number) { return db.select().from(supplements).where(eq(supplements.id, id)).get(); }
  createSupplement(data: InsertSupplement) { return db.insert(supplements).values(data).returning().get(); }
  updateSupplement(id: number, data: Partial<InsertSupplement>) {
    return db.update(supplements).set(data).where(eq(supplements.id, id)).returning().get();
  }
  deleteSupplement(id: number) { db.delete(supplements).where(eq(supplements.id, id)).run(); }

  getProtocols() { return db.select().from(protocols).all(); }
  getProtocol(id: number) { return db.select().from(protocols).where(eq(protocols.id, id)).get(); }
  createProtocol(data: InsertProtocol) { return db.insert(protocols).values(data).returning().get(); }
  updateProtocol(id: number, data: Partial<InsertProtocol>) {
    return db.update(protocols).set(data).where(eq(protocols.id, id)).returning().get();
  }
  deleteProtocol(id: number) {
    db.delete(protocolSupplements).where(eq(protocolSupplements.protocolId, id)).run();
    db.delete(protocols).where(eq(protocols.id, id)).run();
  }
  setActiveProtocol(id: number | null) {
    db.update(protocols).set({ active: false }).run();
    if (id !== null) db.update(protocols).set({ active: true }).where(eq(protocols.id, id)).run();
  }

  getProtocolSupplements(protocolId: number) {
    return db.select().from(protocolSupplements).where(eq(protocolSupplements.protocolId, protocolId)).all();
  }
  addProtocolSupplement(data: InsertProtocolSupplement) {
    return db.insert(protocolSupplements).values(data).returning().get();
  }
  removeProtocolSupplement(id: number) {
    db.delete(protocolSupplements).where(eq(protocolSupplements.id, id)).run();
  }

  getSupplementLogs(date: string) {
    return db.select().from(supplementLogs).where(eq(supplementLogs.date, date)).all();
  }
  logSupplement(data: InsertSupplementLog) { return db.insert(supplementLogs).values(data).returning().get(); }
  removeSupplementLog(id: number) { db.delete(supplementLogs).where(eq(supplementLogs.id, id)).run(); }

  getNutritionLogs(date: string) {
    return db.select().from(nutritionLogs).where(eq(nutritionLogs.date, date)).all();
  }
  createNutritionLog(data: InsertNutritionLog) { return db.insert(nutritionLogs).values(data).returning().get(); }
  updateNutritionLog(id: number, data: Partial<InsertNutritionLog>) {
    return db.update(nutritionLogs).set(data).where(eq(nutritionLogs.id, id)).returning().get();
  }
  deleteNutritionLog(id: number) { db.delete(nutritionLogs).where(eq(nutritionLogs.id, id)).run(); }
  getNutritionHistory(days: number) {
    return db.select().from(nutritionLogs).orderBy(desc(nutritionLogs.date)).all().slice(0, days * 8);
  }

  getDailyTargets() { return db.select().from(dailyTargets).get()!; }
  updateDailyTargets(data: Partial<InsertDailyTargets>) {
    const existing = db.select().from(dailyTargets).get();
    if (existing) return db.update(dailyTargets).set(data).where(eq(dailyTargets.id, existing.id)).returning().get()!;
    return db.insert(dailyTargets).values({ calories: 2500, protein: 180, carbs: 250, fat: 80, water: 3, ...data }).returning().get();
  }

  getInbodyLogs() { return db.select().from(inbodyLogs).orderBy(desc(inbodyLogs.date)).all(); }
  getLatestInbodyLog() { return db.select().from(inbodyLogs).orderBy(desc(inbodyLogs.date)).get(); }
  createInbodyLog(data: InsertInbodyLog) { return db.insert(inbodyLogs).values(data).returning().get(); }
  updateInbodyLog(id: number, data: Partial<InsertInbodyLog>) {
    return db.update(inbodyLogs).set(data).where(eq(inbodyLogs.id, id)).returning().get();
  }
  deleteInbodyLog(id: number) { db.delete(inbodyLogs).where(eq(inbodyLogs.id, id)).run(); }

  getOuraSettings() { return db.select().from(ouraSettings).get()!; }
  updateOuraSettings(data: Partial<InsertOuraSettings>) {
    const existing = db.select().from(ouraSettings).get();
    if (existing) return db.update(ouraSettings).set(data).where(eq(ouraSettings.id, existing.id)).returning().get()!;
    return db.insert(ouraSettings).values({ personalAccessToken: null, connected: false, ...data }).returning().get();
  }

  getOuraLogs(days = 90) {
    return db.select().from(ouraLogs).orderBy(desc(ouraLogs.date)).all().slice(0, days);
  }
  getLatestOuraLog() {
    return db.select().from(ouraLogs).orderBy(desc(ouraLogs.date)).get();
  }
  upsertOuraLog(data: InsertOuraLog) {
    const existing = db.select().from(ouraLogs).where(eq(ouraLogs.date, data.date)).get();
    if (existing) {
      return db.update(ouraLogs).set(data).where(eq(ouraLogs.id, existing.id)).returning().get()!;
    }
    return db.insert(ouraLogs).values(data).returning().get();
  }
  importOuraLogs(rows: InsertOuraLog[]) {
    let imported = 0, updated = 0;
    for (const row of rows) {
      const existing = db.select().from(ouraLogs).where(eq(ouraLogs.date, row.date)).get();
      if (existing) {
        db.update(ouraLogs).set(row).where(eq(ouraLogs.id, existing.id)).run();
        updated++;
      } else {
        db.insert(ouraLogs).values(row).run();
        imported++;
      }
    }
    return { imported, updated };
  }

  getHealthLogs(days = 90) {
    return db.select().from(healthLogs).orderBy(desc(healthLogs.date)).all().slice(0, days);
  }
  getLatestHealthLog() {
    return db.select().from(healthLogs).orderBy(desc(healthLogs.date)).get();
  }
  upsertHealthLog(data: InsertHealthLog) {
    const existing = db.select().from(healthLogs).where(eq(healthLogs.date, data.date)).get();
    if (existing) return db.update(healthLogs).set(data).where(eq(healthLogs.id, existing.id)).returning().get()!;
    return db.insert(healthLogs).values(data).returning().get();
  }
  getMealSchedule() {
    let row = db.select().from(mealSchedule).get();
    if (!row) row = db.insert(mealSchedule).values({ mealCount: 3, meals: JSON.stringify([
      { id: 1, name: "Breakfast", time: "07:30", enabled: true, targetCalories: 0, targetProtein: 0 },
      { id: 2, name: "Lunch",     time: "12:30", enabled: true, targetCalories: 0, targetProtein: 0 },
      { id: 3, name: "Dinner",    time: "18:30", enabled: true, targetCalories: 0, targetProtein: 0 },
    ]), remindersEnabled: false }).returning().get()!;
    return row!;
  }
  updateMealSchedule(data: Partial<InsertMealSchedule>) {
    const existing = db.select().from(mealSchedule).get();
    if (existing) return db.update(mealSchedule).set(data).where(eq(mealSchedule.id, existing.id)).returning().get()!;
    return db.insert(mealSchedule).values({ mealCount: 3, meals: "[]", remindersEnabled: false, ...data }).returning().get();
  }

  syncHealthLogs(rows: InsertHealthLog[]) {
    let synced = 0, updated = 0;
    for (const row of rows) {
      const existing = db.select().from(healthLogs).where(eq(healthLogs.date, row.date)).get();
      if (existing) { db.update(healthLogs).set(row).where(eq(healthLogs.id, existing.id)).run(); updated++; }
      else { db.insert(healthLogs).values(row).run(); synced++; }
    }
    return { synced, updated };
  }

  exportAllData() {
    // Fetch all protocol supplements by iterating protocols
    const allProtocols = db.select().from(protocols).all();
    const allProtocolSupplements: ProtocolSupplement[] = [];
    for (const p of allProtocols) {
      const ps = db.select().from(protocolSupplements).where(eq(protocolSupplements.protocolId, p.id)).all();
      allProtocolSupplements.push(...ps);
    }

    // Fetch all supplement logs
    const allSupplementLogs = db.select().from(supplementLogs).orderBy(desc(supplementLogs.date)).all();

    // Fetch all nutrition logs
    const allNutritionLogs = db.select().from(nutritionLogs).orderBy(desc(nutritionLogs.date)).all();

    return {
      exportDate: new Date().toISOString(),
      supplements: db.select().from(supplements).all(),
      protocols: allProtocols,
      protocolSupplements: allProtocolSupplements,
      supplementLogs: allSupplementLogs,
      nutritionLogs: allNutritionLogs,
      dailyTargets: db.select().from(dailyTargets).get() ?? null,
      inbodyLogs: db.select().from(inbodyLogs).orderBy(desc(inbodyLogs.date)).all(),
      healthLogs: db.select().from(healthLogs).orderBy(desc(healthLogs.date)).all(),
      mealSchedule: db.select().from(mealSchedule).get() ?? null,
    };
  }
}

export const storage = new Storage();
