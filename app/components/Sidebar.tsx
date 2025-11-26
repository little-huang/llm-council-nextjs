'use client';

import { useState } from 'react';
import './Sidebar.css';

interface Conversation {
  id: string;
  title: string;
  message_count: number;
}

interface SidebarProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onOpenModelConfig: () => void;
  onDeleteConversation: (id: string) => void;
  isLoading?: boolean;
}

export default function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onOpenModelConfig,
  onDeleteConversation,
  isLoading = false,
}: SidebarProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDeleteClick = (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    setDeleteConfirmId(convId);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmId) {
      onDeleteConversation(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmId(null);
  };

  return (
    <div className={`sidebar ${isLoading ? 'sidebar-disabled' : ''}`}>
      <div className="sidebar-header">
        <h1>LLM 委员会</h1>
        <div className="sidebar-actions">
          <button 
            className="new-conversation-btn" 
            onClick={onNewConversation}
            disabled={isLoading}
          >
            + 新对话
          </button>
          <button 
            className="config-button" 
            onClick={onOpenModelConfig}
            disabled={isLoading}
          >
            ⚙ 配置模型
          </button>
        </div>
      </div>

      <div className="conversation-list">
        {conversations.length === 0 ? (
          <div className="no-conversations">暂无对话</div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={`conversation-item ${
                conv.id === currentConversationId ? 'active' : ''
              } ${isLoading ? 'disabled' : ''}`}
              onClick={() => !isLoading && onSelectConversation(conv.id)}
            >
              <div className="conversation-content">
                <div className="conversation-title">
                  {conv.title || '新对话'}
                </div>
                <div className="conversation-meta">
                  {conv.message_count} 条消息
                </div>
              </div>
              {!isLoading && (
                <button
                  className="delete-btn"
                  onClick={(e) => handleDeleteClick(e, conv.id)}
                  title="删除对话"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* 删除确认对话框 */}
      {deleteConfirmId && (
        <div className="delete-confirm-overlay" onClick={handleCancelDelete}>
          <div className="delete-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="delete-confirm-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <h3>确认删除</h3>
            <p>确定要删除这个对话吗？此操作无法撤销。</p>
            <div className="delete-confirm-actions">
              <button className="cancel-btn" onClick={handleCancelDelete}>
                取消
              </button>
              <button className="confirm-btn" onClick={handleConfirmDelete}>
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
