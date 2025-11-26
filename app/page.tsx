'use client';

import { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import ModelConfigModal, {
  ModelOption,
} from './components/ModelConfigModal';
import { api } from './lib/api';
import './page.css';
import type { ModelConfigInput } from './types/modelConfig';

const generateId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const createModelConfig = (overrides: Partial<ModelConfigInput> = {}): ModelConfigInput => ({
  id: overrides.id ?? generateId(),
  model: overrides.model ?? '',
  systemPrompt: overrides.systemPrompt ?? '',
});

export default function Home() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [currentConversation, setCurrentConversation] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [modelConfigs, setModelConfigs] = useState<ModelConfigInput[]>([]);
  const [chairmanModel, setChairmanModel] = useState<string | null>(null);
  const [defaultChairmanModel, setDefaultChairmanModel] = useState<string>('openai/gpt-4o');
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
  const [isModelsLoading, setIsModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>('');
  const streamControllerRef = useRef<AbortController | null>(null);

  // Load API key from localStorage on mount
  useEffect(() => {
    const savedApiKey = api.getApiKey();
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
  }, []);

  // Load conversations from IndexedDB and default models on mount
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Load conversations from IndexedDB
        const convs = await api.listConversations();
        setConversations(convs);
        
        // Restore last selected conversation from localStorage
        const savedConversationId = api.getCurrentConversationId();
        if (savedConversationId) {
          // Verify the saved conversation still exists
          const conversationExists = convs.some((c: any) => c.id === savedConversationId);
          if (conversationExists) {
            setCurrentConversationId(savedConversationId);
          } else {
            // Clear invalid saved conversation ID
            api.removeCurrentConversationId();
          }
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };
    
    initializeApp();
    loadInitialModels();

    return () => {
      streamControllerRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load conversation details when selected
  useEffect(() => {
    if (currentConversationId) {
      loadConversation(currentConversationId);
    }
  }, [currentConversationId]);

  const loadConversations = async () => {
    try {
      const convs = await api.listConversations();
      setConversations(convs);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const loadInitialModels = async () => {
    try {
      const config = await api.getConfig();
      const defaults =
        config?.council_models?.map((cfg: any) =>
          createModelConfig({
            model: cfg.model,
            systemPrompt: cfg.systemPrompt || '',
          })
        ) ?? [];
      const fallbackChairman = config?.chairman_model || 'openai/gpt-4o';
      setDefaultChairmanModel(fallbackChairman);
      setChairmanModel(fallbackChairman);
      setModelConfigs(
        defaults.length > 0
          ? defaults
          : [createModelConfig({ model: 'openai/gpt-4o' })]
      );
    } catch (error) {
      console.error('Failed to load council configuration:', error);
      setModelConfigs((prev) =>
        prev.length > 0 ? prev : [createModelConfig()]
      );
    }
  };

  const loadAvailableModels = async (overrideApiKey?: string) => {
    const effectiveApiKey = overrideApiKey || apiKey;
    if (!effectiveApiKey) {
      setModelsError('请先配置 API Key');
      return;
    }
    try {
      setModelsError(null);
      setIsModelsLoading(true);
      const data = await api.listModels(effectiveApiKey);
      setAvailableModels(data.models || []);
    } catch (error: any) {
      console.error('Failed to load models:', error);
      setModelsError(error.message || '加载 OpenRouter 模型列表失败，请稍后重试');
    } finally {
      setIsModelsLoading(false);
    }
  };

  const loadConversation = async (id: string) => {
    try {
      const conv = await api.getConversation(id);
      setCurrentConversation(conv);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const handleNewConversation = async () => {
    try {
      const newConv = await api.createConversation();
      setConversations([
        { id: newConv.id, created_at: newConv.created_at, title: newConv.title, message_count: 0 },
        ...conversations,
      ]);
      setCurrentConversationId(newConv.id);
      setCurrentConversation(newConv);
      // Save to localStorage for persistence
      api.saveCurrentConversationId(newConv.id);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const handleSelectConversation = (id: string) => {
    if (id === currentConversationId) return;
    streamControllerRef.current?.abort();
    streamControllerRef.current = null;
    setIsLoading(false);
    setCurrentConversationId(id);
    // Save to localStorage for persistence
    api.saveCurrentConversationId(id);
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      // Delete from IndexedDB
      await api.deleteConversation(id);
      
      // Update conversations list
      const updatedConversations = conversations.filter(c => c.id !== id);
      setConversations(updatedConversations);
      
      // If we deleted the current conversation, clear selection or select another
      if (id === currentConversationId) {
        if (updatedConversations.length > 0) {
          // Select the first available conversation
          const nextId = updatedConversations[0].id;
          setCurrentConversationId(nextId);
          api.saveCurrentConversationId(nextId);
        } else {
          // No conversations left
          setCurrentConversationId(null);
          setCurrentConversation(null);
          api.removeCurrentConversationId();
        }
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const handleOpenModelConfig = () => {
    setIsConfigModalOpen(true);
    // Only load models if we have an API key and haven't loaded yet
    if (apiKey && availableModels.length === 0 && !isModelsLoading) {
      loadAvailableModels();
    }
  };

  const handleCloseModelConfig = () => {
    setIsConfigModalOpen(false);
  };

  const handleSaveModelConfigs = (data: {
    configs: ModelConfigInput[];
    chairmanModel: string | null;
    apiKey: string;
  }) => {
    setModelConfigs(data.configs);
    setChairmanModel(data.chairmanModel);
    // Save API key to state and localStorage
    if (data.apiKey !== apiKey) {
      setApiKey(data.apiKey);
      if (data.apiKey) {
        api.saveApiKey(data.apiKey);
      } else {
        api.removeApiKey();
      }
    }
    setIsConfigModalOpen(false);
  };

  const handleApiKeyChange = (newApiKey: string) => {
    setApiKey(newApiKey);
    if (newApiKey) {
      api.saveApiKey(newApiKey);
      // Load models when API key is first set
      if (availableModels.length === 0 && !isModelsLoading) {
        loadAvailableModels(newApiKey);
      }
    } else {
      api.removeApiKey();
      setAvailableModels([]);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!currentConversationId || !currentConversation) return;

    if (!apiKey) {
      alert('请先配置 OpenRouter API Key');
      setIsConfigModalOpen(true);
      return;
    }

    const activeModels = modelConfigs
      .map((cfg) => ({
        model: cfg.model.trim(),
        systemPrompt: cfg.systemPrompt.trim(),
      }))
      .filter((cfg) => cfg.model.length > 0)
      .map((cfg) => ({
        model: cfg.model,
        systemPrompt: cfg.systemPrompt || undefined,
      }));

    if (activeModels.length === 0) {
      alert('请至少配置一个模型');
      return;
    }

    setIsLoading(true);
    const controller = new AbortController();
    streamControllerRef.current?.abort();
    streamControllerRef.current = controller;

    const activeChairmanModel =
      chairmanModel && chairmanModel.trim().length > 0
        ? chairmanModel.trim()
        : defaultChairmanModel;

    // Check if this is the first message
    const isFirstMessage = currentConversation.messages.length === 0;

    // Variables to collect stage results for local storage
    let stage1Data: any[] = [];
    let stage2Data: any[] = [];
    let stage3Data: any = null;
    let metadataData: any = null;

    try {
      // Save user message to IndexedDB first
      await api.addUserMessage(currentConversationId, content);

      // Optimistically add user message to UI
      const userMessage = { role: 'user', content };
      setCurrentConversation((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: [...prev.messages, userMessage],
        };
      });

      // Create a partial assistant message that will be updated progressively
      const assistantMessage: any = {
        role: 'assistant',
        stage1: null,
        stage2: null,
        stage3: null,
        metadata: null,
        loading: {
          stage1: false,
          stage2: false,
          stage3: false,
        },
      };

      // Add the partial assistant message
      setCurrentConversation((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: [...prev.messages, assistantMessage],
        };
      });

      // Send message with streaming
      await api.sendMessageStream(
        content,
        activeModels,
        activeChairmanModel,
        (eventType, event) => {
          switch (eventType) {
            case 'stage1_start':
              setCurrentConversation((prev: any) => {
                if (!prev) return prev;
                const messages = [...prev.messages];
                const lastMsg = messages[messages.length - 1];
                if (!lastMsg) return prev;
                lastMsg.loading.stage1 = true;
                return { ...prev, messages };
              });
              break;

            case 'stage1_complete':
              stage1Data = event.data;
              setCurrentConversation((prev: any) => {
                if (!prev) return prev;
                const messages = [...prev.messages];
                const lastMsg = messages[messages.length - 1];
                if (!lastMsg) return prev;
                lastMsg.stage1 = event.data;
                lastMsg.loading.stage1 = false;
                return { ...prev, messages };
              });
              break;

            case 'stage2_start':
              setCurrentConversation((prev: any) => {
                if (!prev) return prev;
                const messages = [...prev.messages];
                const lastMsg = messages[messages.length - 1];
                if (!lastMsg) return prev;
                lastMsg.loading.stage2 = true;
                return { ...prev, messages };
              });
              break;

            case 'stage2_complete':
              stage2Data = event.data;
              metadataData = event.metadata;
              setCurrentConversation((prev: any) => {
                if (!prev) return prev;
                const messages = [...prev.messages];
                const lastMsg = messages[messages.length - 1];
                if (!lastMsg) return prev;
                lastMsg.stage2 = event.data;
                lastMsg.metadata = event.metadata;
                lastMsg.loading.stage2 = false;
                return { ...prev, messages };
              });
              break;

            case 'stage3_start':
              setCurrentConversation((prev: any) => {
                if (!prev) return prev;
                const messages = [...prev.messages];
                const lastMsg = messages[messages.length - 1];
                if (!lastMsg) return prev;
                lastMsg.loading.stage3 = true;
                return { ...prev, messages };
              });
              break;

            case 'stage3_complete':
              stage3Data = event.data;
              setCurrentConversation((prev: any) => {
                if (!prev) return prev;
                const messages = [...prev.messages];
                const lastMsg = messages[messages.length - 1];
                if (!lastMsg) return prev;
                lastMsg.stage3 = event.data;
                lastMsg.loading.stage3 = false;
                return { ...prev, messages };
              });
              break;

            case 'title_complete':
              // Update title in IndexedDB
              api.updateConversationTitle(currentConversationId, event.data.title);
              // Update local state
              setCurrentConversation((prev: any) => {
                if (!prev) return prev;
                return { ...prev, title: event.data.title };
              });
              // Update conversations list
              setConversations((prev) =>
                prev.map((c) =>
                  c.id === currentConversationId
                    ? { ...c, title: event.data.title }
                    : c
                )
              );
              break;

            case 'complete':
              // Save assistant message to IndexedDB
              api.addAssistantMessage(
                currentConversationId,
                stage1Data,
                stage2Data,
                stage3Data,
                metadataData
              );
              // Update conversations list with new message count
              loadConversations();
              break;

            case 'error':
              console.error('Stream error:', event.message);
              break;

            default:
              console.log('Unknown event type:', eventType);
          }
        },
        {
          signal: controller.signal,
          generateTitle: isFirstMessage,
        }
      );
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        console.warn('Stream aborted.');
      } else {
        console.error('Failed to send message:', error);
        // Reload conversation from IndexedDB to get clean state
        loadConversation(currentConversationId);
      }
    } finally {
      if (streamControllerRef.current === controller) {
        streamControllerRef.current = null;
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="app">
      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onOpenModelConfig={handleOpenModelConfig}
        onDeleteConversation={handleDeleteConversation}
        isLoading={isLoading}
      />
      <ChatInterface
        conversation={currentConversation}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
      />
      <ModelConfigModal
        isOpen={isConfigModalOpen}
        onClose={handleCloseModelConfig}
        onSave={handleSaveModelConfigs}
        initialConfigs={modelConfigs}
        availableModels={availableModels}
        chairmanModel={chairmanModel}
        defaultChairmanModel={defaultChairmanModel}
        isLoading={isModelsLoading}
        errorMessage={modelsError}
        apiKey={apiKey}
        onRetryFetch={() => loadAvailableModels()}
        onApiKeyChange={handleApiKeyChange}
      />
    </div>
  );
}
