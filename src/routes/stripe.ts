import express from "express"
import { executeQuery } from "../lib/db"
import type { Order, Customer, OrderItem } from "../lib/db-types"
import { authenticateToken, type AuthenticatedRequest } from "../middleware/auth"

const router = express.Router()

// Initialize Stripe only when needed
function getStripe() {
  const Stripe = require('stripe')
  return new Stripe(process.env.STRIPE_SECRET_KEY || "", {
    apiVersion: "2025-03-31.basil",
  })
}

// Create checkout session
router.post("/", authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const stripe = getStripe()
    const body = req.body
    const { orderId, lineItems } = body

    if (!orderId || !lineItems || lineItems.length === 0) {
      return res.status(400).json({ error: "Missing required fields" })
    }

    const orders = await executeQuery<Order[]>("SELECT * FROM orders WHERE id = ?", [orderId])

    if (orders.length === 0) {
      return res.status(404).json({ error: "Order not found" })
    }

    const order = orders[0]

    const customers = await executeQuery<Customer[]>("SELECT * FROM customers WHERE id = ?", [order.customer_id])

    if (customers.length === 0) {
      return res.status(404).json({ error: "Customer not found" })
    }

    const customer = customers[0]

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
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/butik/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/butik/cart`,
      customer_email: customer.email,
      metadata: {
        order_id: orderId,
      },
    })

    await executeQuery("UPDATE orders SET payment_id = ? WHERE id = ?", [session.id, orderId])

    return res.json({
      checkout_url: session.url,
      session_id: session.id,
    })
  } catch (error) {
    console.error("Error creating Stripe checkout session:", error)
    return res.status(500).json({ error: "Failed to create checkout session" })
  }
})

// Webhook handler
router.post("/webhook", async (req, res) => {
  try {
    const stripe = getStripe()
    const payload = req.body
    const sig = req.headers["stripe-signature"] as string
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

    let event

    try {
      event = stripe.webhooks.constructEvent(payload, sig, endpointSecret || "")
      console.log("Webhook received:", event.type)
    } catch (err: any) {
      console.error(`Webhook Error: ${err.message}`)
      return res.status(400).json({ error: `Webhook Error: ${err.message}` })
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any // Using any instead of Stripe.Checkout.Session

      const orderId = session.metadata?.order_id
      console.log("Processing completed checkout for order:", orderId)

      if (orderId) {
        try {
          await executeQuery("UPDATE orders SET payment_status = ?, order_status = ? WHERE payment_id = ?", [
            "paid", // Use lowercase string value
            "received", // Use lowercase string value
            session.id,
          ])

          console.log(`Order ${orderId} updated to Paid/Received status`)

          const orderItems = await executeQuery<OrderItem[]>("SELECT * FROM order_items WHERE order_id = ?", [orderId])

          for (const item of orderItems) {
            await executeQuery("UPDATE products SET stock = stock - ? WHERE id = ?", [item.quantity, item.product_id])
            console.log(`Updated stock for product ${item.product_id}, reduced by ${item.quantity}`)
          }

          console.log(`Stock updated for all items in order ${orderId}`)
        } catch (error) {
          console.error("Error processing webhook:", error)
        }
      }
    }

    return res.json({ received: true })
  } catch (error) {
    console.error("Error in webhook handler:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
})

export default router