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
        const customerId = searchParams.get("customerId");
        if (id) {
            const orders = await (0, db_1.executeQuery)("SELECT * FROM orders WHERE id = ?", [id]);
            if (orders.length === 0) {
                return server_1.NextResponse.json({ error: "Order not found" }, { status: 404 });
            }
            const items = await (0, db_1.executeQuery)("SELECT * FROM order_items WHERE order_id = ?", [id]);
            const order = {
                ...orders[0],
                items,
            };
            return server_1.NextResponse.json(order);
        }
        if (customerId) {
            const orders = await (0, db_1.executeQuery)("SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC", [customerId]);
            const ordersWithItems = await Promise.all(orders.map(async (order) => {
                const items = await (0, db_1.executeQuery)("SELECT * FROM order_items WHERE order_id = ?", [order.id]);
                return {
                    ...order,
                    items,
                };
            }));
            return server_1.NextResponse.json(ordersWithItems);
        }
        const orders = await (0, db_1.executeQuery)("SELECT * FROM orders ORDER BY created_at DESC");
        const ordersWithItems = await Promise.all(orders.map(async (order) => {
            const items = await (0, db_1.executeQuery)("SELECT * FROM order_items WHERE order_id = ?", [order.id]);
            return {
                ...order,
                items,
            };
        }));
        return server_1.NextResponse.json(ordersWithItems);
    }
    catch (error) {
        console.error("Error fetching orders:", error);
        return server_1.NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
    }
}
async function POST(request) {
    try {
        const body = await request.json();
        console.log("Creating order with data:", {
            customer_id: body.customer_id,
            items_count: body.items?.length || 0,
        });
        if (!body.customer_id || !body.items || !body.items.length) {
            console.error("Missing required fields for order creation");
            return server_1.NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }
        const customers = await (0, db_1.executeQuery)("SELECT id FROM customers WHERE id = ?", [body.customer_id]);
        if (customers.length === 0) {
            console.error("Customer not found:", body.customer_id);
            return server_1.NextResponse.json({ error: "Customer not found" }, { status: 404 });
        }
        for (const item of body.items) {
            const products = await (0, db_1.executeQuery)("SELECT id, stock FROM products WHERE id = ?", [
                item.product_id,
            ]);
            if (products.length === 0) {
                console.error("Product not found:", item.product_id);
                return server_1.NextResponse.json({ error: `Product with ID ${item.product_id} not found` }, { status: 404 });
            }
            if (products[0].stock < item.quantity) {
                console.error("Not enough stock for product:", item.product_id);
                return server_1.NextResponse.json({
                    error: `Not enough stock for product ${item.product_name}. Available: ${products[0].stock}`,
                }, { status: 400 });
            }
        }
        const totalPrice = body.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
        console.log("Creating order with total price:", totalPrice);
        const orderResult = await (0, db_1.executeInsert)(`INSERT INTO orders (customer_id, total_price, payment_status, order_status)
        VALUES (?, ?, ?, ?)`, [body.customer_id, totalPrice, "pending", "pending"]);
        const orderId = orderResult.insertId;
        console.log("Order created with ID:", orderId);
        for (const item of body.items) {
            console.log("Adding item to order:", {
                order_id: orderId,
                product_id: item.product_id,
                product_name: item.product_name,
                quantity: item.quantity,
                unit_price: item.unit_price,
            });
            await (0, db_1.executeInsert)(`INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price)
            VALUES (?, ?, ?, ?, ?)`, [orderId, item.product_id, item.product_name, item.quantity, item.unit_price]);
            await (0, db_1.executeQuery)(`UPDATE products SET stock = stock - ? WHERE id = ?`, [
                item.quantity,
                item.product_id,
            ]);
        }
        console.log("Order and items created successfully");
        const order = await (0, db_1.executeQuery)("SELECT * FROM orders WHERE id = ?", [orderId]);
        const items = await (0, db_1.executeQuery)("SELECT * FROM order_items WHERE order_id = ?", [orderId]);
        return server_1.NextResponse.json({
            ...order[0],
            items,
        }, { status: 201 });
    }
    catch (error) {
        console.error("Error creating order:", error);
        return server_1.NextResponse.json({
            error: "Failed to create order: " + (error instanceof Error ? error.message : String(error)),
        }, { status: 500 });
    }
}
async function PUT(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        if (!id) {
            return server_1.NextResponse.json({ error: "Order ID is required" }, { status: 400 });
        }
        const body = await request.json();
        const order = await (0, db_1.executeQuery)("SELECT * FROM orders WHERE id = ?", [id]);
        if (order.length === 0) {
            return server_1.NextResponse.json({ error: "Order not found" }, { status: 404 });
        }
        let query = "UPDATE orders SET ";
        const updates = [];
        const params = [];
        if (body.payment_status) {
            updates.push("payment_status = ?");
            params.push(body.payment_status);
        }
        if (body.order_status) {
            updates.push("order_status = ?");
            params.push(body.order_status);
        }
        if (body.payment_id) {
            updates.push("payment_id = ?");
            params.push(body.payment_id);
        }
        if (updates.length === 0) {
            return server_1.NextResponse.json({ error: "No fields to update" }, { status: 400 });
        }
        query += updates.join(", ") + " WHERE id = ?";
        params.push(id);
        await (0, db_1.executeQuery)(query, params);
        const updatedOrder = await (0, db_1.executeQuery)("SELECT * FROM orders WHERE id = ?", [id]);
        const items = await (0, db_1.executeQuery)("SELECT * FROM order_items WHERE order_id = ?", [id]);
        return server_1.NextResponse.json({
            ...updatedOrder[0],
            items,
        });
    }
    catch (error) {
        console.error("Error updating order:", error);
        return server_1.NextResponse.json({ error: "Failed to update order" }, { status: 500 });
    }
}
async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        if (!id) {
            return server_1.NextResponse.json({ error: "Order ID is required" }, { status: 400 });
        }
        const order = await (0, db_1.executeQuery)("SELECT * FROM orders WHERE id = ?", [id]);
        if (order.length === 0) {
            return server_1.NextResponse.json({ error: "Order not found" }, { status: 404 });
        }
        const items = await (0, db_1.executeQuery)("SELECT * FROM order_items WHERE order_id = ?", [id]);
        for (const item of items) {
            await (0, db_1.executeQuery)(`UPDATE products SET stock = stock + ? WHERE id = ?`, [
                item.quantity,
                item.product_id,
            ]);
        }
        await (0, db_1.executeQuery)("DELETE FROM order_items WHERE order_id = ?", [id]);
        await (0, db_1.executeQuery)("DELETE FROM orders WHERE id = ?", [id]);
        return server_1.NextResponse.json({ success: true });
    }
    catch (error) {
        console.error("Error deleting order:", error);
        return server_1.NextResponse.json({ error: "Failed to delete order" }, { status: 500 });
    }
}
