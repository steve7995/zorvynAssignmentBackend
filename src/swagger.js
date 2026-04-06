const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Finance Dashboard API",
      version: "1.0.0",
      description:
        "REST API for managing financial records with role-based access control (admin, analyst, viewer).",
    },
    servers: [
      {
        url: process.env.API_BASE_URL || "http://localhost:3000",
        description: "Server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string", example: "John Doe" },
            email: { type: "string", format: "email", example: "john@example.com" },
            role: { type: "string", enum: ["admin", "analyst", "viewer"] },
            is_active: { type: "boolean" },
          },
        },
        Record: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            user_id: { type: "string", format: "uuid" },
            type: { type: "string", enum: ["income", "expense"] },
            amount: { type: "number", example: 1500.0 },
            category: { type: "string", example: "Salary" },
            date: { type: "string", format: "date", example: "2024-01-15" },
            description: { type: "string", example: "Monthly salary" },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: { type: "string" },
          },
        },
      },
    },
    tags: [
      { name: "Auth", description: "Authentication endpoints" },
      { name: "Users", description: "User management (admin only)" },
      { name: "Records", description: "Financial records CRUD" },
      { name: "Dashboard", description: "Analytics and summaries" },
    ],
    paths: {
      "/api/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Login",
          description: "Authenticate with email and password, returns a JWT token.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string", format: "email", example: "admin@finance.com" },
                    password: { type: "string", example: "admin123" },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Login successful",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      message: { type: "string" },
                      token: { type: "string" },
                      user: { $ref: "#/components/schemas/User" },
                    },
                  },
                },
              },
            },
            401: { description: "Invalid credentials", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            403: { description: "Account deactivated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/api/auth/register": {
        post: {
          tags: ["Auth"],
          summary: "Register a new user (Admin only)",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "email", "password"],
                  properties: {
                    name: { type: "string", example: "Jane Smith" },
                    email: { type: "string", format: "email", example: "jane@example.com" },
                    password: { type: "string", minLength: 6, example: "secret123" },
                    role: { type: "string", enum: ["admin", "analyst", "viewer"], default: "viewer" },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: "User created" },
            400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            401: { description: "Unauthorized" },
            403: { description: "Forbidden – admin only" },
            409: { description: "Email already exists" },
          },
        },
      },
      "/api/users/me": {
        get: {
          tags: ["Users"],
          summary: "Get own profile",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "User profile", content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } } },
            401: { description: "Unauthorized" },
          },
        },
      },
      "/api/users": {
        get: {
          tags: ["Users"],
          summary: "List all users (Admin only)",
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "List of users",
              content: {
                "application/json": {
                  schema: { type: "object", properties: { users: { type: "array", items: { $ref: "#/components/schemas/User" } } } },
                },
              },
            },
            401: { description: "Unauthorized" },
            403: { description: "Forbidden – admin only" },
          },
        },
      },
      "/api/users/{id}": {
        get: {
          tags: ["Users"],
          summary: "Get user by ID (Admin only)",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            200: { description: "User found", content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } } },
            404: { description: "Not found" },
          },
        },
        patch: {
          tags: ["Users"],
          summary: "Update user (Admin only)",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    role: { type: "string", enum: ["admin", "analyst", "viewer"] },
                    is_active: { type: "boolean" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "User updated" },
            404: { description: "Not found" },
          },
        },
      },
      "/api/records": {
        get: {
          tags: ["Records"],
          summary: "List financial records",
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "type", in: "query", schema: { type: "string", enum: ["income", "expense"] } },
            { name: "category", in: "query", schema: { type: "string" } },
            { name: "start_date", in: "query", schema: { type: "string", format: "date" }, example: "2024-01-01" },
            { name: "end_date", in: "query", schema: { type: "string", format: "date" }, example: "2024-12-31" },
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 100 } },
          ],
          responses: {
            200: {
              description: "Paginated list of records",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      records: { type: "array", items: { $ref: "#/components/schemas/Record" } },
                      pagination: {
                        type: "object",
                        properties: {
                          page: { type: "integer" },
                          limit: { type: "integer" },
                          total: { type: "integer" },
                          totalPages: { type: "integer" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ["Records"],
          summary: "Create a financial record (Admin only)",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["type", "amount", "category", "date"],
                  properties: {
                    type: { type: "string", enum: ["income", "expense"] },
                    amount: { type: "number", example: 2500.0 },
                    category: { type: "string", example: "Salary" },
                    date: { type: "string", format: "date", example: "2024-01-15" },
                    description: { type: "string", example: "January salary" },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: "Record created" },
            400: { description: "Validation error" },
            403: { description: "Forbidden – admin only" },
          },
        },
      },
      "/api/records/{id}": {
        get: {
          tags: ["Records"],
          summary: "Get record by ID",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            200: { description: "Record found", content: { "application/json": { schema: { $ref: "#/components/schemas/Record" } } } },
            404: { description: "Not found" },
          },
        },
        put: {
          tags: ["Records"],
          summary: "Update a record (Admin only)",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    type: { type: "string", enum: ["income", "expense"] },
                    amount: { type: "number" },
                    category: { type: "string" },
                    date: { type: "string", format: "date" },
                    description: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Record updated" },
            404: { description: "Not found" },
          },
        },
        delete: {
          tags: ["Records"],
          summary: "Delete a record (Admin only, soft delete)",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            200: { description: "Record deleted" },
            404: { description: "Not found" },
          },
        },
      },
      "/api/dashboard/summary": {
        get: {
          tags: ["Dashboard"],
          summary: "Financial summary (Admin, Analyst)",
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "Summary totals",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      totalIncome: { type: "number" },
                      totalExpenses: { type: "number" },
                      netBalance: { type: "number" },
                      totalRecords: { type: "integer" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/dashboard/category-totals": {
        get: {
          tags: ["Dashboard"],
          summary: "Totals grouped by category (Admin, Analyst)",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "Category breakdown" },
          },
        },
      },
      "/api/dashboard/monthly-trends": {
        get: {
          tags: ["Dashboard"],
          summary: "Monthly income vs expense trends (Admin, Analyst)",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "Monthly trend data" },
          },
        },
      },
      "/api/dashboard/recent-activity": {
        get: {
          tags: ["Dashboard"],
          summary: "Recent financial activity (Admin, Analyst)",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "Recent records" },
          },
        },
      },
    },
  },
  apis: [],
};

const swaggerSpec = swaggerJsdoc(options);

function setupSwagger(app) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: "Finance Dashboard API Docs",
  }));

  // Expose raw OpenAPI JSON
  app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });

  console.log(" API Docs available at /api-docs");
}

module.exports = { setupSwagger };
