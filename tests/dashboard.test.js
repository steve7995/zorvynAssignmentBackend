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
const { User, Record, sequelize } = require("../src/models/database");

const JWT_SECRET = "test-secret"; // matches tests/setup.js

function makeToken(role = "admin", userId = "user-1") {
  return jwt.sign({ userId, role }, JWT_SECRET);
}

function mockAuthUser(role = "admin", id = "user-1") {
  User.findByPk.mockResolvedValueOnce({ id, name: "Test", email: "t@t.com", role, is_active: true });
}

beforeEach(() => jest.clearAllMocks());

// ─────────────────────────────────────────────
// GET /api/dashboard/summary
// ─────────────────────────────────────────────
describe("GET /api/dashboard/summary", () => {
  test("200 — returns income, expenses, net balance", async () => {
    mockAuthUser("admin");
    Record.sum
      .mockResolvedValueOnce(5000)  // income
      .mockResolvedValueOnce(2000); // expenses

    const res = await request(app)
      .get("/api/dashboard/summary")
      .set("Authorization", `Bearer ${makeToken("admin")}`);

    expect(res.status).toBe(200);
    expect(res.body.totalIncome).toBe(5000);
    expect(res.body.totalExpenses).toBe(2000);
    expect(res.body.netBalance).toBe(3000);
  });

  test("200 — returns 0s when no records exist", async () => {
    mockAuthUser("analyst");
    Record.sum.mockResolvedValue(null); // no records yet

    const res = await request(app)
      .get("/api/dashboard/summary")
      .set("Authorization", `Bearer ${makeToken("analyst")}`);

    expect(res.status).toBe(200);
    expect(res.body.totalIncome).toBe(0);
    expect(res.body.totalExpenses).toBe(0);
    expect(res.body.netBalance).toBe(0);
  });

  test("403 — viewer cannot access summary", async () => {
    mockAuthUser("viewer");
    const res = await request(app)
      .get("/api/dashboard/summary")
      .set("Authorization", `Bearer ${makeToken("viewer")}`);

    expect(res.status).toBe(403);
  });

  test("401 — unauthenticated request", async () => {
    const res = await request(app).get("/api/dashboard/summary");
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────
// GET /api/dashboard/category-totals
// ─────────────────────────────────────────────
describe("GET /api/dashboard/category-totals", () => {
  test("200 — returns category breakdown", async () => {
    mockAuthUser("admin");
    sequelize.query.mockResolvedValue([
      { category: "Salary", type: "income", total: 5000, count: 2 },
      { category: "Food", type: "expense", total: 800, count: 10 },
    ]);

    const res = await request(app)
      .get("/api/dashboard/category-totals")
      .set("Authorization", `Bearer ${makeToken("admin")}`);

    expect(res.status).toBe(200);
    expect(res.body.categoryTotals).toHaveLength(2);
    expect(res.body.categoryTotals[0].category).toBe("Salary");
  });

  test("200 — analyst can access category totals", async () => {
    mockAuthUser("analyst");
    sequelize.query.mockResolvedValue([]);

    const res = await request(app)
      .get("/api/dashboard/category-totals")
      .set("Authorization", `Bearer ${makeToken("analyst")}`);

    expect(res.status).toBe(200);
  });

  test("403 — viewer cannot access category totals", async () => {
    mockAuthUser("viewer");
    const res = await request(app)
      .get("/api/dashboard/category-totals")
      .set("Authorization", `Bearer ${makeToken("viewer")}`);

    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────
// GET /api/dashboard/monthly-trends
// ─────────────────────────────────────────────
describe("GET /api/dashboard/monthly-trends", () => {
  test("200 — returns monthly breakdown for last 12 months", async () => {
    mockAuthUser("admin");
    sequelize.query.mockResolvedValue([
      { month: "2024-01", type: "income", total: 3000, count: 1 },
      { month: "2024-01", type: "expense", total: 1200, count: 5 },
    ]);

    const res = await request(app)
      .get("/api/dashboard/monthly-trends")
      .set("Authorization", `Bearer ${makeToken("admin")}`);

    expect(res.status).toBe(200);
    expect(res.body.monthlyTrends).toHaveLength(2);
    expect(res.body.monthlyTrends[0].month).toBe("2024-01");
  });

  test("403 — viewer blocked", async () => {
    mockAuthUser("viewer");
    const res = await request(app)
      .get("/api/dashboard/monthly-trends")
      .set("Authorization", `Bearer ${makeToken("viewer")}`);

    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────
// GET /api/dashboard/recent-activity
// ─────────────────────────────────────────────
describe("GET /api/dashboard/recent-activity", () => {
  test("200 — returns last 10 records with user name", async () => {
    mockAuthUser("admin");
    Record.findAll.mockResolvedValue([
      { id: "r1", type: "income", amount: 500, category: "Salary", user: { name: "Alice" } },
      { id: "r2", type: "expense", amount: 100, category: "Food", user: { name: "Bob" } },
    ]);

    const res = await request(app)
      .get("/api/dashboard/recent-activity")
      .set("Authorization", `Bearer ${makeToken("admin")}`);

    expect(res.status).toBe(200);
    expect(res.body.recentActivity).toHaveLength(2);
    expect(res.body.recentActivity[0].user.name).toBe("Alice");
  });

  test("200 — analyst can access recent activity", async () => {
    mockAuthUser("analyst");
    Record.findAll.mockResolvedValue([]);

    const res = await request(app)
      .get("/api/dashboard/recent-activity")
      .set("Authorization", `Bearer ${makeToken("analyst")}`);

    expect(res.status).toBe(200);
  });

  test("403 — viewer cannot access recent activity", async () => {
    mockAuthUser("viewer");
    const res = await request(app)
      .get("/api/dashboard/recent-activity")
      .set("Authorization", `Bearer ${makeToken("viewer")}`);

    expect(res.status).toBe(403);
  });
});
