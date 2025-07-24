import { pgTable, uuid, varchar, timestamp, boolean, uniqueIndex } from "drizzle-orm/pg-core";

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull(),
  username: varchar('username', { length: 16 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  isEmailVerified: boolean('is_email_verified').default(false),
  emailVerificationToken: varchar('email_verification_token', { length: 255 }),
  passwordResetToken: varchar('password_reset_token', { length: 255 }),
  passwordResetExpires: timestamp('password_reset_expires'),
  role: varchar('role', { length: 20 }).default('user'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
  usernameIdx: uniqueIndex('users_username_idx').on(table.username)
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;