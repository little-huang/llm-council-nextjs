'use client';

import React, { useEffect } from 'react';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 始终使用 light 亮色主题
    document.documentElement.setAttribute('data-theme', 'light');
  }, []);

  return <>{children}</>;
}

