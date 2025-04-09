"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const db_1 = require("../../lib/db");
const stripe_1 = __importDefault(require("stripe"));
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || "", {
    apiVersion: "2025-03-31.basil",
});
async function POST(request) {
    try {
        const body = await request.json();
        const { orderId, lineItems } = body;
        if (!orderId || !lineItems || lineItems.length === 0) {
            return server_1.NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }
        const orders = await (0, db_1.executeQuery)("SELECT * FROM orders WHERE id = ?", [orderId]);
        if (orders.length === 0) {
            return server_1.NextResponse.json({ error: "Order not found" }, { status: 404 });
        }
        const order = orders[0];
        const customers = await (0, db_1.executeQuery)("SELECT * FROM customers WHERE id = ?", [order.customer_id]);
        if (customers.length === 0) {
            return server_1.NextResponse.json({ error: "Customer not found" }, { status: 404 });
        }
        const customer = customers[0];
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: lineItems.map((item) => ({
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
        });
        await (0, db_1.executeQuery)("UPDATE orders SET payment_id = ? WHERE id = ?", [session.id, orderId]);
        return server_1.NextResponse.json({
            checkout_url: session.url,
            session_id: session.id,
        });
    }
    catch (error) {
        console.error("Error creating Stripe checkout session:", error);
        return server_1.NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
    }
}
