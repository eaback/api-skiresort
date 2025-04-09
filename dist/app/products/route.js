"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
exports.PUT = PUT;
exports.DELETE = DELETE;
const server_1 = require("next/server");
const db_1 = require("../../lib/db");
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        const category = searchParams.get("category");
        let query = "SELECT * FROM products";
        let params = [];
        if (id) {
            query = "SELECT * FROM products WHERE id = ?";
            params = [id];
            const products = await (0, db_1.executeQuery)(query, params);
            if (products.length === 0) {
                return server_1.NextResponse.json({ error: "Product not found" }, { status: 404 });
            }
            return server_1.NextResponse.json(products[0]);
        }
        if (category) {
            query = "SELECT * FROM products WHERE category = ?";
            params = [category];
        }
        const products = await (0, db_1.executeQuery)(query, params);
        return server_1.NextResponse.json(products);
    }
    catch (error) {
        console.error("Error fetching products:", error);
        return server_1.NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
    }
}
async function POST(request) {
    try {
        const body = await request.json();
        if (!body.name || !body.price || !body.category) {
            return server_1.NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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
        return server_1.NextResponse.json(newProduct[0], { status: 201 });
    }
    catch (error) {
        console.error("Error creating product:", error);
        return server_1.NextResponse.json({ error: "Failed to create product" }, { status: 500 });
    }
}
async function PUT(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        if (!id) {
            return server_1.NextResponse.json({ error: "Product ID is required" }, { status: 400 });
        }
        const body = await request.json();
        if (!body.name || !body.price || !body.category) {
            return server_1.NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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
            return server_1.NextResponse.json({ error: "Product not found" }, { status: 404 });
        }
        return server_1.NextResponse.json(updatedProduct[0]);
    }
    catch (error) {
        console.error("Error updating product:", error);
        return server_1.NextResponse.json({ error: "Failed to update product" }, { status: 500 });
    }
}
async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        if (!id) {
            return server_1.NextResponse.json({ error: "Product ID is required" }, { status: 400 });
        }
        const product = await (0, db_1.executeQuery)("SELECT * FROM products WHERE id = ?", [id]);
        if (product.length === 0) {
            return server_1.NextResponse.json({ error: "Product not found" }, { status: 404 });
        }
        await (0, db_1.executeQuery)("DELETE FROM products WHERE id = ?", [id]);
        return server_1.NextResponse.json({ success: true });
    }
    catch (error) {
        console.error("Error deleting product:", error);
        return server_1.NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
    }
}
