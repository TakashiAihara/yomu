import { eq } from 'drizzle-orm';

import { getDatabase } from '../../shared/db/client.js';
import { type NewUser, type User, users } from '../../shared/db/schema.js';
import { getLogger } from '../../shared/logging/logger.js';
import type { CreateUserInput, UserEntity } from '../domain/user.js';

export function toUserEntity(dbUser: User): UserEntity {
  return {
    id: dbUser.id,
    googleId: dbUser.googleId,
    email: dbUser.email,
    displayName: dbUser.displayName,
    profilePicture: dbUser.profilePicture,
    createdAt: dbUser.createdAt,
    lastSignInAt: dbUser.lastSignInAt,
  };
}

export async function findUserByGoogleId(googleId: string): Promise<UserEntity | null> {
  const db = getDatabase();
  const logger = getLogger();

  try {
    const result = await db.select().from(users).where(eq(users.googleId, googleId)).limit(1);

    if (result.length === 0) {
      return null;
    }

    const user = result[0];
    return user ? toUserEntity(user) : null;
  } catch (error) {
    logger.error('Failed to find user by Google ID', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

export async function findUserById(userId: string): Promise<UserEntity | null> {
  const db = getDatabase();
  const logger = getLogger();

  try {
    const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (result.length === 0) {
      return null;
    }

    const user = result[0];
    return user ? toUserEntity(user) : null;
  } catch (error) {
    logger.error('Failed to find user by ID', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

export async function createUser(input: CreateUserInput): Promise<UserEntity> {
  const db = getDatabase();
  const logger = getLogger();

  const newUser: NewUser = {
    googleId: input.googleId,
    email: input.email,
    displayName: input.displayName ?? null,
    profilePicture: input.profilePicture ?? null,
  };

  try {
    const result = await db.insert(users).values(newUser).returning();
    const user = result[0];

    if (!user) {
      throw new Error('Failed to create user: no result returned');
    }

    logger.info('User created', { userId: user.id });
    return toUserEntity(user);
  } catch (error) {
    logger.error('Failed to create user', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

export async function updateLastSignIn(userId: string): Promise<void> {
  const db = getDatabase();
  const logger = getLogger();

  try {
    await db.update(users).set({ lastSignInAt: new Date() }).where(eq(users.id, userId));

    logger.debug('Updated last sign-in time', { userId });
  } catch (error) {
    logger.error('Failed to update last sign-in time', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<UserEntity, 'displayName' | 'profilePicture'>>
): Promise<UserEntity | null> {
  const db = getDatabase();
  const logger = getLogger();

  try {
    const result = await db.update(users).set(updates).where(eq(users.id, userId)).returning();

    const user = result[0];
    return user ? toUserEntity(user) : null;
  } catch (error) {
    logger.error('Failed to update user profile', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
