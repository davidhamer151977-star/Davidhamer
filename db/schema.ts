import { pgTable, serial, text, timestamp, integer, uniqueIndex, index } from 'drizzle-orm/pg-core'

export const profiles = pgTable('profiles', {
  id: serial().primaryKey(),
  identityId: text('identity_id').notNull().unique(),
  name: text().notNull(),
  handle: text().notNull().unique(),
  bio: text().notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const posts = pgTable('posts', {
  id: serial().primaryKey(),
  authorId: integer('author_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  body: text().notNull(),
  topic: text().notNull().default('Conversation'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const likes = pgTable('likes', {
  id: serial().primaryKey(),
  postId: integer('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  profileId: integer('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
}, (table) => [uniqueIndex('likes_post_profile_idx').on(table.postId, table.profileId)])

export const comments = pgTable('comments', {
  id: serial().primaryKey(),
  postId: integer('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  profileId: integer('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  body: text().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const reports = pgTable('reports', {
  id: serial().primaryKey(),
  postId: integer('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  reporterId: integer('reporter_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  reason: text().notNull(),
  details: text().notNull().default(''),
  status: text().notNull().default('open'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [uniqueIndex('reports_post_reporter_idx').on(table.postId, table.reporterId)])

export const moderationEvents = pgTable('moderation_events', {
  id: serial().primaryKey(),
  profileId: integer('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  contentType: text('content_type').notNull(),
  decision: text().notNull(),
  category: text().notNull(),
  reason: text().notNull(),
  confidence: integer().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const directMessages = pgTable('direct_messages', {
  id: serial().primaryKey(),
  senderId: integer('sender_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  recipientId: integer('recipient_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  body: text().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  readAt: timestamp('read_at'),
}, (table) => [
  index('direct_messages_sender_idx').on(table.senderId, table.createdAt),
  index('direct_messages_recipient_idx').on(table.recipientId, table.createdAt),
])
