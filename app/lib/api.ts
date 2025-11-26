/**
 * API client for the LLM Council backend.
 */

const API_BASE = '/api';

// localStorage keys
const API_KEY_STORAGE_KEY = 'openrouter_api_key';
const CURRENT_CONVERSATION_KEY = 'current_conversation_id';

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
   * List all conversations.
   */
  async listConversations() {
    const response = await fetch(`${API_BASE}/conversations`);
    if (!response.ok) {
      throw new Error('Failed to list conversations');
    }
    return response.json();
  },

  /**
   * Create a new conversation.
   */
  async createConversation() {
    const response = await fetch(`${API_BASE}/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      throw new Error('Failed to create conversation');
    }
    return response.json();
  },

  /**
   * Get a specific conversation.
   */
  async getConversation(conversationId: string) {
    const response = await fetch(
      `${API_BASE}/conversations/${conversationId}`
    );
    if (!response.ok) {
      throw new Error('Failed to get conversation');
    }
    return response.json();
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
   */
  async sendMessageStream(
    conversationId: string,
    content: string,
    councilModels: Array<{ model: string; systemPrompt?: string }>,
    chairmanModel: string,
    onEvent: (eventType: string, event: any) => void,
    signal?: AbortSignal,
    apiKey?: string
  ) {
    // Use provided API key or get from localStorage
    const effectiveApiKey = apiKey || this.getApiKey();

    const response = await fetch(
      `${API_BASE}/conversations/${conversationId}/message/stream`,
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
        }),
        signal,
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

