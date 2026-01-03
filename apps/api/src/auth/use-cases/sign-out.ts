import { anonymizeUserId, getLogger, hashForLogging } from '../../shared/logging/logger.js';
import { deleteAllUserSessions, deleteSession } from '../infrastructure/session-store.js';

export interface SignOutInput {
  userId: string;
  sessionId: string;
  allSessions: boolean;
}

export interface SignOutOutput {
  terminatedSessions: number;
}

export async function signOut(input: SignOutInput): Promise<SignOutOutput> {
  const logger = getLogger();

  logger.info('Processing sign-out request', {
    userId: anonymizeUserId(input.userId),
    allSessions: input.allSessions,
  });

  let terminatedSessions: number;

  if (input.allSessions) {
    terminatedSessions = await deleteAllUserSessions(input.userId);

    logger.info('All sessions terminated', {
      userId: anonymizeUserId(input.userId),
      terminatedSessions,
    });
  } else {
    await deleteSession(input.sessionId);
    terminatedSessions = 1;

    logger.info('Single session terminated', {
      userId: anonymizeUserId(input.userId),
      sessionIdHash: hashForLogging(input.sessionId),
    });
  }

  return { terminatedSessions };
}
