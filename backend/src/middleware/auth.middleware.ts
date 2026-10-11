import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { prisma } from '../config/db.js';

export interface AuthenticatedUser {
  id: string;
  userId: string;
  username: string;
  email: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

interface JwtPayload {
  id: string;
  username: string;
  email: string;
}

let cachedDefaultUser: AuthenticatedUser | null = null;

export async function getDefaultUser(): Promise<AuthenticatedUser> {
  if (cachedDefaultUser) return cachedDefaultUser;

  try {
    let user = await prisma.user.findFirst({
      where: { username: 'admin' },
    });

    if (!user) {
      user = await prisma.user.findFirst();
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          username: 'admin',
          email: 'admin@browseros.local',
          passwordHash: 'nopassword',
          preferences: {
            create: {
              theme: 'dark',
              wallpaper: 'nebula',
              fontSize: 14,
            },
          },
        },
      });
    }

    cachedDefaultUser = {
      id: user.id,
      userId: user.id,
      username: user.username,
      email: user.email,
    };
    return cachedDefaultUser;
  } catch {
    return {
      id: 'default-admin-id',
      userId: 'default-admin-id',
      username: 'admin',
      email: 'admin@browseros.local',
    };
  }
}

export async function requireAuth(req: AuthRequest, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, ENV.JWT_SECRET) as JwtPayload;
      req.user = {
        id: decoded.id,
        userId: decoded.id,
        username: decoded.username,
        email: decoded.email,
      };
      return next();
    } catch {
      // Fall through to default user if token expired or invalid
    }
  }

  // Seamless non-authenticated access: automatically attach system user
  try {
    req.user = await getDefaultUser();
    next();
  } catch (err) {
    next(err);
  }
}

export const authenticate = requireAuth;
