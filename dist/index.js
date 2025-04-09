"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./lib/db");
const auth_1 = __importDefault(require("./routes/auth"));
const customers_1 = __importDefault(require("./routes/customers"));
const products_1 = __importDefault(require("./routes/products"));
const orders_1 = __importDefault(require("./routes/orders"));
const order_items_1 = __importDefault(require("./routes/order-items"));
const stripe_1 = __importDefault(require("./routes/stripe"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT;
// Middleware
app.use((0, cors_1.default)({
    origin: process.env.NODE_ENV === "production" ? [process.env.NEXT_PUBLIC_BASE_URL || ""] : ["http://localhost:3000"],
    credentials: true,
}));
app.use(express_1.default.json());
(async () => {
    try {
        await (0, db_1.executeQuery)("SELECT 1");
        console.log("Database connection successful");
    }
    catch (error) {
        console.error("Database connection failed:", error);
        process.exit(1);
    }
})();
// Routes
app.use("/auth", auth_1.default);
app.use("/customers", customers_1.default);
app.use("/products", products_1.default);
app.use("/orders", orders_1.default);
app.use("/order-items", order_items_1.default);
app.use("/stripe", stripe_1.default);
// Health check endpoint
app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});
// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
exports.default = app;
