import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import ConfigManager from '../config/Config';
import Logger from '../utils/Logger';

export interface JWTPayload {
    userId: string;
    email?: string;
    phoneNumber?: string;
}

export interface AuthRequest extends Request {
    user?: {
        userId: ObjectId;
        email?: string;
        phoneNumber?: string;
    };
}

export class AuthMiddleware {
    /**
     * Generate a JWT token
     */
    public static generateToken(payload: JWTPayload): string {
        const config = ConfigManager.get();
        return jwt.sign(payload, config.jwtSecret, {
            expiresIn: config.jwtExpiresIn,
        });
    }

    /**
     * Verify a JWT token
     */
    public static verifyToken(token: string): JWTPayload {
        const config = ConfigManager.get();
        return jwt.verify(token, config.jwtSecret) as JWTPayload;
    }

    /**
     * Middleware to authenticate requests
     */
    public static authenticate = (
        req: AuthRequest,
        res: Response,
        next: NextFunction
    ): void => {
        try {
            // Get token from Authorization header
            const authHeader = req.headers.authorization;

            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                res.status(401).json({ error: 'No token provided' });
                return;
            }

            const token = authHeader.substring(7); // Remove 'Bearer ' prefix

            // Verify token
            const payload = AuthMiddleware.verifyToken(token);

            // Attach user to request
            req.user = {
                userId: new ObjectId(payload.userId),
                email: payload.email,
                phoneNumber: payload.phoneNumber,
            };

            next();
        } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                Logger.warn('Expired token');
                res.status(401).json({ error: 'Token expired' });
                return;
            }

            if (error instanceof jwt.JsonWebTokenError) {
                Logger.warn('Invalid token');
                res.status(401).json({ error: 'Invalid token' });
                return;
            }

            Logger.error('Authentication error:', error);
            res.status(500).json({ error: 'Authentication failed' });
        }
    };

    /**
     * Optional authentication middleware (doesn't fail if no token)
     */
    public static optionalAuthenticate = (
        req: AuthRequest,
        res: Response,
        next: NextFunction
    ): void => {
        try {
            const authHeader = req.headers.authorization;

            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                next();
                return;
            }

            const token = authHeader.substring(7);
            const payload = AuthMiddleware.verifyToken(token);

            req.user = {
                userId: new ObjectId(payload.userId),
                email: payload.email,
                phoneNumber: payload.phoneNumber,
            };

            next();
        } catch (error) {
            // Silently fail for optional auth
            next();
        }
    };
}
