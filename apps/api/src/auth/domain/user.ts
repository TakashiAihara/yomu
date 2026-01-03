import { z } from 'zod';

export const userIdSchema = z.string().uuid();

export const googleUserInfoSchema = z.object({
  sub: z.string().min(1),
  email: z.string().email(),
  email_verified: z.boolean().optional(),
  name: z.string().optional(),
  picture: z.string().url().optional(),
});

export type GoogleUserInfo = z.infer<typeof googleUserInfoSchema>;

export interface UserEntity {
  id: string;
  googleId: string;
  email: string;
  displayName: string | null;
  profilePicture: string | null;
  createdAt: Date;
  lastSignInAt: Date;
}

export interface CreateUserInput {
  googleId: string;
  email: string;
  displayName?: string | null;
  profilePicture?: string | null;
}

export function createUserFromGoogleInfo(googleInfo: GoogleUserInfo): CreateUserInput {
  return {
    googleId: googleInfo.sub,
    email: googleInfo.email,
    displayName: googleInfo.name ?? null,
    profilePicture: googleInfo.picture ?? null,
  };
}

export function validateUserEmail(email: string): boolean {
  const result = z.string().email().safeParse(email);
  return result.success;
}

export function validateGoogleId(googleId: string): boolean {
  return googleId.length > 0 && googleId.length <= 255;
}

export function isUserComplete(user: UserEntity): boolean {
  return Boolean(user.id && user.googleId && user.email);
}

export function toUserResponse(user: UserEntity) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    profilePicture: user.profilePicture,
    createdAt: user.createdAt.toISOString(),
    lastSignInAt: user.lastSignInAt.toISOString(),
  };
}
