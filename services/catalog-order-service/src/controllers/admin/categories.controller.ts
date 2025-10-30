import type { Request, Response, NextFunction } from "express";
import { prisma } from "../../db.js";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-") 
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
}

/**
 * POST /admin/categories
 * Body: { name, slug? }
 */
export async function createCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, slug } = req.body ?? {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "name is required and must be a non-empty string" });
    }

    const payload = {
      name: name.trim(),
      slug: typeof slug === "string" && slug.trim() ? slugify(slug) : slugify(name),
    };

    const category = await prisma.category.create({ data: payload });
    return res.status(201).json(category);
  } catch (err: unknown) {
    const e = err as { code?: string; meta?: unknown; message?: string };

    if (e.code === "P2002") {
      return res.status(409).json({ error: "Category with same name/slug already exists", details: e.meta });
    }
    console.error("createCategory error:", err);
    return next(err);
  }
}

/**
 * PUT /admin/categories/:id
 * Body: { name?, slug? }
 */
export async function updateCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid id param" });

    const { name, slug } = req.body ?? {};
    const data: { name?: string; slug?: string } = {};

    if (typeof name === "string" && name.trim()) data.name = name.trim();
    if (typeof slug === "string" && slug.trim()) data.slug = slugify(slug);
    if (Object.keys(data).length === 0) return res.status(400).json({ error: "No fields to update" });

    const updated = await prisma.category.update({
      where: { id },
      data,
    });

    return res.status(200).json(updated);
  } catch (err: unknown) {
    const e = err as { code?: string; meta?: unknown; message?: string };

    if (e.code === "P2025") {
      return res.status(404).json({ error: "Category not found" });
    }
    if (e.code === "P2002") {
      return res.status(409).json({ error: "Duplicate value for unique field (name or slug)", details: e.meta });
    }
    console.error("updateCategory error:", err);
    return next(err);
  }
}

/**
 * DELETE /admin/categories/:id
 * Query: ?force=true  (opcional) 

 */
export async function deleteCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid id param" });

    const force = String(req.query.force ?? "false").toLowerCase() === "true";

    const productsCount = await prisma.product.count({ where: { categoryId: id } });

    if (productsCount > 0 && !force) {
      return res.status(409).json({
        error: "Category has products",
        message: "Category contains products. Use ?force=true to delete anyway (this will allow DB action to run).",
        productsCount,
      });
    }

    await prisma.category.delete({ where: { id } });

    return res.status(204).send();
  } catch (err: unknown) {
    const e = err as { code?: string; meta?: unknown; message?: string };

    if (e.code === "P2025") {
      return res.status(404).json({ error: "Category not found" });
    }
    console.error("deleteCategory error:", err);
    return next(err);
  }
}
