import type { Request, Response, NextFunction } from "express"

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number
    email: string
    name: string
  }
}

export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" })
  }

  const token = authHeader.split(" ")[1]

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "")
    
    
    const { jwtVerify } = await import('jose')
    
    const { payload } = await jwtVerify(token, secret)

    req.user = {
      id: payload.id as number,
      email: payload.email as string,
      name: payload.name as string,
    }

    next()
  } catch (error) {
    console.error("JWT verification failed:", error)
    return res.status(401).json({ error: "Invalid or expired token" })
  }
}