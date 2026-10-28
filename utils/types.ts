import { db } from "@/lib/db";
import { cartItem } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const cartItemWithProductQuery = db.query.cartItem.findFirst({
  where: eq(cartItem.id, ""),
  with: {
    product: true,
  },
});

export type CartItemWithProduct = NonNullable<
  Awaited<typeof cartItemWithProductQuery>
>;

export type actionFunction = (
  prevState: any,
  formData: FormData,
) => Promise<{ message: string }>;

export type CartItem = {
  productId: string;
  image: string;
  title: string;
  price: string;
  amount: number;
  company: string;
};

export type CartState = {
  cartItems: CartItem[];
  numItemsInCart: number;
  cartTotal: number;
  shipping: number;
  tax: number;
  orderTotal: number;
};
