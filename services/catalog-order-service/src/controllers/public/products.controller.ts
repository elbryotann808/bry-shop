import type { Request, Response } from "express";
import {prisma} from "../../db.js";
import type { Prisma } from "@prisma/client";

/**
 * GET /products
 * Query: ?q=camiseta&page=1&limit=10&sort=priceCents:asc&category=ropa
 */
export async function listProducts(req: Request, res: Response) {
  try {
    const q = (req.query.q as string | undefined ?? "").trim();
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 10)));
    const skip = (page - 1) * limit;

    const rawSort = (req.query.sort as string | undefined) ?? "createdAt:desc";
    const [rawField = "createdAt", rawDir = "desc"] = rawSort.split(":");
    const field = ["priceCents", "name", "createdAt", "updatedAt"].includes(rawField)
      ? rawField
      : "createdAt";
    const dir = rawDir === "asc" ? "asc" : "desc";

    const category = (req.query.category as string | undefined)?.trim();

    const where: Prisma.ProductWhereInput = {};

    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    if (category) {
      const catId = Number(category);
      if (!Number.isNaN(catId) && catId > 0) {
        where.categoryId = catId;
      } else {
         const existingAnd: Prisma.ProductWhereInput[] = Array.isArray(where.AND)
        ? where.AND
        : where.AND
        ? [where.AND]
        : [];

          where.AND = [
      ...existingAnd,
      {
        category: {
          OR: [
            { slug: { equals: category, mode: "insensitive" } },
            { name: { equals: category, mode: "insensitive" } },
          ],
        },
      },
    ];

      }
    }
    const total = await prisma.product.count({ where });

    const orderBy = { [field]: dir as "asc" | "desc" } as Record<string, "asc" | "desc">;

    const data = await prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        inventory: true,
        category: true,
      },
    });

    return res.json({
      data,
      meta: { page, limit, total },
    });
  } catch (error) {
    console.error("listProducts error:", error);
    return res.status(500).json({ error: "Server error" });
  }
}

/**
 * GET /products/:id
 */
export async function getProductById(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid id" });

    const product = await prisma.product.findUnique({
      where: { id },
      include: { inventory: true, category: true },
    });

    if (!product) return res.status(404).json({ error: "Product not found" });
    return res.json(product);
  } catch (error) {
    console.error("getProductById error:", error);
    return res.status(500).json({ error: "Server error" });
  }
}

/**
 * GET /products/slug/:slug
 */
export async function getProductBySlug(req: Request, res: Response) {
  try {
    const slug = (req.params.slug as string | undefined ?? "").trim();
    if (!slug) return res.status(400).json({ error: "Missing slug" });

    const product = await prisma.product.findUnique({
      where: { slug },
      include: { inventory: true, category: true },
    });

    if (!product) return res.status(404).json({ error: "Product not found" });
    return res.json(product);
  } catch (error) {
    console.error("getProductBySlug error:", error);
    return res.status(500).json({ error: "Server error" });
  }
}
