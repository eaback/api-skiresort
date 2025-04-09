"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
exports.PUT = PUT;
exports.DELETE = DELETE;
const server_1 = require("next/server");
const db_1 = require("../../lib/db");
const bcrypt_1 = require("bcrypt");
async function hashPassword(password) {
    return await (0, bcrypt_1.hash)(password, 10);
}
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        let query = "SELECT * FROM customers";
        let params = [];
        if (id) {
            query = "SELECT * FROM customers WHERE id = ?";
            params = [id];
            const customers = await (0, db_1.executeQuery)(query, params);
            if (customers.length === 0) {
                return server_1.NextResponse.json({ error: "Customer not found" }, { status: 404 });
            }
            const customerData = { ...customers[0] };
            delete customerData.password;
            return server_1.NextResponse.json(customerData);
        }
        const customers = await (0, db_1.executeQuery)(query, params);
        const safeCustomers = customers.map((customer) => {
            const customerData = { ...customer };
            delete customerData.password;
            return customerData;
        });
        return server_1.NextResponse.json(safeCustomers);
    }
    catch (error) {
        console.error("Error fetching customers:", error);
        return server_1.NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
    }
}
async function POST(request) {
    try {
        console.log("API received customer creation request");
        const body = await request.json();
        console.log("Parsed request body:", {
            ...body,
            password: body.password ? "[PASSWORD PRESENT]" : "[PASSWORD MISSING]",
        });
        if (!body.firstname || !body.lastname || !body.email || !body.password) {
            console.error("Missing required fields");
            return server_1.NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }
        console.log("Checking if email exists:", body.email);
        const existingCustomers = await (0, db_1.executeQuery)("SELECT * FROM customers WHERE email = ?", [body.email]);
        if (existingCustomers.length > 0) {
            console.error("Email already in use:", body.email);
            return server_1.NextResponse.json({ error: "Email already in use" }, { status: 400 });
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
        return server_1.NextResponse.json(customerData, { status: 201 });
    }
    catch (error) {
        console.error("Error creating customer:", error);
        return server_1.NextResponse.json({ error: "Failed to create customer: " + (error instanceof Error ? error.message : String(error)) }, { status: 500 });
    }
}
async function PUT(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        if (!id) {
            return server_1.NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
        }
        const body = await request.json();
        if (!body.firstname || !body.lastname || !body.email) {
            return server_1.NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }
        const customer = await (0, db_1.executeQuery)("SELECT * FROM customers WHERE id = ?", [id]);
        if (customer.length === 0) {
            return server_1.NextResponse.json({ error: "Customer not found" }, { status: 404 });
        }
        if (body.email !== customer[0].email) {
            const existingCustomers = await (0, db_1.executeQuery)("SELECT * FROM customers WHERE email = ? AND id != ?", [
                body.email,
                id,
            ]);
            if (existingCustomers.length > 0) {
                return server_1.NextResponse.json({ error: "Email already in use" }, { status: 400 });
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
        return server_1.NextResponse.json(customerData);
    }
    catch (error) {
        console.error("Error updating customer:", error);
        return server_1.NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
    }
}
async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        if (!id) {
            return server_1.NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
        }
        const customer = await (0, db_1.executeQuery)("SELECT * FROM customers WHERE id = ?", [id]);
        if (customer.length === 0) {
            return server_1.NextResponse.json({ error: "Customer not found" }, { status: 404 });
        }
        const orders = await (0, db_1.executeQuery)("SELECT * FROM orders WHERE customer_id = ?", [id]);
        if (orders.length > 0) {
            return server_1.NextResponse.json({ error: "Cannot delete customer with existing orders" }, { status: 400 });
        }
        await (0, db_1.executeQuery)("DELETE FROM customers WHERE id = ?", [id]);
        return server_1.NextResponse.json({ success: true });
    }
    catch (error) {
        console.error("Error deleting customer:", error);
        return server_1.NextResponse.json({ error: "Failed to delete customer" }, { status: 500 });
    }
}
