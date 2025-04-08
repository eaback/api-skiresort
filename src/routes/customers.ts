import express from 'express';
import { hash } from 'bcrypt';
import { db } from '../db';
import { authMiddleware } from '../middleware/auth';
import type { Customer } from '../db/types';

const router = express.Router();

// Get all customers (protected)
router.get('/', authMiddleware, async (req, res) => {
    try {
        const customers = await db.query<Customer[]>("SELECT * FROM customers");
        
        const safeCustomers = customers.map(customer => {
        const customerData = { ...customer };
        delete customerData.password;
        return customerData;
        });
        
        res.json(safeCustomers);
    } catch (error) {
        console.error("Error fetching customers:", error);
        res.status(500).json({ error: "Failed to fetch customers" });
    }
});

// Get customer by ID (protected)
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        const customers = await db.query<Customer[]>("SELECT * FROM customers WHERE id = ?", [id]);
        
        if (customers.length === 0) {
        return res.status(404).json({ error: "Customer not found" });
        }
        
        const customerData = { ...customers[0] };
        delete customerData.password;
        
        res.json(customerData);
    } catch (error) {
        console.error("Error fetching customer:", error);
        res.status(500).json({ error: "Failed to fetch customer" });
    }
});

// Get customer by email (public - for checking if email exists)
router.get('/email/:email', async (req, res) => {
    try {
        const { email } = req.params;
        
        const customers = await db.query<Customer[]>("SELECT * FROM customers WHERE email = ?", [email]);
        
        if (customers.length === 0) {
        return res.status(404).json({ error: "Customer not found" });
        }
        
        const customerData = { ...customers[0] };
        delete customerData.password;
        
        res.json(customerData);
    } catch (error) {
        console.error("Error fetching customer by email:", error);
        res.status(500).json({ error: "Failed to fetch customer" });
    }
});

// Create customer (public - for registration)
router.post('/', async (req, res) => {
    try {
        const { firstname, lastname, email, password, phone, street_address, postal_code, city, country } = req.body;
        
        if (!firstname || !lastname || !email || !password) {
        return res.status(400).json({ error: "Missing required fields" });
        }
        
        const existingCustomers = await db.query<Customer[]>("SELECT * FROM customers WHERE email = ?", [email]);
        
        if (existingCustomers.length > 0) {
        return res.status(400).json({ error: "Email already in use" });
        }
        
        const hashedPassword = await hash(password, 10);
        
        const result = await db.executeInsert(
        `INSERT INTO customers (
            firstname, lastname, email, password, phone, 
            street_address, postal_code, city, country
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            firstname,
            lastname,
            email,
            hashedPassword,
            phone || "",
            street_address || "",
            postal_code || "",
            city || "",
            country || "Sweden",
        ]
        );
        
        const newCustomer = await db.query<Customer[]>("SELECT * FROM customers WHERE id = ?", [result.insertId]);
        
        const customerData = { ...newCustomer[0] };
        delete customerData.password;
        
        res.status(201).json(customerData);
    } catch (error) {
        console.error("Error creating customer:", error);
        res.status(500).json({ error: "Failed to create customer" });
    }
});

// Update customer (protected)
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { firstname, lastname, email, password, phone, street_address, postal_code, city, country } = req.body;

        if (!firstname || !lastname || !email) {
            return res.status(400).json({ error: "Missing required fields" });
        }

    const customer = await db.query<Customer[]>("SELECT * FROM customers WHERE id = ?", [id]);

    if (customer.length === 0) {
        return res.status(404).json({ error: "Customer not found" });
        }

        if (email !== customer[0].email) {
        const existingCustomers = await db.query<Customer[]>(
            "SELECT * FROM customers WHERE email = ? AND id != ?", 
            [email, id]
        );

        if (existingCustomers.length > 0) {
            return res.status(400).json({ error: "Email already in use" });
        }
    }

    let passwordUpdate = "";
    const params: any[] = [
        firstname,
        lastname,
        email,
        phone || "",
        street_address || "",
        postal_code || "",
        city || "",
        country || "Sweden",
        id,
    ];

    if (password) {
        passwordUpdate = ", password = ?";
        const hashedPassword = await hash(password, 10);
        params.splice(3, 0, hashedPassword);
    }

    const query = `
        UPDATE customers
        SET firstname = ?, lastname = ?, email = ?${passwordUpdate}, 
            phone = ?, street_address = ?, postal_code = ?, city = ?, country = ?
        WHERE id = ?
        `;

        await db.query(query, params);

        const updatedCustomer = await db.query<Customer[]>("SELECT * FROM customers WHERE id = ?", [id]);

        const customerData = { ...updatedCustomer[0] };
        delete customerData.password;
        
        res.json(customerData);
    } catch (error) {
        console.error("Error updating customer:", error);
        res.status(500).json({ error: "Failed to update customer" });
    }
});

// Delete customer (protected)
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const customer = await db.query<Customer[]>("SELECT * FROM customers WHERE id = ?", [id]);

        if (customer.length === 0) {
        return res.status(404).json({ error: "Customer not found" });
        }

        const orders = await db.query<any[]>("SELECT * FROM orders WHERE customer_id = ?", [id]);

        if (orders.length > 0) {
        return res.status(400).json({ error: "Cannot delete customer with existing orders" });
        }

        await db.query("DELETE FROM customers WHERE id = ?", [id]);

        res.json({ success: true });
    } catch (error) {
        console.error("Error deleting customer:", error);
        res.status(500).json({ error: "Failed to delete customer" });
    }
});

export default router;