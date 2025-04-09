"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const db_1 = require("../../../lib/db");
const bcrypt_1 = require("bcrypt");
const jose_1 = require("jose");
async function POST(request) {
    const headers = new Headers();
    headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    headers.set("Pragma", "no-cache");
    headers.set("Expires", "0");
    try {
        const body = await request.json();
        console.log("Auth attempt for email:", body.email);
        if (!body.email || !body.password) {
            console.log("Missing email or password");
            return server_1.NextResponse.json({ error: "Email and password are required" }, { status: 400 });
        }
        console.log("Searching for customer with email:", body.email);
        const customers = await (0, db_1.executeQuery)("SELECT * FROM customers WHERE email = ?", [body.email]);
        console.log("Found customers:", customers.length);
        if (customers.length === 0) {
            console.log("No customer found with email:", body.email);
            return server_1.NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
        }
        const customer = customers[0];
        console.log("Found customer with ID:", customer.id, "Email:", customer.email);
        if (!customer.password) {
            console.log("Customer has no password set");
            return server_1.NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
        }
        console.log("Verifying password...");
        try {
            const passwordMatch = await (0, bcrypt_1.compare)(body.password, customer.password);
            console.log("Password match result:", passwordMatch);
            if (!passwordMatch) {
                console.log("Password does not match");
                return server_1.NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
            }
        }
        catch (bcryptError) {
            console.error("bcrypt error during password comparison:", bcryptError);
            return server_1.NextResponse.json({ error: "Authentication error" }, { status: 500 });
        }
        console.log("Creating JWT token...");
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
        const token = await new jose_1.SignJWT({
            id: customer.id,
            email: customer.email,
            name: `${customer.firstname} ${customer.lastname}`,
        })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime("24h")
            .sign(secret);
        console.log("JWT token created successfully");
        const customerData = { ...customer };
        delete customerData.password;
        return new server_1.NextResponse(JSON.stringify({
            token,
            user: customerData,
        }), {
            status: 200,
            headers: headers,
        });
    }
    catch (error) {
        console.error("Error during authentication:", error);
        return server_1.NextResponse.json({ error: "Authentication failed" }, { status: 500 });
    }
}
