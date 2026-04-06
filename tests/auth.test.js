const request = require("supertest");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Mock the database module before importing app
jest.mock("../src/models/database", () => ({
  initDB: jest.fn().mockResolvedValue(),
  sequelize: { query: jest.fn() },
  User: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  },
  Record: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    findAll: jest.fn(),
    findAndCountAll: jest.fn(),
    create: jest.fn(),
    sum: jest.fn(),
    destroy: jest.fn(),
  },
}));

jest.mock("../src/models/seed", () => ({ seedDefaultAdmin: jest.fn() }));

const app = require("../src/app");
const { User } = require("../src/models/database");

const JWT_SECRET = "test-secret"; // matches tests/setup.js

// Helper: make a valid admin token
function makeToken(role = "admin", userId = "user-1") {
  return jwt.sign({ userId, role }, JWT_SECRET);
}

// Helper: mock the authenticate middleware's User.findByPk call
function mockAuthUser(role = "admin", id = "user-1") {
  User.findByPk.mockResolvedValueOnce({ id, name: "Test", email: "t@t.com", role, is_active: true });
}

beforeEach(() => jest.clearAllMocks());

// ─────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────
describe("POST /api/auth/login", () => {
  test("200 — valid credentials return token", async () => {
    const hashed = bcrypt.hashSync("password123", 10);
    User.findOne.mockResolvedValue({ id: "u1", name: "Alice", email: "alice@test.com", role: "admin", is_active: true, password: hashed });

    const res = await request(app).post("/api/auth/login").send({ email: "alice@test.com", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user.email).toBe("alice@test.com");
  });

  test("400 — missing fields", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "alice@test.com" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/missing/i);
  });

  test("401 — user not found", async () => {
    User.findOne.mockResolvedValue(null);
    const res = await request(app).post("/api/auth/login").send({ email: "nobody@test.com", password: "pass" });
    expect(res.status).toBe(401);
  });

  test("401 — wrong password", async () => {
    const hashed = bcrypt.hashSync("correctpass", 10);
    User.findOne.mockResolvedValue({ id: "u1", email: "alice@test.com", role: "admin", is_active: true, password: hashed });

    const res = await request(app).post("/api/auth/login").send({ email: "alice@test.com", password: "wrongpass" });
    expect(res.status).toBe(401);
  });

  test("403 — deactivated account", async () => {
    const hashed = bcrypt.hashSync("password123", 10);
    User.findOne.mockResolvedValue({ id: "u1", email: "alice@test.com", role: "viewer", is_active: false, password: hashed });

    const res = await request(app).post("/api/auth/login").send({ email: "alice@test.com", password: "password123" });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/deactivated/i);
  });
});

// ─────────────────────────────────────────────
// POST /api/auth/register  (admin only)
// ─────────────────────────────────────────────
describe("POST /api/auth/register", () => {
  test("201 — admin creates a new user", async () => {
    mockAuthUser("admin");
    User.findOne.mockResolvedValue(null); // email not taken
    User.create.mockResolvedValue({ id: "u2", name: "Bob", email: "bob@test.com", role: "viewer" });

    const res = await request(app)
      .post("/api/auth/register")
      .set("Authorization", `Bearer ${makeToken("admin")}`)
      .send({ name: "Bob", email: "bob@test.com", password: "secret123", role: "viewer" });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("bob@test.com");
  });

  test("400 — missing required fields", async () => {
    mockAuthUser("admin");
    const res = await request(app)
      .post("/api/auth/register")
      .set("Authorization", `Bearer ${makeToken("admin")}`)
      .send({ email: "bob@test.com" }); // missing name & password

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/missing/i);
  });

  test("400 — invalid email format", async () => {
    mockAuthUser("admin");
    const res = await request(app)
      .post("/api/auth/register")
      .set("Authorization", `Bearer ${makeToken("admin")}`)
      .send({ name: "Bob", email: "not-an-email", password: "secret123" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });

  test("400 — password too short", async () => {
    mockAuthUser("admin");
    const res = await request(app)
      .post("/api/auth/register")
      .set("Authorization", `Bearer ${makeToken("admin")}`)
      .send({ name: "Bob", email: "bob@test.com", password: "abc" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/6 characters/i);
  });

  test("409 — duplicate email", async () => {
    mockAuthUser("admin");
    User.findOne.mockResolvedValue({ id: "existing" }); // email already taken

    const res = await request(app)
      .post("/api/auth/register")
      .set("Authorization", `Bearer ${makeToken("admin")}`)
      .send({ name: "Bob", email: "taken@test.com", password: "secret123" });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already exists/i);
  });

  test("403 — viewer cannot register users", async () => {
    mockAuthUser("viewer");
    const res = await request(app)
      .post("/api/auth/register")
      .set("Authorization", `Bearer ${makeToken("viewer")}`)
      .send({ name: "Bob", email: "bob@test.com", password: "secret123" });

    expect(res.status).toBe(403);
  });

  test("401 — no token provided", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Bob", email: "bob@test.com", password: "secret123" });

    expect(res.status).toBe(401);
  });
});
