import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import type { Express } from "express";

// Env must exist before the app (and its env validation) loads.
process.env.NODE_ENV = "test";
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/dyners_test";
process.env.JWT_ACCESS_SECRET ??= "test-secret-test-secret-test-secret-test-secret";

let app: Express;

beforeAll(async () => {
  const { createApp } = await import("../src/app");
  app = createApp();
});

describe("health", () => {
  it("responds ok without auth", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});

describe("routing & errors", () => {
  it("404s unknown routes with JSON", async () => {
    const res = await request(app).get("/api/v1/nope");
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  it("rejects malformed JSON bodies", async () => {
    const res = await request(app)
      .post("/api/v1/contact")
      .set("content-type", "application/json")
      .send("{not json");
    expect(res.status).toBe(400);
  });
});

describe("validation (fails before any DB access)", () => {
  it("rejects an invalid contact payload", async () => {
    const res = await request(app)
      .post("/api/v1/contact")
      .send({ name: "A", email: "not-an-email", message: "hi" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name|email|message/);
  });

  it("rejects a login with a malformed email", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "nope", password: "irrelevant1234" });
    expect(res.status).toBe(400);
  });
});

describe("auth guard", () => {
  it.each([
    ["GET", "/api/v1/admin/stats"],
    ["GET", "/api/v1/testimonials/all"],
    ["POST", "/api/v1/gallery"],
    ["DELETE", "/api/v1/menus/3f2a9b9e-3d3e-4a6f-9a1e-2b3c4d5e6f70"],
  ])("%s %s requires a token", async (method, url) => {
    const res = await request(app)[method.toLowerCase() as "get" | "post" | "delete"](url);
    expect(res.status).toBe(401);
  });

  it("rejects a garbage bearer token", async () => {
    const res = await request(app)
      .get("/api/v1/admin/stats")
      .set("authorization", "Bearer not.a.jwt");
    expect(res.status).toBe(401);
  });
});

describe("security headers", () => {
  it("sets helmet headers and hides x-powered-by", async () => {
    const res = await request(app).get("/health");
    expect(res.headers["x-powered-by"]).toBeUndefined();
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });
});
