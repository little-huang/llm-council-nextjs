/**
 * IndexedDB storage for conversations.
 * All conversation data is stored locally in the browser.
 */

const DB_NAME = 'llm-council-db';
const DB_VERSION = 1;
const CONVERSATIONS_STORE = 'conversations';

export interface Message {
  role: string;
  content?: string;
  stage1?: any[];
  stage2?: any[];
  stage3?: any;
  metadata?: any;
}

export interface Conversation {
  id: string;
  created_at: string;
  title: string;
  messages: Message[];
}

export interface ConversationMetadata {
  id: string;
  created_at: string;
  title: string;
  message_count: number;
}

/**
 * Initialize and open the IndexedDB database.
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is only available in the browser'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create conversations object store
      if (!db.objectStoreNames.contains(CONVERSATIONS_STORE)) {
        const store = db.createObjectStore(CONVERSATIONS_STORE, { keyPath: 'id' });
        store.createIndex('created_at', 'created_at', { unique: false });
      }
    };
  });
}

/**
 * Create a new conversation.
 */
export async function createConversation(conversationId: string): Promise<Conversation> {
  const db = await openDB();

  const conversation: Conversation = {
    id: conversationId,
    created_at: new Date().toISOString(),
    title: '新对话',
    messages: [],
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CONVERSATIONS_STORE], 'readwrite');
    const store = transaction.objectStore(CONVERSATIONS_STORE);
    const request = store.add(conversation);

    request.onsuccess = () => {
      resolve(conversation);
    };

    request.onerror = () => {
      reject(new Error('Failed to create conversation'));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Get a conversation by ID.
 */
export async function getConversation(conversationId: string): Promise<Conversation | null> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CONVERSATIONS_STORE], 'readonly');
    const store = transaction.objectStore(CONVERSATIONS_STORE);
    const request = store.get(conversationId);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => {
      reject(new Error('Failed to get conversation'));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Save a conversation (create or update).
 */
export async function saveConversation(conversation: Conversation): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CONVERSATIONS_STORE], 'readwrite');
    const store = transaction.objectStore(CONVERSATIONS_STORE);
    const request = store.put(conversation);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Failed to save conversation'));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Delete a conversation by ID.
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CONVERSATIONS_STORE], 'readwrite');
    const store = transaction.objectStore(CONVERSATIONS_STORE);
    const request = store.delete(conversationId);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Failed to delete conversation'));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * List all conversations (metadata only).
 */
export async function listConversations(): Promise<ConversationMetadata[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CONVERSATIONS_STORE], 'readonly');
    const store = transaction.objectStore(CONVERSATIONS_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const conversations: ConversationMetadata[] = (request.result || []).map((conv: Conversation) => ({
        id: conv.id,
        created_at: conv.created_at,
        title: conv.title || '新对话',
        message_count: conv.messages.length,
      }));

      // Sort by creation time, newest first
      conversations.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      resolve(conversations);
    };

    request.onerror = () => {
      reject(new Error('Failed to list conversations'));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Add a user message to a conversation.
 */
export async function addUserMessage(conversationId: string, content: string): Promise<void> {
  const conversation = await getConversation(conversationId);
  if (!conversation) {
    throw new Error(`Conversation ${conversationId} not found`);
  }

  conversation.messages.push({
    role: 'user',
    content,
  });

  await saveConversation(conversation);
}

/**
 * Add an assistant message with all 3 stages to a conversation.
 */
export async function addAssistantMessage(
  conversationId: string,
  stage1: any[],
  stage2: any[],
  stage3: any,
  metadata: any
): Promise<void> {
  const conversation = await getConversation(conversationId);
  if (!conversation) {
    throw new Error(`Conversation ${conversationId} not found`);
  }

  conversation.messages.push({
    role: 'assistant',
    stage1,
    stage2,
    stage3,
    metadata,
  });

  await saveConversation(conversation);
}

/**
 * Update the title of a conversation.
 */
export async function updateConversationTitle(
  conversationId: string,
  title: string
): Promise<void> {
  const conversation = await getConversation(conversationId);
  if (!conversation) {
    throw new Error(`Conversation ${conversationId} not found`);
  }

  conversation.title = title;
  await saveConversation(conversation);
}

/**
 * Clear all conversations from the database.
 */
export async function clearAllConversations(): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CONVERSATIONS_STORE], 'readwrite');
    const store = transaction.objectStore(CONVERSATIONS_STORE);
    const request = store.clear();

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Failed to clear conversations'));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

