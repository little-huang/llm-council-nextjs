'use client';

import SafeMarkdown from './SafeMarkdown';
import './Stage3.css';

interface Stage3Props {
  finalResponse: {
    model: string;
    response: string;
  };
}

export default function Stage3({ finalResponse }: Stage3Props) {
  if (!finalResponse) {
    return null;
  }

  return (
    <div className="stage stage3">
      <h3 className="stage-title">阶段 3: 最终委员会答案</h3>
      <div className="final-response">
        <div className="chairman-label">
          Chairman: {finalResponse.model.split('/')[1] || finalResponse.model}
        </div>
        <div className="final-text markdown-content">
          <SafeMarkdown>{finalResponse.response}</SafeMarkdown>
        </div>
      </div>
    </div>
  );
}

