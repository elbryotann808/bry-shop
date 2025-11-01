import request from "supertest";
import app from "../src/app.js";
import { describe, it, expect, } from "vitest";


let testEmail: string;
const testPassword = "P@ssw0rd!";
let refreshCookie: string | undefined;
let accessToken: string | undefined;



describe("Auth API - tests de integración (solo APIs)", () => {
  it("GET /api/auth/conection -> 200 (DB real)", async () => {
    const res = await request(app).get("/api/auth/conection");
    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
  });

  it("POST /api/auth/register -> 400 si faltan campos", async () => {
    const res = await request(app).post("/api/auth/register").send({ name: "B" });
    expect(res.status).toBe(400);
  });

  it("POST /api/auth/register -> 201 registro exitoso (usa email único)", async () => {
    testEmail = `test+${Date.now()}@example.com`;
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Test User", email: testEmail, password: testPassword });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("user");
    expect(res.body).toHaveProperty("accessToken");

    accessToken = res.body.accessToken;

    const setCookie = res.headers["set-cookie"];
    if (setCookie) {
      const sc = Array.isArray(setCookie) ? setCookie.join(";") : String(setCookie);
      const match = sc.match(/refreshToken=[^;]+/);
      if (match) refreshCookie = match[0];
    }
  });

  it("POST /api/auth/login -> 200 (login con user creado)", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: testEmail, password: testPassword });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("user");
    expect(res.body).toHaveProperty("accessToken");

    accessToken = res.body.accessToken;
    const setCookie = res.headers["set-cookie"];
    if (setCookie) {
      const sc = Array.isArray(setCookie) ? setCookie.join(";") : String(setCookie);
      const match = sc.match(/refreshToken=[^;]+/);
      if (match) refreshCookie = match[0];
    }
  });

  it("GET /api/auth/me -> 200 (usar access token)", async () => {
    expect(accessToken).toBeDefined();
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
    expect(res.body.email).toBe(testEmail);
  });

  it("POST /api/auth/refresh -> 200 (usar cookie refreshToken)", async () => {
    expect(refreshCookie).toBeDefined();
    const res = await request(app).post("/api/auth/refresh").set("Cookie", [refreshCookie as string]);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("accessToken");
  });

  it("POST /api/auth/logout -> 200 (revoca y limpia cookie)", async () => {
    const req = request(app).post("/api/auth/logout");
    if (refreshCookie) req.set("Cookie", [refreshCookie]);
    const res = await req;
    expect(res.status).toBe(200);
    expect(res.headers["set-cookie"]).toBeDefined();
  });
});

