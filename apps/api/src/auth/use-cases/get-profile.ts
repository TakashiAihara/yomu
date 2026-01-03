import { anonymizeUserId, getLogger } from '../../shared/logging/logger.js';
import { toSessionResponse } from '../domain/session.js';
import { toUserResponse } from '../domain/user.js';
import { getUserSessions } from '../infrastructure/session-store.js';
import { findUserById } from '../infrastructure/user-repo.js';

export interface GetProfileInput {
  userId: string;
  currentSessionId: string;
}

export interface GetProfileOutput {
  user: ReturnType<typeof toUserResponse>;
  sessions: ReturnType<typeof toSessionResponse>[];
}

export async function getProfile(input: GetProfileInput): Promise<GetProfileOutput> {
  const logger = getLogger();

  logger.debug('Fetching user profile', {
    userId: anonymizeUserId(input.userId),
  });

  const user = await findUserById(input.userId);

  if (!user) {
    throw new Error('User not found');
  }

  const sessions = await getUserSessions(input.userId);

  const sessionResponses = sessions.map((session) =>
    toSessionResponse(session, session.id === input.currentSessionId)
  );

  logger.debug('Profile fetched', {
    userId: anonymizeUserId(input.userId),
    sessionCount: sessions.length,
  });

  return {
    user: toUserResponse(user),
    sessions: sessionResponses,
  };
}
