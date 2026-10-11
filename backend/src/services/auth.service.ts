import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';
import { ENV } from '../config/env.js';
import { AppError } from '../middleware/error.middleware.js';

export interface RegisterDTO {
  username: string;
  email: string;
  password: string;
}

export interface LoginDTO {
  login: string; // username or email
  password: string;
}

export class AuthService {
  async register(dto: RegisterDTO) {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email.toLowerCase() }, { username: dto.username.toLowerCase() }],
      },
    });

    if (existing) {
      if (existing.email === dto.email.toLowerCase()) {
        throw new AppError('Email is already registered', 409);
      }
      throw new AppError('Username is already taken', 409);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const user = await prisma.user.create({
      data: {
        username: dto.username.trim(),
        email: dto.email.toLowerCase().trim(),
        passwordHash,
        preferences: {
          create: {},
        },
      },
      include: {
        preferences: true,
      },
    });

    const token = this.generateToken(user.id, user.username, user.email);

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        preferences: user.preferences,
      },
    };
  }

  async login(dto: LoginDTO) {
    const normalized = dto.login.toLowerCase().trim();
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: normalized }, { username: normalized }],
      },
      include: {
        preferences: true,
      },
    });

    if (!user) {
      throw new AppError('Invalid username/email or password', 401);
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid username/email or password', 401);
    }

    const token = this.generateToken(user.id, user.username, user.email);

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        preferences: user.preferences,
      },
    };
  }

  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        preferences: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
      preferences: user.preferences,
    };
  }

  private generateToken(id: string, username: string, email: string): string {
    return jwt.sign({ id, username, email }, ENV.JWT_SECRET, {
      expiresIn: '7d',
    });
  }
}

export const authService = new AuthService();
