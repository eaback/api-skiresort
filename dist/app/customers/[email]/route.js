"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const db_1 = require("../../../lib/db");
async function GET(request, { params }) {
    try {
        const email = decodeURIComponent(params.email);
        const customers = await (0, db_1.executeQuery)("SELECT * FROM customers WHERE email = ?", [email]);
        if (customers.length === 0) {
            return server_1.NextResponse.json({ error: "Customer not found" }, { status: 404 });
        }
        const customerData = { ...customers[0] };
        delete customerData.password;
        return server_1.NextResponse.json(customerData);
    }
    catch (error) {
        console.error("Error fetching customer by email:", error);
        return server_1.NextResponse.json({ error: "Failed to fetch customer" }, { status: 500 });
    }
}
