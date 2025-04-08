import express from 'express';
import Stripe from 'stripe';
import { db } from '../db';
import { authMiddleware } from '../middleware/auth';
import type { Order, Customer } from '../db/types';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia",
});

// Create checkout session
router.post('/checkout', async (req, res) => {
  try {
    const { orderId, lineItems } = req.body;

    if (!orderId || !lineItems || lineItems.length === 0) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const orders = await db.query<Order[]>("SELECT * FROM orders WHERE id = ?", [orderId]);

    if (orders.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const order = orders[0];

    const customers = await db.query<Customer[]>("SELECT * FROM customers WHERE id = ?", [order.customer_id]);

    if (customers.length === 0) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const customer = customers[0];

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems.map((item: any) => ({
        price_data: {
          currency: "sek",
          product_data: {
            name: item.name,
            description: item.description || "",
            images: item.image ? [item.image] : [],
          },
          unit_amount: item.price * 100,
        },
        quantity: item.quantity,
      })),
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/butik/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/butik/cart`,
      customer_email: customer.email,
      metadata: {
        order_id: orderId,
      },
    });

    await db.query("UPDATE orders SET payment_id = ? WHERE id = ?", [session.id, orderId]);

    res.json({
      checkout_url: session.url,
      session_id: session.id,
    });
  } catch (error) {
    console.error("Error creating Stripe checkout session:", error);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

// Webhook handler
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body, 
      sig, 
      endpointSecret || ""
    );
    
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.order_id;
      
      if (orderId) {
        await db.query(
          "UPDATE orders SET payment_status = ?, order_status = ? WHERE payment_id = ?", 
          ["completed", "processing", session.id]
        );
        
        // Update product stock
        const items = await db.query<any[]>("SELECT * FROM order_items WHERE order_id = ?", [orderId]);
        
        for (const item of items) {
          await db.query(
            "UPDATE products SET stock = stock - ? WHERE id = ?",
            [item.quantity, item.product_id]
          );
        }
      }
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook Error:', error);
    return res.status(400).json({ error: `Webhook Error: ${error.message}` });
  }
});

export default router;