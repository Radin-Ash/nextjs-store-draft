"use server";

import { db } from "@/lib/db";
import { cart, product, cartItem, Cart } from "@/lib/db/schema";
import { redirect } from "next/navigation";
import { eq, desc, or, ilike, and, avg, count } from "drizzle-orm";
import { auth, currentUser, getAuth } from "@clerk/nextjs/server";
import {
  imageSchema,
  productSchema,
  reviewSchema,
  validateWithZodSchema,
} from "@/utils/schemas";
import { deleteImage, uploadImage } from "@/utils/supabase";
import { revalidatePath } from "next/cache";
import { favorite } from "@/lib/db/schema";
import { review } from "@/lib/db/schema";

const getAuthUser = async () => {
  const user = await currentUser();
  if (!user) redirect("/");
  return user;
};

const getAdminUser = async () => {
  const user = await getAuthUser();
  if (user.id !== process.env.ADMIN_USER_ID) redirect("/");
  return user;
};

const renderError = (error: unknown): { message: string } => {
  console.log(error);
  return {
    message: error instanceof Error ? error.message : "an error occurred",
  };
};

export const fetchFeaturedProducts = async () => {
  const products = await db
    .select()
    .from(product)
    .where(eq(product.featured, true));

  return products;
};

export const fetchAllProducts = async ({ search = "" }: { search: string }) => {
  return db
    .select()
    .from(product)
    .where(
      or(
        ilike(product.name, `%${search}%`),
        ilike(product.company, `%${search}%`),
      ),
    )
    .orderBy(desc(product.createdAt));
};

export const fetchSingleProduct = async (productId: string) => {
  const singleProduct = await db
    .select()
    .from(product)
    .where(eq(product.id, productId))
    .limit(1);

  const foundProduct = singleProduct[0];

  if (!foundProduct) {
    redirect("/products");
  }

  return foundProduct;
};

export const createProductAction = async (
  prevState: any,
  formData: FormData,
): Promise<{ message: string }> => {
  const user = await getAuthUser();

  try {
    const rawData = Object.fromEntries(formData);
    const file = formData.get("image") as File;
    const validatedFields = validateWithZodSchema(productSchema, rawData);
    const validatedFile = validateWithZodSchema(imageSchema, { image: file });
    const fullPath = await uploadImage(validatedFile.image);

    await db.insert(product).values({
      ...validatedFields,
      image: fullPath,
      clerkId: user.id,
    });
  } catch (error) {
    return renderError(error);
  }
  redirect("/admin/products");
};

export const fetchAdminProducts = async () => {
  await getAdminUser();

  const products = await db
    .select()
    .from(product)
    .orderBy(desc(product.createdAt));

  return products;
};

export const deleteProductAction = async (prevState: { productId: string }) => {
  const { productId } = prevState;
  await getAdminUser();

  try {
    const [pro] = await db
      .delete(product)
      .where(eq(product.id, productId))
      .returning();

    await deleteImage(pro.image);

    revalidatePath("/admin/products");
    return { message: "product removed" };
  } catch (error) {
    return renderError(error);
  }
};

export const fetchAdminProductDetails = async (productId: string) => {
  await getAdminUser();
  const pro = await db.query.product.findFirst({
    where: eq(product.id, productId),
  });

  if (!pro) redirect("/admin/products");
  return pro;
};

export const updateProductAction = async (
  prevState: any,
  formData: FormData,
) => {
  await getAdminUser();
  try {
    const productId = formData.get("id") as string;
    const rawData = Object.fromEntries(formData);
    const validatedFields = validateWithZodSchema(productSchema, rawData);

    await db
      .update(product)
      .set({
        ...validatedFields,
      })
      .where(eq(product.id, productId));

    revalidatePath(`/admin/products/${productId}/edit`);
    return { message: "Product updated successfully" };
  } catch (error) {
    return renderError(error);
  }
};

export const updateProductImageAction = async (
  prevState: any,
  formData: FormData,
) => {
  await getAuthUser();
  try {
    const image = formData.get("image") as File;
    const productId = formData.get("id") as string;
    const oldImageUrl = formData.get("url") as string;

    const validatedFile = validateWithZodSchema(imageSchema, { image });
    const fullPath = await uploadImage(validatedFile.image);
    await deleteImage(oldImageUrl);
    await db
      .update(product)
      .set({ image: fullPath })
      .where(eq(product.id, productId));
    revalidatePath(`/admin/products/${productId}/edit`);
    return { message: "Product Image updated successfully" };
  } catch (error) {
    return renderError(error);
  }
};

export const fetchFavoriteId = async ({ productId }: { productId: string }) => {
  const user = await getAuthUser();
  const foundFavorite = await db.query.favorite.findFirst({
    where: and(
      eq(favorite.productId, productId),
      eq(favorite.clerkId, user.id),
    ),
    columns: {
      id: true,
    },
  });
  return foundFavorite?.id || null;
};

export const toggleFavoriteAction = async (prevState: {
  productId: string;
  favoriteId: string | null;
  pathname: string;
}) => {
  const user = await getAuthUser();
  const { productId, favoriteId, pathname } = prevState;

  try {
    if (favoriteId) {
      await db.delete(favorite).where(eq(favorite.id, favoriteId));
    } else {
      await db.insert(favorite).values({
        productId,
        clerkId: user.id,
      });
    }
    revalidatePath(pathname);
    return { message: favoriteId ? "removed from faves" : "added to faves" };
  } catch (error) {
    return renderError(error);
  }
};

export const fetchUserFavorites = async () => {
  const user = await getAuthUser();
  const favorites = await db.query.favorite.findMany({
    where: eq(favorite.clerkId, user.id),
    with: {
      product: true, // 👈 like Prisma's `include: { product: true }`
    },
  });
  return favorites;
};

export const createReviewAction = async (
  prevState: any,
  formData: FormData,
) => {
  const user = await getAuthUser();
  try {
    const rawData = Object.fromEntries(formData);
    const validatedFields = validateWithZodSchema(reviewSchema, rawData);
    await db.insert(review).values({
      ...validatedFields,
      clerkId: user.id,
    });
    revalidatePath(`/products/${validatedFields.productId}`);
    return { message: "review submitted successfully" };
  } catch (error) {
    return renderError(error);
  }
};

export const fetchProductReviews = async (productId: string) => {
  const reviews = await db
    .select()
    .from(review)
    .where(eq(review.productId, productId))
    .orderBy(desc(review.createdAt));
  return reviews;
};

export const fetchProductRating = async (productId: string) => {
  const result = await db
    .select({
      productId: review.productId,
      avgRating: avg(review.rating).mapWith(Number),
      countRating: count(review.rating),
    })
    .from(review)
    .where(eq(review.productId, productId))
    .groupBy(review.productId);

  // empty array if no reviews
  return {
    rating: result[0]?.avgRating?.toFixed(1) ?? 0,
    count: result[0]?.countRating ?? 0,
  };
};

export const fetchProductReviewsByUser = async () => {
  const user = await getAuthUser();
  const reviews = await db.query.review.findMany({
    where: eq(review.clerkId, user.id),
    columns: {
      id: true,
      rating: true,
      comment: true,
    },
    with: {
      product: {
        columns: {
          image: true,
          name: true,
        },
      },
    },
  });
  return reviews;
};

export const deleteReviewAction = async (prevState: { reviewId: string }) => {
  const { reviewId } = prevState;
  const user = await getAuthUser();

  try {
    await db
      .delete(review)
      .where(and(eq(review.id, reviewId), eq(review.clerkId, user.id)));
    revalidatePath("/reviews");
    return { message: "Review deleted successfully" };
  } catch (error) {
    return renderError(error);
  }
};

export const findExistingReview = async (userId: string, productId: string) => {
  return db.query.review.findFirst({
    where: and(eq(review.clerkId, userId), eq(review.productId, productId)),
  });
};

export const fetchCartItems = async () => {
  const { userId } = await auth();

  const userCart = await db.query.cart.findFirst({
    where: eq(cart.clerkId, userId ?? ""),
    columns: {
      numItemsInCart: true,
    },
  });
  return userCart?.numItemsInCart || 0;
};

const fetchProduct = async (productId: string) => {
  const foundProduct = await db.query.product.findFirst({
    where: eq(product.id, productId),
  });
  if (!foundProduct) {
    throw new Error("Product not found");
  }
  return foundProduct;
};

export const fetchOrCreateCart = async ({
  userId,
  errorOnFailure = false,
}: {
  userId: string;
  errorOnFailure?: boolean;
}) => {
  let userCart = await db.query.cart.findFirst({
    where: eq(cart.clerkId, userId),
    with: {
      cartItems: {
        with: {
          product: true,
        },
      },
    },
  });

  if (!userCart && errorOnFailure) {
    throw new Error("Cart not found");
  }

  if (!userCart) {
    const [newCart] = await db
      .insert(cart)
      .values({ clerkId: userId })
      .returning({ id: cart.id });

    userCart = await db.query.cart.findFirst({
      where: eq(cart.id, newCart.id),
      with: { cartItems: { with: { product: true } } },
    });
  }

  if (!userCart) {
    throw new Error("Failed to create cart");
  }

  return userCart;
};

const updateOrCreateCartItem = async ({
  productId,
  cartId,
  amount,
}: {
  productId: string;
  cartId: string;
  amount: number;
}) => {
  let existingItem = await db.query.cartItem.findFirst({
    where: and(eq(cartItem.productId, productId), eq(cartItem.cartId, cartId)),
  });

  if (existingItem) {
    const [updated] = await db
      .update(cartItem)
      .set({ amount: existingItem.amount + amount })
      .where(eq(cartItem.id, existingItem.id))
      .returning();

    existingItem = updated;
  } else {
    const [created] = await db
      .insert(cartItem)
      .values({ amount, productId, cartId })
      .returning();

    existingItem = created;
  }
};

export const updateCart = async (userCart: Cart) => {
  const cartItems = await db.query.cartItem.findMany({
    where: eq(cartItem.cartId, userCart.id),
    with: {
      product: true,
    },
  });

  let numItemsInCart = 0;
  let cartTotal = 0;

  for (const item of cartItems) {
    numItemsInCart += item.amount;
    cartTotal += item.amount * item.product.price;
  }
  const tax = userCart.taxRate * cartTotal;
  const shipping = cartTotal ? userCart.shipping : 0;
  const orderTotal = cartTotal + tax + shipping;

  await db
    .update(cart)
    .set({
      numItemsInCart,
      cartTotal,
      tax,
      orderTotal,
    })
    .where(eq(cart.id, userCart.id));

  // const updatedCart = await db.query.cart.findFirst({
  //   where: eq(cart.id, userCart.id),
  //   with: {
  //     cartItems: {
  //       with: {
  //         product: true,
  //       },
  //     },
  //   },
  // });
  // return updatedCart;
};

export const addToCartAction = async (prevState: any, formData: FormData) => {
  const user = await getAuthUser();
  try {
    const productId = formData.get("productId") as string;
    const amount = Number(formData.get("amount"));
    await fetchProduct(productId);
    const cart = await fetchOrCreateCart({ userId: user.id });
    await updateOrCreateCartItem({ productId, cartId: cart.id, amount });
    await updateCart(cart);
  } catch (error) {
    return renderError(error);
  }
  revalidatePath("/cart", "layout");

  redirect("/cart");
};

export const removeCartItemAction = async (
  prevState: any,
  formData: FormData,
) => {
  const user = await getAuthUser();
  try {
    const cartItemId = formData.get("id") as string;
    const cart = await fetchOrCreateCart({
      userId: user.id,
      errorOnFailure: true,
    });
    await db
      .delete(cartItem)
      .where(and(eq(cartItem.id, cartItemId), eq(cartItem.cartId, cart.id)));

    await updateCart(cart);
    revalidatePath("/cart");
    return { message: "Item removed from cart" };
  } catch (error) {
    return renderError(error);
  }
};
export const updateCartItemAction = async ({
  amount,
  cartItemId,
}: {
  amount: number;
  cartItemId: string;
}) => {
  const user = await getAuthUser();

  try {
    const cart = await fetchOrCreateCart({
      userId: user.id,
      errorOnFailure: true,
    });
    await db
      .update(cartItem)
      .set({ amount })
      .where(and(eq(cartItem.id, cartItemId), eq(cartItem.cartId, cart.id)));

    await updateCart(cart);
    revalidatePath("/cart");
    return { message: "cart updated" };
  } catch (error) {
    return renderError(error);
  }
};

export const createOrderAction = async (prevState: any, formData: FormData) => {
  return { message: "order created" };
};
