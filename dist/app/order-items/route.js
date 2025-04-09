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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.PUT = PUT;
exports.DELETE = DELETE;
const server_1 = require("next/server");
const db_1 = require("../../lib/db");
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        const orderId = searchParams.get("orderId");
        if (id) {
            const items = await (0, db_1.executeQuery)("SELECT * FROM order_items WHERE id = ?", [id]);
            if (items.length === 0) {
                return server_1.NextResponse.json({ error: "Order item not found" }, { status: 404 });
            }
            return server_1.NextResponse.json(items[0]);
        }
        if (orderId) {
            const items = await (0, db_1.executeQuery)("SELECT * FROM order_items WHERE order_id = ?", [orderId]);
            return server_1.NextResponse.json(items);
        }
        return server_1.NextResponse.json({ error: "Order ID or item ID is required" }, { status: 400 });
    }
    catch (error) {
        console.error("Error fetching order items:", error);
        return server_1.NextResponse.json({ error: "Failed to fetch order items" }, { status: 500 });
    }
}
async function PUT(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        if (!id) {
            return server_1.NextResponse.json({ error: "Order item ID is required" }, { status: 400 });
        }
        const body = await request.json();
        if (!body.quantity || body.quantity < 1) {
            return server_1.NextResponse.json({ error: "Quantity must be at least 1" }, { status: 400 });
        }
        const item = await (0, db_1.executeQuery)("SELECT * FROM order_items WHERE id = ?", [id]);
        if (item.length === 0) {
            return server_1.NextResponse.json({ error: "Order item not found" }, { status: 404 });
        }
        const quantityDiff = body.quantity - item[0].quantity;
        const connection = await getConnection();
        await connection.beginTransaction();
        try {
            await connection.execute("UPDATE order_items SET quantity = ? WHERE id = ?", [body.quantity, id]);
            await connection.execute("UPDATE products SET stock = stock - ? WHERE id = ?", [quantityDiff, item[0].product_id]);
            await connection.execute(`UPDATE orders 
            SET total_price = (
            SELECT SUM(quantity * unit_price) 
            FROM order_items 
            WHERE order_id = ?
            )
            WHERE id = ?`, [item[0].order_id, item[0].order_id]);
            await connection.commit();
            const updatedItem = await (0, db_1.executeQuery)("SELECT * FROM order_items WHERE id = ?", [id]);
            return server_1.NextResponse.json(updatedItem[0]);
        }
        catch (error) {
            await connection.rollback();
            throw error;
        }
    }
    catch (error) {
        console.error("Error updating order item:", error);
        return server_1.NextResponse.json({ error: "Failed to update order item" }, { status: 500 });
    }
}
async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        if (!id) {
            return server_1.NextResponse.json({ error: "Order item ID is required" }, { status: 400 });
        }
        const item = await (0, db_1.executeQuery)("SELECT * FROM order_items WHERE id = ?", [id]);
        if (item.length === 0) {
            return server_1.NextResponse.json({ error: "Order item not found" }, { status: 404 });
        }
        const connection = await getConnection();
        await connection.beginTransaction();
        try {
            await connection.execute("UPDATE products SET stock = stock + ? WHERE id = ?", [
                item[0].quantity,
                item[0].product_id,
            ]);
            await connection.execute("DELETE FROM order_items WHERE id = ?", [id]);
            await connection.execute(`UPDATE orders 
            SET total_price = (
            SELECT SUM(quantity * unit_price) 
            FROM order_items 
            WHERE order_id = ?
            )
            WHERE id = ?`, [item[0].order_id, item[0].order_id]);
            await connection.commit();
            return server_1.NextResponse.json({ success: true });
        }
        catch (error) {
            await connection.rollback();
            throw error;
        }
    }
    catch (error) {
        console.error("Error deleting order item:", error);
        return server_1.NextResponse.json({ error: "Failed to delete order item" }, { status: 500 });
    }
}
async function getConnection() {
    const pool = await Promise.resolve().then(() => __importStar(require("../../lib/db"))).then((module) => module.getConnection());
    return pool;
}
