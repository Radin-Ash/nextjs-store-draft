import { db } from "@/lib/db";
import { product } from "@/lib/db/schema";
import { redirect } from "next/navigation";
import { eq, desc, or, ilike } from "drizzle-orm";

export const fetchFeaturedProducts = async () => {
  const products = await db
    .select()
    .from(product)
    .where(eq(product.featured, true));

  return products;
};

export const fetchAllProducts = ({ search = "" }: { search: string }) => {
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
