import { Request, Response, NextFunction } from 'express';
import { jwtVerify } from 'jose';

interface AuthRequest extends Request {
    user?: any;
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
        }
        
        const token = authHeader.split(' ')[1];
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key-change-this-in-production');
        
        const { payload } = await jwtVerify(token, secret);
        
        req.user = payload;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};