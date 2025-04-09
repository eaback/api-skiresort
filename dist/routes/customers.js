"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = require("../lib/db");
const bcrypt_1 = require("bcrypt");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Apply authentication middleware to all customer routes
router.use(auth_1.authenticateToken);
async function hashPassword(password) {
    return await (0, bcrypt_1.hash)(password, 10);
}
// Get all customers or a specific customer by ID
router.get("/", async (req, res) => {
    try {
        const id = req.query.id;
        let query = "SELECT * FROM customers";
        let params = [];
        if (id) {
            query = "SELECT * FROM customers WHERE id = ?";
            params = [id];
            const customers = await (0, db_1.executeQuery)(query, params);
            if (customers.length === 0) {
                return res.status(404).json({ error: "Customer not found" });
            }
            const customerData = { ...customers[0] };
            delete customerData.password;
            return res.json(customerData);
        }
        const customers = await (0, db_1.executeQuery)(query, params);
        const safeCustomers = customers.map((customer) => {
            const customerData = { ...customer };
            delete customerData.password;
            return customerData;
        });
        return res.json(safeCustomers);
    }
    catch (error) {
        console.error("Error fetching customers:", error);
        return res.status(500).json({ error: "Failed to fetch customers" });
    }
});
// Get customer by email
router.get("/:email", async (req, res) => {
    try {
        const email = decodeURIComponent(req.params.email);
        const customers = await (0, db_1.executeQuery)("SELECT * FROM customers WHERE email = ?", [email]);
        if (customers.length === 0) {
            return res.status(404).json({ error: "Customer not found" });
        }
        const customerData = { ...customers[0] };
        delete customerData.password;
        return res.json(customerData);
    }
    catch (error) {
        console.error("Error fetching customer by email:", error);
        return res.status(500).json({ error: "Failed to fetch customer" });
    }
});
// Create a new customer
router.post("/", async (req, res) => {
    try {
        console.log("API received customer creation request");
        const body = req.body;
        console.log("Parsed request body:", {
            ...body,
            password: body.password ? "[PASSWORD PRESENT]" : "[PASSWORD MISSING]",
        });
        if (!body.firstname || !body.lastname || !body.email || !body.password) {
            console.error("Missing required fields");
            return res.status(400).json({ error: "Missing required fields" });
        }
        console.log("Checking if email exists:", body.email);
        const existingCustomers = await (0, db_1.executeQuery)("SELECT * FROM customers WHERE email = ?", [body.email]);
        if (existingCustomers.length > 0) {
            console.error("Email already in use:", body.email);
            return res.status(400).json({ error: "Email already in use" });
        }
        console.log("Hashing password...");
        const hashedPassword = await hashPassword(body.password);
        console.log("Password hashed successfully, length:", hashedPassword.length);
        const query = `
      INSERT INTO customers (
        firstname, lastname, email, password, phone, 
        street_address, postal_code, city, country
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
        const params = [
            body.firstname,
            body.lastname,
            body.email,
            hashedPassword,
            body.phone || "",
            body.street_address || "",
            body.postal_code || "",
            body.city || "",
            body.country || "Sweden",
        ];
        const result = await (0, db_1.executeInsert)(query, params);
        console.log("Insert result:", result);
        if (!result || !result.insertId) {
            throw new Error("Failed to insert customer - no insertId returned");
        }
        console.log("Fetching newly created customer with ID:", result.insertId);
        const newCustomer = await (0, db_1.executeQuery)("SELECT * FROM customers WHERE id = ?", [result.insertId]);
        if (!newCustomer || newCustomer.length === 0) {
            throw new Error("Customer was inserted but could not be retrieved");
        }
        console.log("Customer created successfully with ID:", result.insertId);
        const customerData = { ...newCustomer[0] };
        delete customerData.password;
        return res.status(201).json(customerData);
    }
    catch (error) {
        console.error("Error creating customer:", error);
        return res.status(500).json({
            error: "Failed to create customer: " + (error instanceof Error ? error.message : String(error)),
        });
    }
});
// Update a customer
router.put("/:id", async (req, res) => {
    try {
        const id = req.params.id;
        if (!id) {
            return res.status(400).json({ error: "Customer ID is required" });
        }
        const body = req.body;
        if (!body.firstname || !body.lastname || !body.email) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const customer = await (0, db_1.executeQuery)("SELECT * FROM customers WHERE id = ?", [id]);
        if (customer.length === 0) {
            return res.status(404).json({ error: "Customer not found" });
        }
        if (body.email !== customer[0].email) {
            const existingCustomers = await (0, db_1.executeQuery)("SELECT * FROM customers WHERE email = ? AND id != ?", [
                body.email,
                id,
            ]);
            if (existingCustomers.length > 0) {
                return res.status(400).json({ error: "Email already in use" });
            }
        }
        let passwordUpdate = "";
        const params = [
            body.firstname,
            body.lastname,
            body.email,
            body.phone || "",
            body.street_address || "",
            body.postal_code || "",
            body.city || "",
            body.country || "Sweden",
            id,
        ];
        if (body.password) {
            passwordUpdate = ", password = ?";
            const hashedPassword = await hashPassword(body.password);
            params.splice(3, 0, hashedPassword);
        }
        const query = `
      UPDATE customers
      SET firstname = ?, lastname = ?, email = ?${passwordUpdate}, 
          phone = ?, street_address = ?, postal_code = ?, city = ?, country = ?
      WHERE id = ?
    `;
        await (0, db_1.executeQuery)(query, params);
        const updatedCustomer = await (0, db_1.executeQuery)("SELECT * FROM customers WHERE id = ?", [id]);
        const customerData = { ...updatedCustomer[0] };
        delete customerData.password;
        return res.json(customerData);
    }
    catch (error) {
        console.error("Error updating customer:", error);
        return res.status(500).json({ error: "Failed to update customer" });
    }
});
// Delete a customer
router.delete("/:id", async (req, res) => {
    try {
        const id = req.params.id;
        if (!id) {
            return res.status(400).json({ error: "Customer ID is required" });
        }
        const customer = await (0, db_1.executeQuery)("SELECT * FROM customers WHERE id = ?", [id]);
        if (customer.length === 0) {
            return res.status(404).json({ error: "Customer not found" });
        }
        const orders = await (0, db_1.executeQuery)("SELECT * FROM orders WHERE customer_id = ?", [id]);
        if (orders.length > 0) {
            return res.status(400).json({ error: "Cannot delete customer with existing orders" });
        }
        await (0, db_1.executeQuery)("DELETE FROM customers WHERE id = ?", [id]);
        return res.json({ success: true });
    }
    catch (error) {
        console.error("Error deleting customer:", error);
        return res.status(500).json({ error: "Failed to delete customer" });
    }
});
exports.default = router;
