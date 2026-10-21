"use server";

import { db } from "@/lib/db";
import { product } from "@/lib/db/schema";
import { redirect } from "next/navigation";
import { eq, desc, or, ilike, and } from "drizzle-orm";
import { currentUser, getAuth } from "@clerk/nextjs/server";
import {
  imageSchema,
  productSchema,
  validateWithZodSchema,
} from "@/utils/schemas";
import { deleteImage, uploadImage } from "@/utils/supabase";
import { revalidatePath } from "next/cache";
import { favorite } from "@/lib/db/schema";

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
  return { message: "review submitted successfully" };
};

export const fetchProductReviews = async () => {};
export const fetchProductReviewsByUser = async () => {};
export const deleteReviewAction = async () => {};
export const findExistingReview = async () => {};
export const fetchProductRating = async () => {};
