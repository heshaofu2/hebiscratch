'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

interface ScratchPlayerProps {
  projectData?: string; // base64 encoded sb3 or project JSON string
  isFullscreen?: boolean;
}

interface ScratchMessage {
  source: 'scratch-gui';
  type: string;
  data: Record<string, unknown>;
}

export default function ScratchPlayer({ projectData, isFullscreen }: ScratchPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const pendingLoadRef = useRef<string | null>(null);

  // 向 iframe 发送消息
  const sendMessage = useCallback((type: string, data?: unknown) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { source: 'scratch-parent', type, data },
        '*'
      );
    }
  }, []);

  // 处理来自 iframe 的消息
  useEffect(() => {
    const handleMessage = (event: MessageEvent<ScratchMessage>) => {
      if (event.data?.source !== 'scratch-gui') return;

      const { type, data } = event.data;

      switch (type) {
        case 'EDITOR_LOADED':
          setIsLoading(false);
          break;

        case 'EDITOR_READY':
          setIsReady(true);
          // 如果有待加载的项目数据，现在加载
          if (pendingLoadRef.current) {
            sendMessage('LOAD_PROJECT', pendingLoadRef.current);
            pendingLoadRef.current = null;
          }
          break;

        case 'PROJECT_LOADED':
          if (data.success) {
            // 自动开始运行
            sendMessage('RUN_PROJECT');
          } else {
            console.error('Failed to load project:', data.error);
          }
          break;

        case 'BROWSER_NOT_SUPPORTED':
          console.error('Browser not supported for Scratch player');
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [sendMessage]);

  // 加载项目数据
  useEffect(() => {
    if (projectData) {
      if (isReady) {
        sendMessage('LOAD_PROJECT', projectData);
      } else {
        // 保存待加载的数据
        pendingLoadRef.current = projectData;
      }
    }
  }, [projectData, isReady, sendMessage]);

  return (
    <div className={`w-full h-full relative ${isFullscreen ? '' : ''}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-400">加载播放器中...</p>
          </div>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src="/scratch/embedded.html?player=true"
        className="w-full h-full border-0"
        allow="microphone; camera"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
      />
    </div>
  );
}
