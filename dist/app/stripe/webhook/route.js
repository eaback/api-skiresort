"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const db_1 = require("../../../lib/db");
const stripe_1 = __importDefault(require("stripe"));
const headers_1 = require("next/headers");
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || "", {
    apiVersion: "2025-03-31.basil",
});
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
async function POST(request) {
    const body = await request.text();
    const headersList = await (0, headers_1.headers)();
    const sig = headersList.get("stripe-signature") || "";
    let event;
    try {
        event = stripe.webhooks.constructEvent(body, sig, endpointSecret || "");
        console.log("Webhook received:", event.type);
    }
    catch (err) {
        console.error(`Webhook Error: ${err.message}`);
        return server_1.NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }
    if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const orderId = session.metadata?.order_id;
        console.log("Processing completed checkout for order:", orderId);
        if (orderId) {
            try {
                await (0, db_1.executeQuery)("UPDATE orders SET payment_status = ?, order_status = ? WHERE payment_id = ?", [
                    "paid", // Use lowercase string value
                    "received", // Use lowercase string value
                    session.id,
                ]);
                console.log(`Order ${orderId} updated to Paid/Received status`);
                const orderItems = await (0, db_1.executeQuery)("SELECT * FROM order_items WHERE order_id = ?", [orderId]);
                for (const item of orderItems) {
                    await (0, db_1.executeQuery)("UPDATE products SET stock = stock - ? WHERE id = ?", [item.quantity, item.product_id]);
                    console.log(`Updated stock for product ${item.product_id}, reduced by ${item.quantity}`);
                }
                console.log(`Stock updated for all items in order ${orderId}`);
            }
            catch (error) {
                console.error("Error processing webhook:", error);
            }
        }
    }
    return server_1.NextResponse.json({ received: true });
}
