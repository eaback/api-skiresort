import express from "express"
import { executeQuery, executeInsert } from "../lib/db"
import type { Product } from "../lib/db-types"
import { authenticateToken, type AuthenticatedRequest } from "../middleware/auth"

const router = express.Router()

// Get all products or a specific product
router.get("/", async (req, res) => {
  try {
    const id = req.query.id as string | undefined
    const category = req.query.category as string | undefined

    let query = "SELECT * FROM products"
    let params: (string | number)[] = []

    if (id) {
      query = "SELECT * FROM products WHERE id = ?"
      params = [id]

      const products = await executeQuery<Product[]>(query, params)

      if (products.length === 0) {
        return res.status(404).json({ error: "Product not found" })
      }

      return res.json(products[0])
    }

    if (category) {
      query = "SELECT * FROM products WHERE category = ?"
      params = [category]
    }

    const products = await executeQuery<Product[]>(query, params)
    return res.json(products)
  } catch (error) {
    console.error("Error fetching products:", error)
    return res.status(500).json({ error: "Failed to fetch products" })
  }
})

// Create a new product (requires authentication)
router.post("/", authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const body = req.body

    if (!body.name || !body.price || !body.category) {
      return res.status(400).json({ error: "Missing required fields" })
    }

    const query = `
      INSERT INTO products (name, description, price, stock, category, image)
      VALUES (?, ?, ?, ?, ?, ?)
    `

    const params: (string | number)[] = [
      body.name,
      body.description || "",
      body.price,
      body.stock || 0,
      body.category,
      body.image || "",
    ]

    const result = await executeInsert(query, params)

    const newProduct = await executeQuery<Product[]>("SELECT * FROM products WHERE id = ?", [result.insertId])

    return res.status(201).json(newProduct[0])
  } catch (error) {
    console.error("Error creating product:", error)
    return res.status(500).json({ error: "Failed to create product" })
  }
})

// Update a product (requires authentication)
router.put("/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id

    if (!id) {
      return res.status(400).json({ error: "Product ID is required" })
    }

    const body = req.body

    if (!body.name || !body.price || !body.category) {
      return res.status(400).json({ error: "Missing required fields" })
    }

    const query = `
      UPDATE products
      SET name = ?, description = ?, price = ?, stock = ?, category = ?, image = ?
      WHERE id = ?
    `

    const params: (string | number)[] = [
      body.name,
      body.description || "",
      body.price,
      body.stock || 0,
      body.category,
      body.image || "",
      id,
    ]

    await executeQuery<unknown>(query, params)

    const updatedProduct = await executeQuery<Product[]>("SELECT * FROM products WHERE id = ?", [id])

    if (updatedProduct.length === 0) {
      return res.status(404).json({ error: "Product not found" })
    }

    return res.json(updatedProduct[0])
  } catch (error) {
    console.error("Error updating product:", error)
    return res.status(500).json({ error: "Failed to update product" })
  }
})

// Delete a product (requires authentication)
router.delete("/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id

    if (!id) {
      return res.status(400).json({ error: "Product ID is required" })
    }

    const product = await executeQuery<Product[]>("SELECT * FROM products WHERE id = ?", [id])

    if (product.length === 0) {
      return res.status(404).json({ error: "Product not found" })
    }

    await executeQuery<unknown>("DELETE FROM products WHERE id = ?", [id])

    return res.json({ success: true })
  } catch (error) {
    console.error("Error deleting product:", error)
    return res.status(500).json({ error: "Failed to delete product" })
  }
})

export default router
