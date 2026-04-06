const request = require("supertest");
const jwt = require("jsonwebtoken");

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
  },
}));

jest.mock("../src/models/seed", () => ({ seedDefaultAdmin: jest.fn() }));

const app = require("../src/app");
const { User } = require("../src/models/database");

const JWT_SECRET = "test-secret"; // matches tests/setup.js

function makeToken(role = "admin", userId = "user-1") {
  return jwt.sign({ userId, role }, JWT_SECRET);
}

// Mocks the authenticate middleware's User.findByPk
function mockAuthUser(role = "admin", id = "user-1") {
  User.findByPk.mockResolvedValueOnce({ id, name: "Test Admin", email: "admin@test.com", role, is_active: true });
}

beforeEach(() => jest.clearAllMocks());

// ─────────────────────────────────────────────
// GET /api/users/me
// ─────────────────────────────────────────────
describe("GET /api/users/me", () => {
  test("200 — returns own profile for any logged-in user", async () => {
    mockAuthUser("viewer", "user-99");
    const res = await request(app)
      .get("/api/users/me")
      .set("Authorization", `Bearer ${makeToken("viewer", "user-99")}`);

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("viewer");
  });

  test("401 — no token", async () => {
    const res = await request(app).get("/api/users/me");
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────
// GET /api/users  (admin only)
// ─────────────────────────────────────────────
describe("GET /api/users", () => {
  test("200 — admin gets list of all users", async () => {
    mockAuthUser("admin");
    User.findAll.mockResolvedValue([
      { id: "u1", name: "Alice", email: "a@t.com", role: "admin", is_active: true },
      { id: "u2", name: "Bob", email: "b@t.com", role: "viewer", is_active: true },
    ]);

    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${makeToken("admin")}`);

    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(2);
  });

  test("403 — analyst cannot list users", async () => {
    mockAuthUser("analyst");
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${makeToken("analyst")}`);

    expect(res.status).toBe(403);
  });

  test("403 — viewer cannot list users", async () => {
    mockAuthUser("viewer");
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${makeToken("viewer")}`);

    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────
// GET /api/users/:id  (admin only)
// ─────────────────────────────────────────────
describe("GET /api/users/:id", () => {
  test("200 — admin gets a specific user", async () => {
    mockAuthUser("admin");                     // 1st call: authenticate
    User.findByPk.mockResolvedValueOnce({      // 2nd call: getUser controller
      id: "u2", name: "Bob", email: "b@t.com", role: "viewer", is_active: true,
    });

    const res = await request(app)
      .get("/api/users/u2")
      .set("Authorization", `Bearer ${makeToken("admin")}`);

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe("u2");
  });

  test("404 — user not found", async () => {
    mockAuthUser("admin");
    User.findByPk.mockResolvedValueOnce(null); // controller: not found

    const res = await request(app)
      .get("/api/users/nonexistent")
      .set("Authorization", `Bearer ${makeToken("admin")}`);

    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────
// PATCH /api/users/:id  (admin only)
// ─────────────────────────────────────────────
describe("PATCH /api/users/:id", () => {
  test("200 — admin updates role", async () => {
    const mockUser = { id: "u2", role: "viewer", is_active: true, save: jest.fn().mockResolvedValue() };
    mockAuthUser("admin");
    User.findByPk.mockResolvedValueOnce(mockUser);

    const res = await request(app)
      .patch("/api/users/u2")
      .set("Authorization", `Bearer ${makeToken("admin")}`)
      .send({ role: "analyst" });

    expect(res.status).toBe(200);
    expect(mockUser.save).toHaveBeenCalled();
    expect(mockUser.role).toBe("analyst");
  });

  test("200 — admin deactivates a user", async () => {
    const mockUser = { id: "u2", role: "viewer", is_active: true, save: jest.fn().mockResolvedValue() };
    mockAuthUser("admin");
    User.findByPk.mockResolvedValueOnce(mockUser);

    const res = await request(app)
      .patch("/api/users/u2")
      .set("Authorization", `Bearer ${makeToken("admin")}`)
      .send({ is_active: false });

    expect(res.status).toBe(200);
    expect(mockUser.is_active).toBe(false);
  });

  test("400 — invalid role value", async () => {
    const mockUser = { id: "u2", save: jest.fn() };
    mockAuthUser("admin");
    User.findByPk.mockResolvedValueOnce(mockUser);

    const res = await request(app)
      .patch("/api/users/u2")
      .set("Authorization", `Bearer ${makeToken("admin")}`)
      .send({ role: "superuser" }); // invalid

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid role/i);
  });

  test("400 — no fields provided", async () => {
    const mockUser = { id: "u2", save: jest.fn() };
    mockAuthUser("admin");
    User.findByPk.mockResolvedValueOnce(mockUser);

    const res = await request(app)
      .patch("/api/users/u2")
      .set("Authorization", `Bearer ${makeToken("admin")}`)
      .send({});

    expect(res.status).toBe(400);
  });

  test("403 — viewer cannot update users", async () => {
    mockAuthUser("viewer");
    const res = await request(app)
      .patch("/api/users/u2")
      .set("Authorization", `Bearer ${makeToken("viewer")}`)
      .send({ role: "analyst" });

    expect(res.status).toBe(403);
  });
});
