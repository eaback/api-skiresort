import express from 'express';
import { db } from '../db';
import { authMiddleware } from '../middleware/auth';
import type { Product } from '../db/types';

const router = express.Router();

// Get all products
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;

    let query = "SELECT * FROM products";
    let params: any[] = [];

    if (category) {
      query = "SELECT * FROM products WHERE category = ?";
      params = [category];
    }

    const products = await db.query<Product[]>(query, params);
    res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const products = await db.query<Product[]>("SELECT * FROM products WHERE id = ?", [id]);

    if (products.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(products[0]);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

// Create product (protected)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, price, stock, category, image } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await db.executeInsert(
      `INSERT INTO products (name, description, price, stock, category, image)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, description || "", price, stock || 0, category, image || ""]
    );

    const newProduct = await db.query<Product[]>("SELECT * FROM products WHERE id = ?", [result.insertId]);

    res.status(201).json(newProduct[0]);
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ error: "Failed to create product" });
  }
});

// Update product (protected)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, stock, category, image } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const product = await db.query<Product[]>("SELECT * FROM products WHERE id = ?", [id]);

    if (product.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    await db.query(
      `UPDATE products
       SET name = ?, description = ?, price = ?, stock = ?, category = ?, image = ?
       WHERE id = ?`,
      [name, description || "", price, stock || 0, category, image || "", id]
    );

    const updatedProduct = await db.query<Product[]>("SELECT * FROM products WHERE id = ?", [id]);

    res.json(updatedProduct[0]);
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: "Failed to update product" });
  }
});

// Delete product (protected)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const product = await db.query<Product[]>("SELECT * FROM products WHERE id = ?", [id]);

    if (product.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    await db.query("DELETE FROM products WHERE id = ?", [id]);

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

export default router;