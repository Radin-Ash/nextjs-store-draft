import { db } from "@/lib/db";
import { product } from "@/lib/db/schema";
import productsData from "./products.json";

async function main() {
  await db.insert(product).values(
    productsData.map((item) => ({
      name: item.name,
      company: item.company,
      description: item.description,
      featured: item.featured,
      image: item.image,
      price: item.price,
      clerkId: item.clerkId,
    })),
  );
}

main()
  .then(() => {
    console.log("all items added");
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
