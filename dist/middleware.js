"use strict";
// import { NextResponse } from "next/server"
// import { jwtVerify } from "jose"
// import type { NextRequest } from "next/server"
// // Define protected routes that require authentication
// const protectedRoutes = ["/api/customers", "/api/orders", "/api/order-items"]
// // Check if a route is protected
// function isProtectedRoute(path: string): boolean {
//     return protectedRoutes.some((route) => path.startsWith(route) && !path.includes("/auth"))
// }
// export async function middleware(request: NextRequest) {
//   const path = request.nextUrl.pathname
//   // Skip middleware for non-protected routes
//   if (!isProtectedRoute(path)) {
//     return NextResponse.next()
//   }
//   // Get the authorization header
//   const authHeader = request.headers.get("authorization")
//   if (!authHeader || !authHeader.startsWith("Bearer ")) {
//     return NextResponse.json({ error: "Authentication required" }, { status: 401 })
//   }
//   // Extract the token
//   const token = authHeader.split(" ")[1]
//   try {
//     // Verify the token
//     const secret = new TextEncoder().encode(process.env.JWT_SECRET || "")
//     await jwtVerify(token, secret)
//     // Token is valid, proceed to the API route
//     return NextResponse.next()
//   } catch (error) {
//     console.error("JWT verification failed:", error)
//     return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 })
//   }
// }
// // Configure which routes the middleware should run on
// export const config = {
//   matcher: ["/api/:path*"],
// }
