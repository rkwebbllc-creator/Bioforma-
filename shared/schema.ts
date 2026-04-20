import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  plan: text("plan").notNull().default("free"), // 'free' | 'pro'
  goal: text("goal"),                           // e.g. 'Fat Loss', 'Muscle Gain'
  onboardingComplete: integer("onboarding_complete", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
});
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ─── Supplements library ───────────────────────────────────────────────────
export const supplements = sqliteTable("supplements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  category: text("category").notNull().default("General"),
  dose: real("dose").notNull(),
  unit: text("unit").notNull().default("mg"),
  timing: text("timing").notNull().default("Any"),
  notes: text("notes"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  scheduleDays: text("schedule_days"),  // JSON array e.g. ["Mon","Wed","Fri"] — null means daily
});
export const insertSupplementSchema = createInsertSchema(supplements).omit({ id: true });
export type InsertSupplement = z.infer<typeof insertSupplementSchema>;
export type Supplement = typeof supplements.$inferSelect;

// ─── Protocols (stacking routines) ────────────────────────────────────────
export const protocols = sqliteTable("protocols", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  goal: text("goal").notNull().default("General"),
  active: integer("active", { mode: "boolean" }).notNull().default(false),
});
export const insertProtocolSchema = createInsertSchema(protocols).omit({ id: true });
export type InsertProtocol = z.infer<typeof insertProtocolSchema>;
export type Protocol = typeof protocols.$inferSelect;

// ─── Protocol → Supplement join ────────────────────────────────────────────
export const protocolSupplements = sqliteTable("protocol_supplements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  protocolId: integer("protocol_id").notNull(),
  supplementId: integer("supplement_id").notNull(),
  customDose: real("custom_dose"),
  customUnit: text("custom_unit"),
  timing: text("timing"),
  sortOrder: integer("sort_order").notNull().default(0),
});
export const insertProtocolSupplementSchema = createInsertSchema(protocolSupplements).omit({ id: true });
export type InsertProtocolSupplement = z.infer<typeof insertProtocolSupplementSchema>;
export type ProtocolSupplement = typeof protocolSupplements.$inferSelect;

// ─── Daily supplement logs ─────────────────────────────────────────────────
export const supplementLogs = sqliteTable("supplement_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  supplementId: integer("supplement_id").notNull(),
  date: text("date").notNull(),
  takenAt: text("taken_at"),
  notes: text("notes"),
});
export const insertSupplementLogSchema = createInsertSchema(supplementLogs).omit({ id: true });
export type InsertSupplementLog = z.infer<typeof insertSupplementLogSchema>;
export type SupplementLog = typeof supplementLogs.$inferSelect;

// ─── Nutrition logs (meals) ────────────────────────────────────────────────
export const nutritionLogs = sqliteTable("nutrition_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  mealName: text("meal_name").notNull(),
  calories: real("calories").notNull().default(0),
  protein: real("protein").notNull().default(0),
  carbs: real("carbs").notNull().default(0),
  fat: real("fat").notNull().default(0),
  notes: text("notes"),
  loggedAt: text("logged_at").notNull(),
});
export const insertNutritionLogSchema = createInsertSchema(nutritionLogs).omit({ id: true });
export type InsertNutritionLog = z.infer<typeof insertNutritionLogSchema>;
export type NutritionLog = typeof nutritionLogs.$inferSelect;

// ─── Daily targets ─────────────────────────────────────────────────────────
export const dailyTargets = sqliteTable("daily_targets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  calories: real("calories").notNull().default(2500),
  protein: real("protein").notNull().default(180),
  carbs: real("carbs").notNull().default(250),
  fat: real("fat").notNull().default(80),
  water: real("water").notNull().default(3),
});
export const insertDailyTargetsSchema = createInsertSchema(dailyTargets).omit({ id: true });
export type InsertDailyTargets = z.infer<typeof insertDailyTargetsSchema>;
export type DailyTargets = typeof dailyTargets.$inferSelect;

// ─── InBody scan logs (body composition) ──────────────────────────────────
export const inbodyLogs = sqliteTable("inbody_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  weight: real("weight"),           // kg
  bodyFatPercent: real("body_fat_percent"),
  muscleMass: real("muscle_mass"),  // kg (skeletal muscle mass)
  bmi: real("bmi"),
  bmr: real("bmr"),                 // kcal/day (basal metabolic rate)
  visceralFat: real("visceral_fat"), // level 1-20
  bodyWater: real("body_water"),    // kg
  boneMass: real("bone_mass"),      // kg
  proteinMass: real("protein_mass"),// kg
  leanMass: real("lean_mass"),      // kg (fat-free mass)
  notes: text("notes"),
});
export const insertInbodyLogSchema = createInsertSchema(inbodyLogs).omit({ id: true });
export type InsertInbodyLog = z.infer<typeof insertInbodyLogSchema>;
export type InbodyLog = typeof inbodyLogs.$inferSelect;

// ─── Oura settings (single-row, stores PAT) ───────────────────────────────
export const ouraSettings = sqliteTable("oura_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  personalAccessToken: text("personal_access_token"),
  connected: integer("connected", { mode: "boolean" }).notNull().default(false),
});
export const insertOuraSettingsSchema = createInsertSchema(ouraSettings).omit({ id: true });
export type InsertOuraSettings = z.infer<typeof insertOuraSettingsSchema>;
export type OuraSettings = typeof ouraSettings.$inferSelect;

// ─── Oura Ring daily logs (imported from CSV) ────────────────────────────────
export const ouraLogs = sqliteTable("oura_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),          // YYYY-MM-DD (unique per day)
  readinessScore: integer("readiness_score"),
  sleepScore: integer("sleep_score"),
  activityScore: integer("activity_score"),
  hrv: integer("hrv"),                   // ms, avg HRV
  restingHeartRate: integer("resting_heart_rate"), // bpm
  sleepDuration: integer("sleep_duration"),  // seconds
  deepSleep: integer("deep_sleep"),          // seconds
  remSleep: integer("rem_sleep"),            // seconds
  steps: integer("steps"),
  activeCalories: integer("active_calories"),
  totalCalories: integer("total_calories"),
  notes: text("notes"),
});
export const insertOuraLogSchema = createInsertSchema(ouraLogs).omit({ id: true });
export type InsertOuraLog = z.infer<typeof insertOuraLogSchema>;
export type OuraLog = typeof ouraLogs.$inferSelect;

// ─── Apple Health / wearable daily logs ───────────────────────────────────────
export const healthLogs = sqliteTable("health_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),            // YYYY-MM-DD
  source: text("source").default("Apple Health"),
  hrv: integer("hrv"),                     // ms
  restingHeartRate: integer("resting_heart_rate"), // bpm
  sleepDuration: integer("sleep_duration"),// seconds
  deepSleep: integer("deep_sleep"),        // seconds
  remSleep: integer("rem_sleep"),          // seconds
  lightSleep: integer("light_sleep"),      // seconds
  steps: integer("steps"),
  activeCalories: integer("active_calories"),
  totalCalories: integer("total_calories"),
  respiratoryRate: integer("respiratory_rate"), // breaths/min
  spo2: integer("spo2"),                   // %
  notes: text("notes"),
});
export const insertHealthLogSchema = createInsertSchema(healthLogs).omit({ id: true });
export type InsertHealthLog = z.infer<typeof insertHealthLogSchema>;
export type HealthLog = typeof healthLogs.$inferSelect;

// ─── Meal schedule settings ───────────────────────────────────────────────────
export const mealSchedule = sqliteTable("meal_schedule", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  mealCount: integer("meal_count").notNull().default(3),
  // JSON array: [{id, name, time, enabled, targetCalories, targetProtein}]
  meals: text("meals").notNull().default("[]"),
  remindersEnabled: integer("reminders_enabled", { mode: "boolean" }).notNull().default(false),
});
export const insertMealScheduleSchema = createInsertSchema(mealSchedule).omit({ id: true });
export type InsertMealSchedule = z.infer<typeof insertMealScheduleSchema>;
export type MealSchedule = typeof mealSchedule.$inferSelect;
