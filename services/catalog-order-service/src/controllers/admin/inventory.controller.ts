import type { Request, Response, NextFunction } from "express";
import { prisma } from "../../db.js";

/**
 * Helper: parse and validate productId param
 */
function parseProductId(param: string | undefined): number | null {
  if (!param) return null;
  const n = Number(param);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Helper: parse and validate quantity in body
 * Accepta number o string que contenga un número entero > 0
 */
function parseQuantity(bodyQty: unknown): number | null {
  if (bodyQty === undefined || bodyQty === null) return null;

  if (typeof bodyQty === "number") {
    return Number.isInteger(bodyQty) && bodyQty > 0 ? bodyQty : null;
  }

  if (typeof bodyQty === "string") {
    const trimmed = bodyQty.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    return Number.isInteger(n) && n > 0 ? n : null;
  }

  return null;
}



/**
 * GET /admin/inventory/:productId
 * Resp: 200 { productId, available, reserved, updatedAt } o 404
 */
export const getInventory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productId = parseProductId(req.params.productId);
    if (productId === null) return res.status(400).json({ error: "Invalid productId" });

    const inv = await prisma.inventory.findUnique({ where: { productId } });
    if (!inv) return res.status(404).json({ error: "Inventory not found" });

    const result = {
      productId: inv.productId,
      available: inv.available,
      reserved: inv.reserved,
      updatedAt: inv.updatedAt,
    };

    return res.status(200).json(result);
  } catch (err: unknown) {
    console.error("getInventory error:", err);
    return next(err);
  }
};

/**
 * POST /admin/inventory/:productId/reserve
 * Body: { quantity }
 * Desc: marcar reserved (usa transacción).
 * Resp: 200 updatedInventory o 409 si no hay stock
 */
export const reserveInventory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productId = parseProductId(req.params.productId);
    const qty = parseQuantity(req.body?.quantity);

    if (productId === null) return res.status(400).json({ error: "Invalid productId" });
    if (qty === null) return res.status(400).json({ error: "quantity must be integer > 0" });

    const updated = await prisma.$transaction(async (tx) => {
      const inv = await tx.inventory.findUnique({ where: { productId } });
      if (!inv) {
        throw { status: 404, message: "Inventory not found" };
      }

      const free = inv.available - inv.reserved;
      if (free < qty) {
        throw { status: 409, message: "Insufficient stock", free };
      }

      const newInv = await tx.inventory.update({
        where: { productId },
        data: { reserved: inv.reserved + qty },
      });

      return newInv;
    });

    const result = {
      productId: updated.productId,
      available: updated.available,
      reserved: updated.reserved,
      updatedAt: updated.updatedAt,
    };

    return res.status(200).json(result);
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string; free?: number };
    if (e?.status) {
      return res.status(e.status).json({
        error: e.message ?? "Error",
        ...(e.free !== undefined ? { free: e.free } : {}),
      });
    }
    console.error("reserveInventory error:", err);
    return next(err);
  }
};

/**
 * POST /admin/inventory/:productId/release
 * Body: { quantity }
 * Desc: reducir reserved. 200 updatedInventory o 404
 */
export const releaseInventory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productId = parseProductId(req.params.productId);
    const qty = parseQuantity(req.body?.quantity);

    if (productId === null) return res.status(400).json({ error: "Invalid productId" });
    if (qty === null) return res.status(400).json({ error: "quantity must be integer > 0" });

    const updated = await prisma.$transaction(async (tx) => {
      const inv = await tx.inventory.findUnique({ where: { productId } });
      if (!inv) throw { status: 404, message: "Inventory not found" };

      const newReserved = Math.max(0, inv.reserved - qty);

      const newInv = await tx.inventory.update({
        where: { productId },
        data: { reserved: newReserved },
      });

      return newInv;
    });

    const result = {
      productId: updated.productId,
      available: updated.available,
      reserved: updated.reserved,
      updatedAt: updated.updatedAt,
    };

    return res.status(200).json(result);
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    if (e?.status) return res.status(e.status).json({ error: e.message ?? "Error" });
    console.error("releaseInventory error:", err);
    return next(err);
  }
};

/**
 * POST /admin/inventory/:productId/commit
 * Body: { quantity }
 * Desc: cuando se confirma pago: available -= q y reserved -= q en una transacción.
 * Resp: 200 updatedInventory o 409/400
 */
export const commitInventory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productId = parseProductId(req.params.productId);
    const qty = parseQuantity(req.body?.quantity);

    if (productId === null) return res.status(400).json({ error: "Invalid productId" });
    if (qty === null) return res.status(400).json({ error: "quantity must be integer > 0" });

    const updated = await prisma.$transaction(async (tx) => {
      const inv = await tx.inventory.findUnique({ where: { productId } });
      if (!inv) throw { status: 404, message: "Inventory not found" };

      // Validaciones:
      if (inv.reserved < qty) {
        throw { status: 409, message: "Not enough reserved quantity to commit", reserved: inv.reserved };
      }
      if (inv.available < qty) {
        throw { status: 409, message: "Insufficient available quantity", available: inv.available };
      }

      const newInv = await tx.inventory.update({
        where: { productId },
        data: {
          available: inv.available - qty,
          reserved: inv.reserved - qty,
        },
      });

      return newInv;
    });

    const result = {
      productId: updated.productId,
      available: updated.available,
      reserved: updated.reserved,
      updatedAt: updated.updatedAt,
    };

    return res.status(200).json(result);
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string; reserved?: number; available?: number };
    if (e?.status) {
      return res.status(e.status).json({
        error: e.message ?? "Error",
        ...(e.reserved !== undefined ? { reserved: e.reserved } : {}),
        ...(e.available !== undefined ? { available: e.available } : {}),
      });
    }
    console.error("commitInventory error:", err);
    return next(err);
  }
};
