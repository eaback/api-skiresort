"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = require("../lib/db");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Apply authentication middleware to all order item routes
router.use(auth_1.authenticateToken);
// Get order items
router.get("/", async (req, res) => {
    try {
        const id = req.query.id;
        const orderId = req.query.orderId;
        if (id) {
            const items = await (0, db_1.executeQuery)("SELECT * FROM order_items WHERE id = ?", [id]);
            if (items.length === 0) {
                return res.status(404).json({ error: "Order item not found" });
            }
            return res.json(items[0]);
        }
        if (orderId) {
            const items = await (0, db_1.executeQuery)("SELECT * FROM order_items WHERE order_id = ?", [orderId]);
            return res.json(items);
        }
        return res.status(400).json({ error: "Order ID or item ID is required" });
    }
    catch (error) {
        console.error("Error fetching order items:", error);
        return res.status(500).json({ error: "Failed to fetch order items" });
    }
});
// Update an order item
router.put("/:id", async (req, res) => {
    try {
        const id = req.params.id;
        if (!id) {
            return res.status(400).json({ error: "Order item ID is required" });
        }
        const body = req.body;
        if (!body.quantity || body.quantity < 1) {
            return res.status(400).json({ error: "Quantity must be at least 1" });
        }
        const item = await (0, db_1.executeQuery)("SELECT * FROM order_items WHERE id = ?", [id]);
        if (item.length === 0) {
            return res.status(404).json({ error: "Order item not found" });
        }
        const quantityDiff = body.quantity - item[0].quantity;
        const connection = await (0, db_1.getConnection)();
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
            return res.json(updatedItem[0]);
        }
        catch (error) {
            await connection.rollback();
            throw error;
        }
    }
    catch (error) {
        console.error("Error updating order item:", error);
        return res.status(500).json({ error: "Failed to update order item" });
    }
});
// Delete an order item
router.delete("/:id", async (req, res) => {
    try {
        const id = req.params.id;
        if (!id) {
            return res.status(400).json({ error: "Order item ID is required" });
        }
        const item = await (0, db_1.executeQuery)("SELECT * FROM order_items WHERE id = ?", [id]);
        if (item.length === 0) {
            return res.status(404).json({ error: "Order item not found" });
        }
        const connection = await (0, db_1.getConnection)();
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
            return res.json({ success: true });
        }
        catch (error) {
            await connection.rollback();
            throw error;
        }
    }
    catch (error) {
        console.error("Error deleting order item:", error);
        return res.status(500).json({ error: "Failed to delete order item" });
    }
});
exports.default = router;
