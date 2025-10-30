import type { Request, Response } from "express";
import { prisma } from "../../db.js";

type ReqUser = Request & { user?: { id?: number } };

// GET /cart
export async function getCart(req: ReqUser, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorizeddd" });

  let cart = await prisma.cart.findFirst({
    where: { userId },
    include: {
      items: {
        include: {
          product: true, 
        },
      },
    },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  return res.json(cart);
}

// POST /cart/items
// recibe productId y la quantity
export async function addOrUpdateCartItem(req: ReqUser, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { productId, quantity } = req.body;
  if (!productId || !quantity || quantity <= 0) {
    return res.status(400).json({ error: "productId and quantity > 0 is required" });
  }

  let cart = await prisma.cart.findFirst({ where: { userId } });
  if (!cart) {
    cart = await prisma.cart.create({ data: { userId } });
  }

  try {
    const item = await prisma.cartItem.upsert({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
      update: {
        quantity: quantity,
      },
      create: {
        cartId: cart.id,
        productId,
        quantity,
        unitPrice: 0,
      },
    });

    return res.json(item);
  } catch (err) {
    console.log(err);  
    return res.status(409).json({ error: "No se pudo agregar/actualizar item (¿stock insuficiente?)" });
  }
}

// PUT /cart/items/:itemId
// recibe quantity
export async function updateCartItem(req: ReqUser, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { itemId } = req.params;
  const { quantity } = req.body;

  if (!quantity || quantity <= 0) {
    return res.status(400).json({ error: "quantity > 0 required" });
  }

  const item = await prisma.cartItem.findFirst({
    where: {
      id: Number(itemId),
      cart: { userId },
    },
  });
  if (!item) return res.status(404).json({ error: "Item not found" });

  const updated = await prisma.cartItem.update({
    where: { id: item.id },
    data: { quantity },
  });

  return res.json(updated);
}

// DELETE /cart/items/:itemId
export async function removeCartItem(req: ReqUser, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { itemId } = req.params;

  const item = await prisma.cartItem.findFirst({
    where: {
      id: Number(itemId),
      cart: { userId },
    },
  });
  if (!item) return res.status(404).json({ error: "Item not found" });

  await prisma.cartItem.delete({
    where: { id: item.id },
  });

  return res.status(204).send();
}

// POST /cart/checkout
export async function checkoutCart(req: ReqUser, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const cart = await prisma.cart.findFirst({
    where: { userId },
    include: { items: true },
  });

  if (!cart || cart.items.length === 0) {
    return res.status(400).json({ error: "Carrito empy" });
  }

  const order = await prisma.order.create({
    data: {
      userId,
      status: "PENDING",
      totalCents: 0,
      items: {
        create: cart.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
      },
    },
  });

  return res.status(201).json({ orderId: order.id });
}