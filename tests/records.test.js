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
const { User, Record } = require("../src/models/database");

const JWT_SECRET = "test-secret"; // matches tests/setup.js

function makeToken(role = "admin", userId = "user-1") {
  return jwt.sign({ userId, role }, JWT_SECRET);
}

function mockAuthUser(role = "admin", id = "user-1") {
  User.findByPk.mockResolvedValueOnce({ id, name: "Test", email: "t@t.com", role, is_active: true });
}

const sampleRecord = {
  id: "rec-1", user_id: "user-1", type: "income", amount: 500,
  category: "Salary", date: "2024-01-15", description: "Jan salary",
  save: jest.fn().mockResolvedValue(),
  destroy: jest.fn().mockResolvedValue(),
};

beforeEach(() => jest.clearAllMocks());

// ─────────────────────────────────────────────
// POST /api/records  (admin only)
// ─────────────────────────────────────────────
describe("POST /api/records", () => {
  test("201 — admin creates a record", async () => {
    mockAuthUser("admin");
    Record.create.mockResolvedValue(sampleRecord);

    const res = await request(app)
      .post("/api/records")
      .set("Authorization", `Bearer ${makeToken("admin")}`)
      .send({ type: "income", amount: 500, category: "Salary", date: "2024-01-15" });

    expect(res.status).toBe(201);
    expect(res.body.record.type).toBe("income");
  });

  test("400 — missing required fields", async () => {
    mockAuthUser("admin");
    const res = await request(app)
      .post("/api/records")
      .set("Authorization", `Bearer ${makeToken("admin")}`)
      .send({ type: "income", amount: 500 }); // missing category & date

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/missing/i);
  });

  test("400 — invalid type", async () => {
    mockAuthUser("admin");
    const res = await request(app)
      .post("/api/records")
      .set("Authorization", `Bearer ${makeToken("admin")}`)
      .send({ type: "transfer", amount: 500, category: "Food", date: "2024-01-15" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/income.*expense/i);
  });

  test("400 — negative amount", async () => {
    mockAuthUser("admin");
    const res = await request(app)
      .post("/api/records")
      .set("Authorization", `Bearer ${makeToken("admin")}`)
      .send({ type: "expense", amount: -100, category: "Food", date: "2024-01-15" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/positive/i);
  });

  test("400 — invalid date format", async () => {
    mockAuthUser("admin");
    const res = await request(app)
      .post("/api/records")
      .set("Authorization", `Bearer ${makeToken("admin")}`)
      .send({ type: "expense", amount: 100, category: "Food", date: "15-01-2024" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/YYYY-MM-DD/i);
  });

  test("403 — viewer cannot create records", async () => {
    mockAuthUser("viewer");
    const res = await request(app)
      .post("/api/records")
      .set("Authorization", `Bearer ${makeToken("viewer")}`)
      .send({ type: "income", amount: 500, category: "Salary", date: "2024-01-15" });

    expect(res.status).toBe(403);
  });

  test("403 — analyst cannot create records", async () => {
    mockAuthUser("analyst");
    const res = await request(app)
      .post("/api/records")
      .set("Authorization", `Bearer ${makeToken("analyst")}`)
      .send({ type: "income", amount: 500, category: "Salary", date: "2024-01-15" });

    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────
// GET /api/records  (all roles)
// ─────────────────────────────────────────────
describe("GET /api/records", () => {
  test("200 — admin can list records", async () => {
    mockAuthUser("admin");
    Record.findAndCountAll.mockResolvedValue({ count: 1, rows: [sampleRecord] });

    const res = await request(app)
      .get("/api/records")
      .set("Authorization", `Bearer ${makeToken("admin")}`);

    expect(res.status).toBe(200);
    expect(res.body.records).toHaveLength(1);
    expect(res.body.pagination.total).toBe(1);
  });

  test("200 — viewer can list records", async () => {
    mockAuthUser("viewer");
    Record.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    const res = await request(app)
      .get("/api/records")
      .set("Authorization", `Bearer ${makeToken("viewer")}`);

    expect(res.status).toBe(200);
  });

  test("200 — analyst can list records", async () => {
    mockAuthUser("analyst");
    Record.findAndCountAll.mockResolvedValue({ count: 2, rows: [sampleRecord, sampleRecord] });

    const res = await request(app)
      .get("/api/records")
      .set("Authorization", `Bearer ${makeToken("analyst")}`);

    expect(res.status).toBe(200);
    expect(res.body.records).toHaveLength(2);
  });

  test("200 — supports filtering by type query param", async () => {
    mockAuthUser("admin");
    Record.findAndCountAll.mockResolvedValue({ count: 1, rows: [sampleRecord] });

    const res = await request(app)
      .get("/api/records?type=income&page=1&limit=10")
      .set("Authorization", `Bearer ${makeToken("admin")}`);

    expect(res.status).toBe(200);
    // Check that the filter was passed (findAndCountAll called with type in where)
    const callArgs = Record.findAndCountAll.mock.calls[0][0];
    expect(callArgs.where.type).toBe("income");
  });

  test("401 — no token", async () => {
    const res = await request(app).get("/api/records");
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────
// GET /api/records/:id
// ─────────────────────────────────────────────
describe("GET /api/records/:id", () => {
  test("200 — returns a record by id", async () => {
    mockAuthUser("viewer");
    Record.findByPk.mockResolvedValue(sampleRecord);

    const res = await request(app)
      .get("/api/records/rec-1")
      .set("Authorization", `Bearer ${makeToken("viewer")}`);

    expect(res.status).toBe(200);
    expect(res.body.record.id).toBe("rec-1");
  });

  test("404 — record not found", async () => {
    mockAuthUser("admin");
    Record.findByPk.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/records/nonexistent")
      .set("Authorization", `Bearer ${makeToken("admin")}`);

    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────
// PUT /api/records/:id  (admin only)
// ─────────────────────────────────────────────
describe("PUT /api/records/:id", () => {
  test("200 — admin updates a record", async () => {
    const mockRec = { ...sampleRecord, save: jest.fn().mockResolvedValue() };
    mockAuthUser("admin");
    Record.findByPk.mockResolvedValue(mockRec);

    const res = await request(app)
      .put("/api/records/rec-1")
      .set("Authorization", `Bearer ${makeToken("admin")}`)
      .send({ category: "Freelance", amount: 750 });

    expect(res.status).toBe(200);
    expect(mockRec.save).toHaveBeenCalled();
    expect(mockRec.category).toBe("Freelance");
    expect(mockRec.amount).toBe(750);
  });

  test("400 — no fields to update", async () => {
    const mockRec = { ...sampleRecord, save: jest.fn() };
    mockAuthUser("admin");
    Record.findByPk.mockResolvedValue(mockRec);

    const res = await request(app)
      .put("/api/records/rec-1")
      .set("Authorization", `Bearer ${makeToken("admin")}`)
      .send({});

    expect(res.status).toBe(400);
  });

  test("403 — viewer cannot update records", async () => {
    mockAuthUser("viewer");
    const res = await request(app)
      .put("/api/records/rec-1")
      .set("Authorization", `Bearer ${makeToken("viewer")}`)
      .send({ category: "Food" });

    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────
// DELETE /api/records/:id  (admin only, soft delete)
// ─────────────────────────────────────────────
describe("DELETE /api/records/:id", () => {
  test("200 — admin soft deletes a record", async () => {
    const mockRec = { ...sampleRecord, destroy: jest.fn().mockResolvedValue() };
    mockAuthUser("admin");
    Record.findByPk.mockResolvedValue(mockRec);

    const res = await request(app)
      .delete("/api/records/rec-1")
      .set("Authorization", `Bearer ${makeToken("admin")}`);

    expect(res.status).toBe(200);
    expect(mockRec.destroy).toHaveBeenCalled(); // soft delete via Sequelize paranoid
    expect(res.body.message).toMatch(/soft delete/i);
  });

  test("404 — record not found", async () => {
    mockAuthUser("admin");
    Record.findByPk.mockResolvedValue(null);

    const res = await request(app)
      .delete("/api/records/nonexistent")
      .set("Authorization", `Bearer ${makeToken("admin")}`);

    expect(res.status).toBe(404);
  });

  test("403 — analyst cannot delete records", async () => {
    mockAuthUser("analyst");
    const res = await request(app)
      .delete("/api/records/rec-1")
      .set("Authorization", `Bearer ${makeToken("analyst")}`);

    expect(res.status).toBe(403);
  });
});
