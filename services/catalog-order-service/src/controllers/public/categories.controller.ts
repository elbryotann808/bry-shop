import type{ Request, Response } from "express"
import { prisma } from "../../db.js"
import type { Prisma } from "@prisma/client";

export const listCategories = async (req: Request, res: Response) => {
  try {
    const q =
      typeof req.query.q === "string" && req.query.q.trim()
        ? req.query.q.trim()
        : undefined;
    const page = Math.max(1, Number(req.query.page ?? 1));
    const rawLimit = Number(req.query.limit ?? 10);
    const limit = Number.isFinite(rawLimit)
      ? Math.min(100, Math.max(1, rawLimit))
      : 10;
    const skip = (page - 1) * limit;

    let where: Prisma.CategoryWhereInput | undefined;
    if (q) {
      where = {
        OR: [
          {
            name: {
              contains: q,
              mode: "insensitive" as Prisma.QueryMode,
            },
          },
          {
            slug: {
              contains: q,
              mode: "insensitive" as Prisma.QueryMode,
            },
          },
        ],
      };
    }

    // <-- aquí forzamos el tipo correcto explícitamente
    const countArgs: Prisma.CategoryCountArgs | undefined = where
      ? { where }
      : undefined;

    const findArgs: Prisma.CategoryFindManyArgs = {
      ...(where ? { where } : {}),
      skip,
      take: limit,
      orderBy: { name: "asc" } as const,
    };

    const [total, data] = await Promise.all([
      prisma.category.count(countArgs),
      prisma.category.findMany(findArgs),
    ]);

    return res.status(200).json({
      data,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("listCategories error:", error);
    return res.status(500).json({ error: "Server error listing categories" });
  }
};

export const getCategoryById = async(req: Request, res: Response)=>{
  try {
     const rawId = req.params.id;
    const id = Number(rawId);
    if (Number.isNaN(id) || !Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid category id" });
    }

    // Si quieres incluir productos en el detalle: ?includeProducts=true
    const includeProducts = req.query.includeProducts === "true";

    const category = await prisma.category.findUnique({
      where: { id },
      ...(includeProducts ? { include: { products: true } } : {}),
    });

    if (!category) return res.status(404).json({ error: "Category not found" });

    return res.status(200).json(category);
  } catch (error) {
    console.error("getCategoryById error:", error);
    return res.status(500).json({ error: "Server error fetching category" });
  }
}

