'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ModelConfigInput } from '../types/modelConfig';
import './ModelConfigModal.css';

export interface ModelOption {
  id: string;
  name: string;
  description?: string;
  pricing?: string | null;
  context_length?: number | null;
  tags?: string[];
}

interface ModelConfigModalProps {
  isOpen: boolean;
  initialConfigs: ModelConfigInput[];
  availableModels: ModelOption[];
  chairmanModel: string | null;
  defaultChairmanModel: string;
  isLoading: boolean;
  errorMessage?: string | null;
  apiKey: string;
  onRetryFetch: () => void;
  onClose: () => void;
  onSave: (data: {
    configs: ModelConfigInput[];
    chairmanModel: string | null;
    apiKey: string;
  }) => void;
  onApiKeyChange: (apiKey: string) => void;
}

export default function ModelConfigModal({
  isOpen,
  initialConfigs,
  availableModels,
  isLoading,
  chairmanModel,
  defaultChairmanModel,
  errorMessage,
  apiKey,
  onRetryFetch,
  onClose,
  onSave,
  onApiKeyChange,
}: ModelConfigModalProps) {
  const [search, setSearch] = useState('');
  const [draftConfigs, setDraftConfigs] = useState<ModelConfigInput[]>(initialConfigs);
  const [draftChairman, setDraftChairman] = useState<string>(
    chairmanModel || ''
  );
  const [draftApiKey, setDraftApiKey] = useState(apiKey);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDraftConfigs(initialConfigs.map((cfg) => ({ ...cfg })));
      setDraftChairman(chairmanModel || '');
      setDraftApiKey(apiKey);
      setSearch('');
    }
  }, [initialConfigs, chairmanModel, apiKey, isOpen]);

  const normalizedSearch = search.trim().toLowerCase();

  const filteredOptions = useMemo(() => {
    if (!normalizedSearch) return availableModels;
    return availableModels.filter((option) => {
      const haystack = `${option.name} ${option.id} ${option.description || ''}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [availableModels, normalizedSearch]);

  const isSelected = (modelId: string) =>
    draftConfigs.some((cfg) => cfg.model === modelId);

  const toggleModel = (modelId: string) => {
    setDraftConfigs((prev) => {
      const exists = prev.some((cfg) => cfg.model === modelId);
      if (exists) {
        return prev.filter((cfg) => cfg.model !== modelId);
      }
      return [
        ...prev,
        {
          id: modelId,
          model: modelId,
          systemPrompt: '',
        },
      ];
    });
  };

  const handlePromptChange = (modelId: string, value: string) => {
    setDraftConfigs((prev) =>
      prev.map((cfg) =>
        cfg.model === modelId ? { ...cfg, systemPrompt: value } : cfg
      )
    );
  };

  const handleSave = () => {
    const sanitized = draftConfigs.map((cfg) => ({
      ...cfg,
      systemPrompt: cfg.systemPrompt.trim(),
    }));
    const normalizedChairman = draftChairman.trim();
    const normalizedApiKey = draftApiKey.trim();
    onSave({
      configs: sanitized,
      chairmanModel: normalizedChairman.length > 0 ? normalizedChairman : null,
      apiKey: normalizedApiKey,
    });
  };

  const handleClearApiKey = () => {
    setDraftApiKey('');
    onApiKeyChange('');
  };

  const handleApiKeyBlur = () => {
    // Save API key on blur so it persists even without clicking Save
    const trimmed = draftApiKey.trim();
    if (trimmed !== apiKey) {
      onApiKeyChange(trimmed);
    }
  };

  const catalogModels = useMemo(
    () => new Map(availableModels.map((m) => [m.id, m])),
    [availableModels]
  );

  const disableSave = draftConfigs.length === 0 || !draftApiKey.trim();

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-container">
        <div className="modal-header">
          <div>
            <h2>配置模型</h2>
            <p>从 OpenRouter 列表中选择用于本次会话的模型，并可为每个模型提供 System Prompt。</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>

        <div className="modal-body">
          {/* API Key Configuration Section */}
          <div className="api-key-section">
            <div className="api-key-header">
              <h3>OpenRouter API Key</h3>
              <p>
                需要先配置 API Key 才能加载和使用模型。
                <a 
                  href="https://openrouter.ai/keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="link-button"
                  style={{ marginLeft: '8px' }}
                >
                  获取 API Key →
                </a>
              </p>
            </div>
            <div className="api-key-input-wrapper">
              <input
                className="api-key-input"
                type={showApiKey ? 'text' : 'password'}
                placeholder="sk-or-v1-..."
                value={draftApiKey}
                onChange={(e) => setDraftApiKey(e.target.value)}
                onBlur={handleApiKeyBlur}
              />
              <button
                type="button"
                className="api-key-toggle"
                onClick={() => setShowApiKey(!showApiKey)}
                aria-label={showApiKey ? '隐藏' : '显示'}
              >
                {showApiKey ? '🙈' : '👁️'}
              </button>
              {draftApiKey && (
                <button
                  type="button"
                  className="api-key-clear"
                  onClick={handleClearApiKey}
                  aria-label="清除 API Key"
                >
                  ✕
                </button>
              )}
            </div>
            {draftApiKey && (
              <div className="api-key-status success">
                ✓ API Key 已配置
              </div>
            )}
            {!draftApiKey && (
              <div className="api-key-status warning">
                ⚠ 请输入您的 OpenRouter API Key
              </div>
            )}
          </div>

          <div className="modal-controls">
            <input
              className="search-input"
              placeholder="搜索模型名称或 ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={isLoading || !draftApiKey}
            />
            <div className="modal-meta">
              已选择 {draftConfigs.length} 个模型
            </div>
          </div>

          {!draftApiKey && (
            <div className="modal-status">请先配置 API Key 以加载模型列表</div>
          )}

          {draftApiKey && isLoading && (
            <div className="modal-status">正在加载 OpenRouter 模型列表...</div>
          )}

          {draftApiKey && errorMessage && (
            <div className="modal-error">
              <span>{errorMessage}</span>
              <button className="link-button" onClick={onRetryFetch}>
                重试
              </button>
            </div>
          )}

          {draftApiKey && !isLoading && !errorMessage && (
            <>
            <div className="modal-content">
              <div className="model-list">
                {filteredOptions.length === 0 ? (
                  <div className="modal-status">无匹配结果</div>
                ) : (
                  filteredOptions.map((option) => (
                    <label
                      key={option.id}
                      className={`model-item ${
                        isSelected(option.id) ? 'selected' : ''
                      }`}
                    >
                      <div className="model-item-header">
                        <input
                          type="checkbox"
                          checked={isSelected(option.id)}
                          onChange={() => toggleModel(option.id)}
                        />
                        <div>
                          <div className="model-name">{option.name}</div>
                          <div className="model-id">{option.id}</div>
                        </div>
                      </div>
                      {option.description && (
                        <p className="model-description">{option.description}</p>
                      )}
                      <div className="model-tags">
                        {option.pricing && (
                          <span className="model-tag">
                            Prompt: {option.pricing}
                          </span>
                        )}
                        {option.context_length && (
                          <span className="model-tag">
                            Context: {option.context_length}
                          </span>
                        )}
                      </div>
                    </label>
                  ))
                )}
              </div>

              <div className="selected-list">
                {draftConfigs.length === 0 ? (
                  <div className="modal-status">
                    勾选上方列表中的模型后，可在此设置 System Prompt。
                  </div>
                ) : (
                  draftConfigs.map((cfg) => {
                    const option = catalogModels.get(cfg.model);
                    return (
                      <div key={cfg.id} className="selected-item">
                        <div className="selected-item-header">
                          <div>
                            <div className="model-name">
                              {option?.name || cfg.model}
                            </div>
                            <div className="model-id">{cfg.model}</div>
                          </div>
                          <button
                            className="remove-btn"
                            onClick={() => toggleModel(cfg.model)}
                            aria-label="移除该模型"
                          >
                            移除
                          </button>
                        </div>
                        <textarea
                          className="prompt-textarea"
                          placeholder="可选：为该模型提供定制的 System Prompt"
                          value={cfg.systemPrompt}
                          onChange={(e) =>
                            handlePromptChange(cfg.model, e.target.value)
                          }
                          rows={3}
                        />
                        {!option && (
                          <div className="model-hint">
                            该模型暂未在 OpenRouter 列表中显示，将按手动输入的 ID 调用。
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            <div className="chairman-section">
              <div className="chairman-header">
                <h3>主席模型</h3>
                <p>
                  默认使用 <strong>{defaultChairmanModel}</strong>。可在此输入模型 ID 或从列表中选择。
                </p>
              </div>
              <input
                className="chairman-input"
                list="chairman-model-options"
                placeholder={`留空则使用 ${defaultChairmanModel}`}
                value={draftChairman}
                onChange={(e) => setDraftChairman(e.target.value)}
              />
              <datalist id="chairman-model-options">
                {availableModels.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </datalist>
              <div className="chairman-hint">
                建议选择在 OpenRouter 列表中可用的模型，以获得最佳兼容性。
              </div>
            </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="secondary-btn" onClick={onClose}>
            取消
          </button>
          <button
            className="primary-btn"
            onClick={handleSave}
            disabled={disableSave}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}


