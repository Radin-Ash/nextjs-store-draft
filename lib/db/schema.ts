import {
  pgTable,
  text,
  boolean,
  integer,
  timestamp,
  uuid,
  index,
  real,
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

export const cart = pgTable(
  "cart",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkId: text("clerk_id").notNull(),
    numItemsInCart: integer("num_items_in_cart").default(0).notNull(),
    cartTotal: integer("cart_total").default(0).notNull(),
    shipping: integer("shipping").default(5).notNull(),
    tax: integer("tax").default(0).notNull(),
    taxRate: real("tax_rate").default(0.1).notNull(),
    orderTotal: integer("order_total").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    clerkIdIdx: index("cart_clerk_id_idx").on(table.clerkId),
  }),
);

export const cartItem = pgTable(
  "cart_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => cart.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    productIdIdx: index("cart_item_product_id_idx").on(table.productId),
    cartIdIdx: index("cart_item_cart_id_idx").on(table.cartId),
  }),
);

export const productRelations = relations(product, ({ many }) => ({
  favorites: many(favorite),
  reviews: many(review),
  cartItems: many(cartItem),
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

export const cartRelations = relations(cart, ({ many }) => ({
  cartItems: many(cartItem),
}));

export const cartItemRelations = relations(cartItem, ({ one }) => ({
  cart: one(cart, {
    fields: [cartItem.cartId],
    references: [cart.id],
  }),
  product: one(product, {
    fields: [cartItem.productId],
    references: [product.id],
  }),
}));

export type Product = typeof product.$inferSelect;
export type NewProduct = typeof product.$inferInsert;

export type Favorite = typeof favorite.$inferSelect;
export type NewFavorite = typeof favorite.$inferInsert;

export type Review = typeof review.$inferSelect;
export type NewReview = typeof review.$inferInsert;

export type Cart = typeof cart.$inferSelect;
export type NewCart = typeof cart.$inferInsert;

export type CartItem = typeof cartItem.$inferSelect;
export type NewCartItem = typeof cartItem.$inferInsert;
