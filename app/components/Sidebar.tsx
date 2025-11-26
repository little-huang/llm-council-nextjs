'use client';

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
}

export default function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onOpenModelConfig,
}: SidebarProps) {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>LLM 委员会</h1>
        <div className="sidebar-actions">
          <button className="new-conversation-btn" onClick={onNewConversation}>
            + 新对话
          </button>
          <button className="config-button" onClick={onOpenModelConfig}>
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
              }`}
              onClick={() => onSelectConversation(conv.id)}
            >
              <div className="conversation-title">
                {conv.title || '新对话'}
              </div>
              <div className="conversation-meta">
                {conv.message_count} 条消息
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
