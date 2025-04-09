"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const db_1 = require("../../../lib/db");
const bcrypt_1 = require("bcrypt");
const jose_1 = require("jose");
async function POST(request) {
    try {
        console.log("API received customer registration request");
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
        const hashedPassword = await (0, bcrypt_1.hash)(body.password, 10);
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
        // Create JWT token for automatic login
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
        const token = await new jose_1.SignJWT({
            id: newCustomer[0].id,
            email: newCustomer[0].email,
            name: `${newCustomer[0].firstname} ${newCustomer[0].lastname}`,
        })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime("24h")
            .sign(secret);
        const customerData = { ...newCustomer[0] };
        delete customerData.password;
        return server_1.NextResponse.json({
            token,
            user: customerData,
        }, { status: 201 });
    }
    catch (error) {
        console.error("Error creating customer:", error);
        return server_1.NextResponse.json({ error: "Failed to create customer: " + (error instanceof Error ? error.message : String(error)) }, { status: 500 });
    }
}
