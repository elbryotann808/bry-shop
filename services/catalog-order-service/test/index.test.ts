import request from "supertest";
import jwt from "jsonwebtoken";
import { describe, it, expect,  } from "vitest";

import app from "../src/app.js";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";

const adminToken = jwt.sign({ id: 1, role: "admin", email: "admin@test" }, process.env.JWT_SECRET);
const userToken = jwt.sign({ id: 2, role: "user", email: "user@test" }, process.env.JWT_SECRET);

function expectHandled(status: number) {
  expect(status).toBeGreaterThanOrEqual(200);
  expect(status).toBeLessThan(500);
}

describe("Public endpoints", () => {
  it("GET /api/categories should respond (no server error)", async () => {
    const res = await request(app).get("/api/categories");
    expectHandled(res.status);
  });

  it("GET /api/categories/:id should respond (no server error)", async () => {
    const res = await request(app).get("/api/categories/1");
    expectHandled(res.status);
  });

  it("GET /api/products should respond (no server error)", async () => {
    const res = await request(app).get("/api/products");
    expectHandled(res.status);
  });

  it("GET /api/products/:id should respond (no server error)", async () => {
    const res = await request(app).get("/api/products/1");
    expectHandled(res.status);
  });

  it("GET /api/products/slug/:slug should respond (no server error)", async () => {
    const res = await request(app).get("/api/products/slug/sample-slug");
    expectHandled(res.status);
  });
});

describe("Admin endpoints (auth + role 'admin')", () => {
  const authHeaderAdmin = { Authorization: `Bearer ${adminToken}` };
  const authHeaderUser = { Authorization: `Bearer ${userToken}` };

  it("POST /api/admin/category should require auth -> 401 without token", async () => {
    const res = await request(app).post("/api/admin/category").send({ name: "test" });
    expect(res.status).toBe(401);
  });

  it("POST /api/admin/category should return 403 for non-admin role", async () => {
    const res = await request(app).post("/api/admin/category").set(authHeaderUser).send({ name: "test" });
    expect(res.status).toBe(403);
  });

  it("POST /api/admin/category should be handled for admin", async () => {
    const res = await request(app).post("/api/admin/category").set(authHeaderAdmin).send({ name: "test-category" });
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
    expectHandled(res.status);
  });

  it("PUT /api/admin/category/:id should enforce auth and role", async () => {
    const path = "/api/admin/category/1";
    expect((await request(app).put(path).send({ name: "x" })).status).toBe(401);
    expect((await request(app).put(path).set(authHeaderUser).send({ name: "x" })).status).toBe(403);
    const res = await request(app).put(path).set(authHeaderAdmin).send({ name: "x" });
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
    expectHandled(res.status);
  });

  it("DELETE /api/admin/category/:id should enforce auth and role", async () => {
    const path = "/api/admin/category/1";
    expect((await request(app).delete(path)).status).toBe(401);
    expect((await request(app).delete(path).set(authHeaderUser)).status).toBe(403);
    const res = await request(app).delete(path).set(authHeaderAdmin);
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
    expectHandled(res.status);
  });

  it("POST /api/admin/products should enforce auth and role", async () => {
    const path = "/api/admin/products";
    expect((await request(app).post(path).send({ name: "p", price: 1, categoryId: 1 })).status).toBe(401);
    expect((await request(app).post(path).set(authHeaderUser).send({ name: "p", price: 1, categoryId: 1 })).status).toBe(403);
    const res = await request(app).post(path).set(authHeaderAdmin).send({ name: "p", price: 1, categoryId: 1 });
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
    expectHandled(res.status);
  });

  it("PUT/DELETE /api/admin/products/:id", async () => {
    const path = "/api/admin/products/1";
    expect((await request(app).put(path).send({ name: "x" })).status).toBe(401);
    expect((await request(app).put(path).set(authHeaderUser).send({ name: "x" })).status).toBe(403);
    const resPut = await request(app).put(path).set(authHeaderAdmin).send({ name: "x" });
    expect(resPut.status).not.toBe(401);
    expect(resPut.status).not.toBe(403);
    expectHandled(resPut.status);

    expect((await request(app).delete(path)).status).toBe(401);
    expect((await request(app).delete(path).set(authHeaderUser)).status).toBe(403);
    const resDel = await request(app).delete(path).set(authHeaderAdmin);
    expect(resDel.status).not.toBe(401);
    expect(resDel.status).not.toBe(403);
    expectHandled(resDel.status);
  });

  it("POST /api/admin/products/:id/inventory (upsert) should enforce auth and role", async () => {
    const path = "/api/admin/products/1/inventory";
    expect((await request(app).post(path).send({ available: 10 })).status).toBe(401);
    expect((await request(app).post(path).set(authHeaderUser).send({ available: 10 })).status).toBe(403);
    const res = await request(app).post(path).set(authHeaderAdmin).send({ available: 10 });
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
    expectHandled(res.status);
  });

  it("Inventory operations reserve/release/commit should enforce auth and role", async () => {
    const base = "/api/admin/inventory/1";
    expect((await request(app).get(base)).status).toBe(401);
    expect((await request(app).get(base).set(authHeaderUser)).status).toBe(403);
    const resGet = await request(app).get(base).set(authHeaderAdmin);
    expect(resGet.status).not.toBe(401);
    expect(resGet.status).not.toBe(403);
    expectHandled(resGet.status);

    for (const op of ["reserve", "release", "commit"]) {
      const p = `${base}/${op}`;
      expect((await request(app).post(p).send({ quantity: 1 })).status).toBe(401);
      expect((await request(app).post(p).set(authHeaderUser).send({ quantity: 1 })).status).toBe(403);
      const res = await request(app).post(p).set(authHeaderAdmin).send({ quantity: 1 });
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
      expectHandled(res.status);
    }
  });
});

describe("User endpoints (auth + role 'user')", () => {
  const authHeaderUser = { Authorization: `Bearer ${userToken}` };
  const authHeaderAdmin = { Authorization: `Bearer ${adminToken}` };

  it("GET /api/user/cart requires auth and user role", async () => {
    const path = "/api/user/cart";
    expect((await request(app).get(path)).status).toBe(401);
    expect((await request(app).get(path).set(authHeaderAdmin)).status).toBe(403);
    const res = await request(app).get(path).set(authHeaderUser);
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
    expectHandled(res.status);
  });

  it("POST /api/user/cart/items add/update requires auth and user role", async () => {
    const path = "/api/user/cart/items";
    expect((await request(app).post(path).send({ productId: 1, quantity: 1 })).status).toBe(401);
    expect((await request(app).post(path).set(authHeaderAdmin).send({ productId: 1, quantity: 1 })).status).toBe(403);
    const res = await request(app).post(path).set(authHeaderUser).send({ productId: 1, quantity: 1 });
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
    expectHandled(res.status);
  });

  it("PUT/DELETE /api/user/cart/items/:itemId should enforce auth and role", async () => {
    const putPath = "/api/user/cart/items/1";
    expect((await request(app).put(putPath).send({ quantity: 2 })).status).toBe(401);
    expect((await request(app).put(putPath).set(authHeaderAdmin).send({ quantity: 2 })).status).toBe(403);
    const resPut = await request(app).put(putPath).set(authHeaderUser).send({ quantity: 2 });
    expect(resPut.status).not.toBe(401);
    expect(resPut.status).not.toBe(403);
    expectHandled(resPut.status);

    const delPath = "/api/user/cart/items/1";
    expect((await request(app).delete(delPath)).status).toBe(401);
    expect((await request(app).delete(delPath).set(authHeaderAdmin)).status).toBe(403);
    const resDel = await request(app).delete(delPath).set(authHeaderUser);
    expect(resDel.status).not.toBe(401);
    expect(resDel.status).not.toBe(403);
    expectHandled(resDel.status);
  });

  it("POST /api/user/cart/checkout should enforce auth and role", async () => {
    const path = "/api/user/cart/checkout";
    expect((await request(app).post(path).send({})).status).toBe(401);
    expect((await request(app).post(path).set(authHeaderAdmin).send({})).status).toBe(403);
    const res = await request(app).post(path).set(authHeaderUser).send({ paymentMethod: "none" });
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
    expectHandled(res.status);
  });

  it("GET/POST /api/user/orders and actions (pay/cancel)", async () => {
    const list = await request(app).get("/api/user/orders");
    expect(list.status).toBe(401);

    const listAuth = await request(app).get("/api/user/orders").set(authHeaderUser);
    expect(listAuth.status).not.toBe(401);
    expect(listAuth.status).not.toBe(403);
    expectHandled(listAuth.status);

    const create = await request(app).post("/api/user/orders").set(authHeaderUser).send({ items: [{ productId: 1, quantity: 1 }] });
    expect(create.status).not.toBe(401);
    expect(create.status).not.toBe(403);
    expectHandled(create.status);

    const id = 1;
    expect((await request(app).get(`/api/user/orders/${id}`)).status).toBe(401);
    const getAuth = await request(app).get(`/api/user/orders/${id}`).set(authHeaderUser);
    expectHandled(getAuth.status);

    expect((await request(app).post(`/api/user/orders/${id}/pay`)).status).toBe(401);
    const payAuth = await request(app).post(`/api/user/orders/${id}/pay`).set(authHeaderUser).send({ paymentReference: "abc" });
    expectHandled(payAuth.status);

    expect((await request(app).post(`/api/user/orders/${id}/cancel`)).status).toBe(401);
    const cancelAuth = await request(app).post(`/api/user/orders/${id}/cancel`).set(authHeaderUser);
    expectHandled(cancelAuth.status);
  });
});
