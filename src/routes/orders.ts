import express from 'express';
import { db } from '../db';
import { authMiddleware } from '../middleware/auth';
import type { Order, OrderItem } from '../db/types';

const router = express.Router();

// Get all orders (protected)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const orders = await db.query<Order[]>("SELECT * FROM orders ORDER BY created_at DESC");

    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await db.query<OrderItem[]>("SELECT * FROM order_items WHERE order_id = ?", [order.id]);

        return {
          ...order,
          items,
        };
      })
    );

    res.json(ordersWithItems);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// Get orders by customer ID (protected)
router.get('/customer/:customerId', authMiddleware, async (req, res) => {
  try {
    const { customerId } = req.params;

    const orders = await db.query<Order[]>(
      "SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC",
      [customerId]
    );

    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await db.query<OrderItem[]>("SELECT * FROM order_items WHERE order_id = ?", [order.id]);

        return {
          ...order,
          items,
        };
      })
    );

    res.json(ordersWithItems);
  } catch (error) {
    console.error("Error fetching customer orders:", error);
    res.status(500).json({ error: "Failed to fetch customer orders" });
  }
});

// Get order by ID (protected)
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const orders = await db.query<Order[]>("SELECT * FROM orders WHERE id = ?", [id]);

    if (orders.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const items = await db.query<OrderItem[]>("SELECT * FROM order_items WHERE order_id = ?", [id]);

    const order = {
      ...orders[0],
      items,
    };

    res.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

// Create order
router.post('/', async (req, res) => {
  try {
    const { customer_id, items } = req.body;

    if (!customer_id || !items || !items.length) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if customer exists
    const customers = await db.query<any[]>("SELECT id FROM customers WHERE id = ?", [customer_id]);
    
    if (customers.length === 0) {
      return res.status(404).json({ error: "Customer not found" });
    }

    // Check product stock
    for (const item of items) {
      const products = await db.query<any[]>("SELECT id, stock FROM products WHERE id = ?", [item.product_id]);

      if (products.length === 0) {
        return res.status(404).json({ error: `Product with ID ${item.product_id} not found` });
      }

      if (products[0].stock < item.quantity) {
        return res.status(400).json({
          error: `Not enough stock for product ${item.product_name}. Available: ${products[0].stock}`,
        });
      }
    }

    // Calculate total price
    const totalPrice = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

    // Create order
    const orderResult = await db.executeInsert(
      `INSERT INTO orders (customer_id, total_price, payment_status, order_status)
       VALUES (?, ?, ?, ?)`,
      [customer_id, totalPrice, "pending", "pending"]
    );

    const orderId = orderResult.insertId;

    // Create order items and update stock
    for (const item of items) {
      await db.executeInsert(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, item.product_id, item.product_name, item.quantity, item.unit_price]
      );

      await db.query(
        "UPDATE products SET stock = stock - ? WHERE id = ?",
        [item.quantity, item.product_id]
      );
    }

    // Get the created order with items
    const order = await db.query<Order[]>("SELECT * FROM orders WHERE id = ?", [orderId]);
    const orderItems = await db.query<OrderItem[]>("SELECT * FROM order_items WHERE order_id = ?", [orderId]);

    res.status(201).json({
      ...order[0],
      items: orderItems,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ error: "Failed to create order" });
  }
});

// Update order (protected)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_status, order_status, payment_id } = req.body;

    const order = await db.query<Order[]>("SELECT * FROM orders WHERE id = ?", [id]);

    if (order.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    let query = "UPDATE orders SET ";
    const updates: string[] = [];
    const params: any[] = [];

    if (payment_status) {
      updates.push("payment_status = ?");
      params.push(payment_status);
    }

    if (order_status) {
      updates.push("order_status = ?");
      params.push(order_status);
    }

    if (payment_id) {
      updates.push("payment_id = ?");
      params.push(payment_id);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    query += updates.join(", ") + " WHERE id = ?";
    params.push(id);

    await db.query(query, params);

    const updatedOrder = await db.query<Order[]>("SELECT * FROM orders WHERE id = ?", [id]);
    const items = await db.query<OrderItem[]>("SELECT * FROM order_items WHERE order_id = ?", [id]);

    res.json({
      ...updatedOrder[0],
      items,
    });
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({ error: "Failed to update order" });
  }
});

// Delete order (protected)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const order = await db.query<Order[]>("SELECT * FROM orders WHERE id = ?", [id]);

    if (order.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const items = await db.query<OrderItem[]>("SELECT * FROM order_items WHERE order_id = ?", [id]);

    // Return stock to products
    for (const item of items) {
      await db.query(
        "UPDATE products SET stock = stock + ? WHERE id = ?",
        [item.quantity, item.product_id]
      );
    }

    // Delete order items
    await db.query("DELETE FROM order_items WHERE order_id = ?", [id]);

    // Delete order
    await db.query("DELETE FROM orders WHERE id = ?", [id]);

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting order:", error);
    res.status(500).json({ error: "Failed to delete order" });
  }
});

export default router;