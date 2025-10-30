import type { Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../db.js";

type ReqUser = Request & { user?: { id?: number } };


// GET /orders
export const getOrders = async (req: ReqUser, res: Response) => {
  const page = Number.parseInt(String(req.query.page ?? "1"), 10) || 1;
  const limit = Number.parseInt(String(req.query.limit ?? "10"), 10) || 10;
  const status = req.query.status ? String(req.query.status) : undefined;

  const where: Prisma.OrderWhereInput = {};
  if (req.user?.id != null) {
    where.userId = req.user.id;
  }
  if (status) {
    where.status = status;
  }

  const orders = await prisma.order.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    include: { items: true },
  });

  return res.json(orders);
};

// GET /orders/:id
export const getOrderById = async (req: ReqUser, res: Response) => {
  const order = await prisma.order.findUnique({
    where: { id: Number(req.params.id) },
    include: { items: true },
  });

  if (!order || order.userId !== req.user?.id) {
    return res.status(404).json({ error: "Order not found" });
  }

  return res.json(order);
};

// POST /orders
// params id_cart
export const createOrder = async (req: ReqUser, res: Response) => {
  const { cartId } = req.body;

  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: { items: true },
  });

  if (!cart || cart.userId !== req.user?.id) {
    return res.status(404).json({ error: "Cart not found" });
  }

  const order = await prisma.order.create({
    data: {
      userId: req.user!.id,
      status: "PENDING",
      items: {
        create: cart.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
      },
    },
    include: { items: true },
  });

  return res.status(201).json(order);
};

// POST /orders/:id/pay
export const payOrder = async (req: ReqUser, res: Response) => {
  const order = await prisma.order.update({
    where: { id: Number(req.params.id) },
    data: { status: "PAID" },
  });
  return res.json(order);
};

// POST /orders/:id/cancel
export const cancelOrder = async (req: ReqUser, res: Response) => {
  const order = await prisma.order.update({
    where: { id: Number(req.params.id) },
    data: { status: "CANCELLED" },
  });
  return res.json(order);
};
