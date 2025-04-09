"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJWTPayload = getJWTPayload;
exports.getJWTPayloadFromCookies = getJWTPayloadFromCookies;
const jose_1 = require("jose");
const headers_1 = require("next/headers");
async function getJWTPayload(request) {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return null;
    }
    const token = authHeader.split(" ")[1];
    try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
        const { payload } = await (0, jose_1.jwtVerify)(token, secret);
        return payload;
    }
    catch (error) {
        console.error("JWT verification failed:", error);
        return null;
    }
}
async function getJWTPayloadFromCookies() {
    const token = (await (0, headers_1.cookies)()).get("token")?.value;
    if (!token) {
        return null;
    }
    try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
        const { payload } = await (0, jose_1.jwtVerify)(token, secret);
        return payload;
    }
    catch (error) {
        console.error("JWT verification from cookies failed:", error);
        return null;
    }
}
