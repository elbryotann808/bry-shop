import type { Request, Response } from "express";
import { prisma } from "../../db.js";
import type { Prisma } from "@prisma/client";

/* util: parse positive integer from unknown input */
const parsePositiveInt = (v: unknown): number | null => {
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return null;
  return n;
};

const errorResponse = (res: Response, status: number, message: string, details?: unknown) => {
  return res.status(status).json({ error: message, details });
};

/* helper types & guard for Prisma errors without `any` */
type PrismaError = { code?: string; meta?: { target?: string } | null };

const isPrismaError = (err: unknown): err is PrismaError =>
  typeof err === "object" &&
  err !== null &&
  (("code" in (err as Record<string, unknown>) && typeof (err as Record<string, unknown>).code === "string") ||
    "meta" in (err as Record<string, unknown>));



    
export async function createProduct(req: Request, res: Response) {
  try {
    const body = req.body as {
      name?: unknown;
      description?: unknown;
      priceCents?: unknown;
      sku?: unknown;
      slug?: unknown;
      categoryId?: unknown;
    };

    const name = typeof body.name === "string" ? body.name : undefined;
    const description =
      typeof body.description === "string" ? body.description : body.description == null ? null : String(body.description);
    const sku = typeof body.sku === "string" ? body.sku : body.sku == null ? null : String(body.sku);
    const slug = typeof body.slug === "string" ? body.slug : body.slug == null ? null : String(body.slug);

    if (!name) return errorResponse(res, 400, "name is required");
    const price = parsePositiveInt(body.priceCents);
    if (price === null) return errorResponse(res, 400, "priceCents is required and must be a non-negative integer");

    let categoryIdNum: number | undefined;
    if (body.categoryId !== undefined && body.categoryId !== null) {
      const c = parsePositiveInt(body.categoryId);
      if (c === null) return errorResponse(res, 400, "categoryId must be a non-negative integer");
      const cat = await prisma.category.findUnique({ where: { id: c } });
      if (!cat) return errorResponse(res, 404, "category not found");
      categoryIdNum = c;
    }

    const result = await prisma.$transaction(async (tx) => {
      const data: Prisma.ProductCreateInput = {
        name,
        description: description ?? null,
        priceCents: price,
        sku: sku ?? null,
        slug: slug ?? null,
        ...(categoryIdNum ? { category: { connect: { id: categoryIdNum } } } : {}),
      };

      const product = await tx.product.create({ data });

      await tx.inventory.create({
        data: {
          product: { connect: { id: product.id } },
          available: 0,
          reserved: 0,
        },
      });


      return tx.product.findUnique({
        where: { id: product.id },
        include: { inventory: true, category: true },
      });
    });

    return res.status(201).json(result);
  } catch (err: unknown) {
    if (isPrismaError(err) && err.code === "P2002") {
      const target = err.meta?.target ?? "unique field";
      return errorResponse(res, 409, `Unique constraint failed on ${target}`);
    }
    console.error("createProduct error:", err);
    return errorResponse(res, 500, "Internal server error");
  }
}

export async function updateProduct(req: Request, res: Response) {
  try {
    const id = parsePositiveInt(req.params.id);
    if (id === null || id === 0) return errorResponse(res, 400, "invalid product id");

    const body = req.body as {
      name?: unknown;
      description?: unknown | null;
      priceCents?: unknown;
      sku?: unknown | null;
      slug?: unknown | null;
      categoryId?: unknown | null;
    };

    const payload: Prisma.ProductUpdateInput = {};

    if (body.name !== undefined) {
      if (!body.name || typeof body.name !== "string") return errorResponse(res, 400, "invalid name");
      payload.name = body.name;
    }

    if (body.description !== undefined) {
      // body.description === null => set null, undefined => leave out
      payload.description =
        body.description === null
          ? null
          : typeof body.description === "string"
          ? body.description
          : String(body.description);
    }

    if (body.priceCents !== undefined) {
      const p = parsePositiveInt(body.priceCents);
      if (p === null) return errorResponse(res, 400, "priceCents must be a non-negative integer");
      payload.priceCents = p;
    }

    if (body.sku !== undefined) {
      payload.sku = body.sku === null ? null : typeof body.sku === "string" ? body.sku : String(body.sku);
    }

    if (body.slug !== undefined) {
      payload.slug = body.slug === null ? null : typeof body.slug === "string" ? body.slug : String(body.slug);
    }

    if (body.categoryId !== undefined) {
      if (body.categoryId === null) {
        payload.category = { disconnect: true };
      } else {
        const c = parsePositiveInt(body.categoryId);
        if (c === null) return errorResponse(res, 400, "categoryId must be a non-negative integer or null");
        const cat = await prisma.category.findUnique({ where: { id: c } });
        if (!cat) return errorResponse(res, 404, "category not found");
        payload.category = { connect: { id: c } };
      }
    }

    const updated = await prisma.product.update({
      where: { id },
      data: payload,
      include: { inventory: true, category: true },
    });

    return res.status(200).json(updated);
  } catch (err: unknown) {
    if (isPrismaError(err) && err.code === "P2025") return errorResponse(res, 404, "product not found");
    if (isPrismaError(err) && err.code === "P2002") {
      const target = err.meta?.target ?? "unique field";
      return errorResponse(res, 409, `Unique constraint failed on ${target}`);
    }
    console.error("updateProduct error:", err);
    return errorResponse(res, 500, "Internal server error");
  }
}

export async function deleteProduct(req: Request, res: Response) {
  try {
    const id = parsePositiveInt(req.params.id);
    if (id === null || id === 0) return errorResponse(res, 400, "invalid product id");

    await prisma.product.delete({ where: { id } });
    return res.status(204).send();
  } catch (err: unknown) {
    if (isPrismaError(err) && err.code === "P2025") return errorResponse(res, 404, "product not found");
    console.error("deleteProduct error:", err);
    return errorResponse(res, 500, "Internal server error");
  }
}

/**
 * POST /admin/products/:id/inventory
 * Body: { available: number, reserved?: number }
 * Behavior: create inventory if missing, otherwise update; validate reserved <= available
 * Resp: 201 (created) or 200 (updated) with inventory
 */
export async function upsertProductInventory(req: Request, res: Response) {
  try {
    const productId = parsePositiveInt(req.params.id);
    if (productId === null || productId === 0) return errorResponse(res, 400, "invalid product id");

    const body = req.body as { available?: unknown; reserved?: unknown };

    const available = parsePositiveInt(body.available);
    if (available === null) return errorResponse(res, 400, "available is required and must be a non-negative integer");

    const reservedParsed = body.reserved !== undefined ? parsePositiveInt(body.reserved) : 0;
    if (reservedParsed === null) return errorResponse(res, 400, "reserved must be a non-negative integer");

    if (reservedParsed > available) return errorResponse(res, 400, "reserved cannot be greater than available");

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return errorResponse(res, 404, "product not found");

    const maybeExisting = await prisma.inventory.findUnique({ where: { productId } });
    let inventory;
    if (!maybeExisting) {
      inventory = await prisma.inventory.create({
        data: {
          product: { connect: { id: productId } },
          available,
          reserved: reservedParsed,
        },
      });
      return res.status(201).json(inventory);
    } else {
      inventory = await prisma.inventory.update({
        where: { productId },
        data: { available, reserved: reservedParsed },
      });
      return res.status(200).json(inventory);
    }
  } catch (err: unknown) {
    console.error("upsertProductInventory error:", err);
    return errorResponse(res, 500, "Internal server error");
  }
}
