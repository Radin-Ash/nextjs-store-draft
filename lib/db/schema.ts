import {
  pgTable,
  text,
  boolean,
  integer,
  timestamp,
  uuid,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const product = pgTable("product", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  company: text("company").notNull(),
  description: text("description").notNull(),
  featured: boolean("featured").notNull(),
  image: text("image").notNull(),
  price: integer("price").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  clerkId: text("clerk_id").notNull(),
});

export const favorite = pgTable(
  "favorite",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkId: text("clerk_id").notNull(),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    productIdIdx: index("favorite_product_id_idx").on(table.productId),
    clerkIdIdx: index("favorite_clerk_id_idx").on(table.clerkId),
  }),
);

export const review = pgTable(
  "review",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkId: text("clerk_id").notNull(),
    rating: integer("rating").notNull(),
    comment: text("comment").notNull(),
    authorName: text("author_name").notNull(),
    authorImageUrl: text("author_image_url").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
  },
  (table) => ({
    productIdIdx: index("review_product_id_idx").on(table.productId),
    clerkIdIdx: index("review_clerk_id_idx").on(table.clerkId),
  }),
);

export const productRelations = relations(product, ({ many }) => ({
  favorites: many(favorite),
  reviews: many(review),
}));

export const favoriteRelations = relations(favorite, ({ one }) => ({
  product: one(product, {
    fields: [favorite.productId],
    references: [product.id],
  }),
}));

export const reviewRelations = relations(review, ({ one }) => ({
  product: one(product, {
    fields: [review.productId],
    references: [product.id],
  }),
}));

export type Product = typeof product.$inferSelect;
export type NewProduct = typeof product.$inferInsert;

export type Favorite = typeof favorite.$inferSelect;
export type NewFavorite = typeof favorite.$inferInsert;

export type Review = typeof review.$inferSelect;
export type NewReview = typeof review.$inferInsert;
