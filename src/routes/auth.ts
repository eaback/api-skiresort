import express from 'express';
import { compare } from 'bcrypt';
import { SignJWT } from 'jose';
import { db } from '../db';
import type { Customer } from '../db/types';

const router = express.Router();

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
        }

        const customers = await db.query<Customer[]>("SELECT * FROM customers WHERE email = ?", [email]);

        if (customers.length === 0) {
        return res.status(401).json({ error: "Invalid email or password" });
        }

        const customer = customers[0];

        if (!customer.password) {
        return res.status(401).json({ error: "Invalid email or password" });
        }

        const passwordMatch = await compare(password, customer.password);
        if (!passwordMatch) {
        return res.status(401).json({ error: "Invalid email or password" });
        }

        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-change-this-in-production");

        const token = await new SignJWT({
        id: customer.id,
        email: customer.email,
        name: `${customer.firstname} ${customer.lastname}`,
        })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h")
        .sign(secret);

        const customerData = {...customer};
        delete customerData.password;

        res.status(200).json({
        token,
        user: customerData,
        });
    } catch (error) {
        console.error("Error during authentication:", error);
        res.status(500).json({ error: "Authentication failed" });
    }
});

export default router;