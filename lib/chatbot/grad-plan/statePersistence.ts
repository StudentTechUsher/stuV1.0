/**
 * State persistence utilities for chatbot conversations
 * Handles saving and loading conversation state from localStorage and database
 */

import { ConversationState, ConversationMetadata } from './types';

const STORAGE_KEY_PREFIX = 'grad_plan_chatbot_';
const METADATA_INDEX_KEY = 'grad_plan_conversations';

const readConversationIndex = (): ConversationMetadata[] => {
  try {
    const serialized = localStorage.getItem(METADATA_INDEX_KEY);
    if (!serialized) return [];
    const parsed = JSON.parse(serialized);
    if (!Array.isArray(parsed)) return [];
    return parsed as ConversationMetadata[];
  } catch (error) {
    console.error('Failed to read conversation metadata index:', error);
    return [];
  }
};

const writeConversationIndex = (items: ConversationMetadata[]): void => {
  try {
    localStorage.setItem(METADATA_INDEX_KEY, JSON.stringify(items));
  } catch (error) {
    console.error('Failed to write conversation metadata index:', error);
  }
};

/**
 * Save conversation state to localStorage
 * Used for temporary persistence during session
 */
export function saveStateToLocalStorage(state: ConversationState): void {
  try {
    const key = `${STORAGE_KEY_PREFIX}${state.conversationId}`;
    const serialized = JSON.stringify(state);
    localStorage.setItem(key, serialized);
  } catch (error) {
    console.error('Failed to save conversation state to localStorage:', error);
  }
}

/**
 * Load conversation state from localStorage
 */
export function loadStateFromLocalStorage(conversationId: string): ConversationState | null {
  try {
    const key = `${STORAGE_KEY_PREFIX}${conversationId}`;
    const serialized = localStorage.getItem(key);

    if (!serialized) {
      return null;
    }

    const parsed = JSON.parse(serialized);

    // Convert date strings back to Date objects
    return {
      ...parsed,
      createdAt: new Date(parsed.createdAt),
      updatedAt: new Date(parsed.updatedAt),
    };
  } catch (error) {
    console.error('Failed to load conversation state from localStorage:', error);
    return null;
  }
}

/**
 * Clear conversation state from localStorage
 */
export function clearStateFromLocalStorage(conversationId: string): void {
  try {
    const key = `${STORAGE_KEY_PREFIX}${conversationId}`;
    localStorage.removeItem(key);
    removeConversationMetadata(conversationId);
  } catch (error) {
    console.error('Failed to clear conversation state from localStorage:', error);
  }
}

/**
 * Get all conversation IDs from localStorage
 */
export function getAllConversationIds(): string[] {
  try {
    const keys = Object.keys(localStorage);
    return keys
      .filter(key => key.startsWith(STORAGE_KEY_PREFIX))
      .map(key => key.replace(STORAGE_KEY_PREFIX, ''));
  } catch (error) {
    console.error('Failed to get conversation IDs from localStorage:', error);
    return [];
  }
}

export function listConversationMetadata(): ConversationMetadata[] {
  return readConversationIndex();
}

export function upsertConversationMetadata(metadata: ConversationMetadata): void {
  const existing = readConversationIndex();
  const next = [
    metadata,
    ...existing.filter(item => item.conversationId !== metadata.conversationId),
  ].slice(0, 20);
  writeConversationIndex(next);
}

export function removeConversationMetadata(conversationId: string): void {
  const existing = readConversationIndex();
  const next = existing.filter(item => item.conversationId !== conversationId);
  writeConversationIndex(next);
}

/**
 * Serialize state for database storage
 */
export function serializeStateForDB(state: ConversationState): string {
  return JSON.stringify({
    ...state,
    createdAt: state.createdAt.toISOString(),
    updatedAt: state.updatedAt.toISOString(),
  });
}

/**
 * Deserialize state from database
 */
export function deserializeStateFromDB(serialized: string): ConversationState {
  const parsed = JSON.parse(serialized);
  return {
    ...parsed,
    createdAt: new Date(parsed.createdAt),
    updatedAt: new Date(parsed.updatedAt),
  };
}

/**
 * Generate a unique conversation ID
 */
export function generateConversationId(): string {
  // Use timestamp + random string for uniqueness
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 9);
  return `conv_${timestamp}_${randomStr}`;
}

/**
 * Check if a conversation is expired (older than 7 days)
 */
export function isConversationExpired(state: ConversationState): boolean {
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const now = new Date().getTime();
  const created = state.createdAt.getTime();
  return now - created > SEVEN_DAYS_MS;
}

/**
 * Clean up expired conversations from localStorage
 */
export function cleanupExpiredConversations(): number {
  try {
    const conversationIds = getAllConversationIds();
    let cleaned = 0;

    conversationIds.forEach(id => {
      const state = loadStateFromLocalStorage(id);
      if (state && isConversationExpired(state)) {
        clearStateFromLocalStorage(id);
        cleaned++;
      }
    });

    return cleaned;
  } catch (error) {
    console.error('Failed to cleanup expired conversations:', error);
    return 0;
  }
}
