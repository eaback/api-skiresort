import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import { executeQuery } from "./src/lib/db"
import authRoutes from "./src/routes/auth"
import customerRoutes from "./src/routes/customers"
import productRoutes from "./src/routes/products"
import orderRoutes from "./src/routes/orders"
import orderItemRoutes from "./src/routes/order-items"
import stripeRoutes from "./src/routes/stripe"

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT

// Middleware
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production" ? [process.env.NEXT_PUBLIC_BASE_URL || ""] : ["http://localhost:3000"],
    credentials: true,
  }),
)
app.use(express.json())

// Test database connection on startup
;(async () => {
  try {
    await executeQuery("SELECT 1")
    console.log("Database connection successful")
  } catch (error) {
    console.error("Database connection failed:", error)
    process.exit(1)
  }
})()

// Routes
app.use("/auth", authRoutes)
app.use("/customers", customerRoutes)
app.use("/products", productRoutes)
app.use("/orders", orderRoutes)
app.use("/order-items", orderItemRoutes)
app.use("/stripe", stripeRoutes)

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" })
})

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

export default app
