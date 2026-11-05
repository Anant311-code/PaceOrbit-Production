
import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import type { AuthRequest } from "../middleware/auth.middleware.js";

const registerSchema = z.object({
  name: z.string().trim().min(2).max(40),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(72),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(72),
});


const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(40).optional(),
  location: z.string().trim().max(100).nullable().optional(),
  bio: z.string().trim().max(250).nullable().optional(),
  photoUrl: z.string().max(8_000_000).nullable().optional(),
});


function createToken(userId: string) {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured.");
  }

  return jwt.sign({ userId }, secret, {
    expiresIn: "7d",
  });
}

export async function register(req: Request, res: Response) {
  try {
    const parsed = registerSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Please check your registration details.",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const name = parsed.data.name;
    const email = parsed.data.email.toLowerCase();
    const password = parsed.data.password;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        location: true,
        bio: true,
        photoUrl: true,
        createdAt: true,
      },
    });

    const token = createToken(user.id);

    res.status(201).json({
      success: true,
      message: "Account created successfully.",
      token,
      user,
    });
  } catch (error) {
    console.error("Registration error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to create account.",
    });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Please enter a valid email and password.",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const email = parsed.data.email.toLowerCase();
    const password = parsed.data.password;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
      return;
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordMatches) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
      return;
    }

    const token = createToken(user.id);

    const { passwordHash: _passwordHash, ...safeUser } = user;

    res.json({
      success: true,
      message: "Login successful.",
      token,
      user: safeUser,
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to login.",
    });
  }
}

export async function getMe(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        name: true,
        email: true,
        location: true,
        bio: true,
        photoUrl: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found.",
      });
      return;
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Profile fetch error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch profile.",
    });
  }
}

export async function updateProfile(
  req: AuthRequest,
  res: Response
) {
  try {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const parsed = updateProfileSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Invalid profile details.",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    if (Object.keys(parsed.data).length === 0) {
      res.status(400).json({
        success: false,
        message: "Please provide at least one field to update.",
      });
      return;
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: parsed.data,
      select: {
        id: true,
        name: true,
        email: true,
        location: true,
        bio: true,
        photoUrl: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      message: "Profile updated successfully.",
      user,
    });
  } catch (error) {
    console.error("Profile update error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to update profile.",
    });
  }
}

