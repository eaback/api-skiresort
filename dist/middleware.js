"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.middleware = middleware;
const server_1 = require("next/server");
const jose_1 = require("jose");
// Define protected routes that require authentication
const protectedRoutes = ["/api/customers", "/api/orders", "/api/order-items"];
// Check if a route is protected
function isProtectedRoute(path) {
    return protectedRoutes.some((route) => path.startsWith(route) && !path.includes("/auth"));
}
async function middleware(request) {
    const path = request.nextUrl.pathname;
    // Skip middleware for non-protected routes
    if (!isProtectedRoute(path)) {
        return server_1.NextResponse.next();
    }
    // Get the authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return server_1.NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    // Extract the token
    const token = authHeader.split(" ")[1];
    try {
        // Verify the token
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
        await (0, jose_1.jwtVerify)(token, secret);
        // Token is valid, proceed to the API route
        return server_1.NextResponse.next();
    }
    catch (error) {
        console.error("JWT verification failed:", error);
        return server_1.NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }
}
// Configure which routes the middleware should run on
exports.config = {
    matcher: ["/api/:path*"],
};
