"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/auth.ts
const express_1 = __importDefault(require("express"));
const db_1 = require("../lib/db");
const bcrypt_1 = require("bcrypt");
const router = express_1.default.Router();
// Login route
router.post("/login", async (req, res) => {
    try {
        const body = req.body;
        console.log("Auth attempt for email:", body.email);
        if (!body.email || !body.password) {
            console.log("Missing email or password");
            return res.status(400).json({ error: "Email and password are required" });
        }
        console.log("Searching for customer with email:", body.email);
        const customers = await (0, db_1.executeQuery)("SELECT * FROM customers WHERE email = ?", [body.email]);
        console.log("Found customers:", customers.length);
        if (customers.length === 0) {
            console.log("No customer found with email:", body.email);
            return res.status(401).json({ error: "Invalid email or password" });
        }
        const customer = customers[0];
        console.log("Found customer with ID:", customer.id, "Email:", customer.email);
        if (!customer.password) {
            console.log("Customer has no password set");
            return res.status(401).json({ error: "Invalid email or password" });
        }
        console.log("Verifying password...");
        try {
            const passwordMatch = await (0, bcrypt_1.compare)(body.password, customer.password);
            console.log("Password match result:", passwordMatch);
            if (!passwordMatch) {
                console.log("Password does not match");
                return res.status(401).json({ error: "Invalid email or password" });
            }
        }
        catch (bcryptError) {
            console.error("bcrypt error during password comparison:", bcryptError);
            return res.status(500).json({ error: "Authentication error" });
        }
        console.log("Creating JWT token...");
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
        // Import jose dynamically
        const { SignJWT } = await Promise.resolve().then(() => __importStar(require('jose')));
        const token = await new SignJWT({
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
        res.status(200).json({
            token,
            user: customerData,
        });
    }
    catch (error) {
        console.error("Error during authentication:", error);
        res.status(500).json({ error: "Authentication failed" });
    }
});
// Register route
router.post("/register", async (req, res) => {
    try {
        console.log("API received customer registration request");
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
        const { SignJWT } = await Promise.resolve().then(() => __importStar(require('jose')));
        const token = await new SignJWT({
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
        res.status(201).json({
            token,
            user: customerData,
        });
    }
    catch (error) {
        console.error("Error creating customer:", error);
        res.status(500).json({
            error: "Failed to create customer: " + (error instanceof Error ? error.message : String(error)),
        });
    }
});
exports.default = router;
