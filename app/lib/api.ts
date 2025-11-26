/**
 * API client for the LLM Council backend.
 * Conversation data is stored locally in IndexedDB.
 */

import {
  listConversations as idbListConversations,
  createConversation as idbCreateConversation,
  getConversation as idbGetConversation,
  saveConversation as idbSaveConversation,
  addUserMessage as idbAddUserMessage,
  addAssistantMessage as idbAddAssistantMessage,
  updateConversationTitle as idbUpdateConversationTitle,
  deleteConversation as idbDeleteConversation,
  type Conversation,
  type ConversationMetadata,
} from './indexedDB';

const API_BASE = '/api';

// localStorage keys
const API_KEY_STORAGE_KEY = 'openrouter_api_key';
const CURRENT_CONVERSATION_KEY = 'current_conversation_id';

// Generate unique ID
const generateId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export const api = {
  /**
   * Get API key from localStorage.
   */
  getApiKey(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(API_KEY_STORAGE_KEY);
  },

  /**
   * Save API key to localStorage.
   */
  saveApiKey(apiKey: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
  },

  /**
   * Remove API key from localStorage.
   */
  removeApiKey(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(API_KEY_STORAGE_KEY);
  },

  /**
   * Get current conversation ID from localStorage.
   */
  getCurrentConversationId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(CURRENT_CONVERSATION_KEY);
  },

  /**
   * Save current conversation ID to localStorage.
   */
  saveCurrentConversationId(conversationId: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(CURRENT_CONVERSATION_KEY, conversationId);
  },

  /**
   * Remove current conversation ID from localStorage.
   */
  removeCurrentConversationId(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(CURRENT_CONVERSATION_KEY);
  },

  /**
   * List all conversations from IndexedDB.
   */
  async listConversations(): Promise<ConversationMetadata[]> {
    return idbListConversations();
  },

  /**
   * Create a new conversation in IndexedDB.
   */
  async createConversation(): Promise<Conversation> {
    const conversationId = generateId();
    return idbCreateConversation(conversationId);
  },

  /**
   * Get a specific conversation from IndexedDB.
   */
  async getConversation(conversationId: string): Promise<Conversation | null> {
    return idbGetConversation(conversationId);
  },

  /**
   * Save a conversation to IndexedDB.
   */
  async saveConversation(conversation: Conversation): Promise<void> {
    return idbSaveConversation(conversation);
  },

  /**
   * Delete a conversation from IndexedDB.
   */
  async deleteConversation(conversationId: string): Promise<void> {
    return idbDeleteConversation(conversationId);
  },

  /**
   * Add a user message to a conversation in IndexedDB.
   */
  async addUserMessage(conversationId: string, content: string): Promise<void> {
    return idbAddUserMessage(conversationId, content);
  },

  /**
   * Add an assistant message to a conversation in IndexedDB.
   */
  async addAssistantMessage(
    conversationId: string,
    stage1: any[],
    stage2: any[],
    stage3: any,
    metadata: any
  ): Promise<void> {
    return idbAddAssistantMessage(conversationId, stage1, stage2, stage3, metadata);
  },

  /**
   * Update conversation title in IndexedDB.
   */
  async updateConversationTitle(conversationId: string, title: string): Promise<void> {
    return idbUpdateConversationTitle(conversationId, title);
  },

  /**
   * Load server-side defaults for council configuration.
   */
  async getConfig() {
    const response = await fetch(`${API_BASE}/config`);
    if (!response.ok) {
      throw new Error('Failed to load configuration');
    }
    return response.json();
  },

  /**
   * Fetch available models from OpenRouter via backend proxy.
   */
  async listModels(apiKey?: string) {
    const headers: Record<string, string> = {
      'Cache-Control': 'no-cache',
    };

    // Use provided API key or get from localStorage
    const effectiveApiKey = apiKey || this.getApiKey();
    if (effectiveApiKey) {
      headers['x-openrouter-api-key'] = effectiveApiKey;
    }

    const response = await fetch(`${API_BASE}/models`, {
      cache: 'no-store',
      headers,
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to load models');
    }
    return response.json();
  },

  /**
   * Send a message and receive streaming updates.
   * The streaming API now only handles LLM processing, not storage.
   */
  async sendMessageStream(
    content: string,
    councilModels: Array<{ model: string; systemPrompt?: string }>,
    chairmanModel: string,
    onEvent: (eventType: string, event: any) => void,
    options?: {
      signal?: AbortSignal;
      apiKey?: string;
      generateTitle?: boolean;
    }
  ) {
    // Use provided API key or get from localStorage
    const effectiveApiKey = options?.apiKey || this.getApiKey();

    const response = await fetch(
      `${API_BASE}/conversations/message/stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          councilModels,
          chairmanModel,
          apiKey: effectiveApiKey,
          generateTitle: options?.generateTitle,
        }),
        signal: options?.signal,
      }
    );

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          try {
            const event = JSON.parse(data);
            onEvent(event.type, event);
          } catch (e) {
            console.error('Failed to parse SSE event:', e);
          }
        }
      }
    }
  },
};
