"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = require("../lib/db");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Get all products or a specific product
router.get("/", async (req, res) => {
    try {
        const id = req.query.id;
        const category = req.query.category;
        let query = "SELECT * FROM products";
        let params = [];
        if (id) {
            query = "SELECT * FROM products WHERE id = ?";
            params = [id];
            const products = await (0, db_1.executeQuery)(query, params);
            if (products.length === 0) {
                return res.status(404).json({ error: "Product not found" });
            }
            return res.json(products[0]);
        }
        if (category) {
            query = "SELECT * FROM products WHERE category = ?";
            params = [category];
        }
        const products = await (0, db_1.executeQuery)(query, params);
        return res.json(products);
    }
    catch (error) {
        console.error("Error fetching products:", error);
        return res.status(500).json({ error: "Failed to fetch products" });
    }
});
// Create a new product (requires authentication)
router.post("/", auth_1.authenticateToken, async (req, res) => {
    try {
        const body = req.body;
        if (!body.name || !body.price || !body.category) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const query = `
      INSERT INTO products (name, description, price, stock, category, image)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
        const params = [
            body.name,
            body.description || "",
            body.price,
            body.stock || 0,
            body.category,
            body.image || "",
        ];
        const result = await (0, db_1.executeInsert)(query, params);
        const newProduct = await (0, db_1.executeQuery)("SELECT * FROM products WHERE id = ?", [result.insertId]);
        return res.status(201).json(newProduct[0]);
    }
    catch (error) {
        console.error("Error creating product:", error);
        return res.status(500).json({ error: "Failed to create product" });
    }
});
// Update a product (requires authentication)
router.put("/:id", auth_1.authenticateToken, async (req, res) => {
    try {
        const id = req.params.id;
        if (!id) {
            return res.status(400).json({ error: "Product ID is required" });
        }
        const body = req.body;
        if (!body.name || !body.price || !body.category) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const query = `
      UPDATE products
      SET name = ?, description = ?, price = ?, stock = ?, category = ?, image = ?
      WHERE id = ?
    `;
        const params = [
            body.name,
            body.description || "",
            body.price,
            body.stock || 0,
            body.category,
            body.image || "",
            id,
        ];
        await (0, db_1.executeQuery)(query, params);
        const updatedProduct = await (0, db_1.executeQuery)("SELECT * FROM products WHERE id = ?", [id]);
        if (updatedProduct.length === 0) {
            return res.status(404).json({ error: "Product not found" });
        }
        return res.json(updatedProduct[0]);
    }
    catch (error) {
        console.error("Error updating product:", error);
        return res.status(500).json({ error: "Failed to update product" });
    }
});
// Delete a product (requires authentication)
router.delete("/:id", auth_1.authenticateToken, async (req, res) => {
    try {
        const id = req.params.id;
        if (!id) {
            return res.status(400).json({ error: "Product ID is required" });
        }
        const product = await (0, db_1.executeQuery)("SELECT * FROM products WHERE id = ?", [id]);
        if (product.length === 0) {
            return res.status(404).json({ error: "Product not found" });
        }
        await (0, db_1.executeQuery)("DELETE FROM products WHERE id = ?", [id]);
        return res.json({ success: true });
    }
    catch (error) {
        console.error("Error deleting product:", error);
        return res.status(500).json({ error: "Failed to delete product" });
    }
});
exports.default = router;
