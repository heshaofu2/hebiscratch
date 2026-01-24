'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

interface ScratchEditorProps {
  projectData?: string; // base64 encoded sb3 or project JSON string
  onSave?: (projectData: string) => void;
  onThumbnail?: (thumbnailData: string) => void; // base64 encoded PNG
  onProjectChange?: () => void;
}

interface ScratchMessage {
  source: 'scratch-gui';
  type: string;
  data: Record<string, unknown>;
}

export default function ScratchEditor({ projectData, onSave, onThumbnail, onProjectChange }: ScratchEditorProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const pendingLoadRef = useRef<string | null>(null);
  const loadedProjectRef = useRef<string | null>(null); // 跟踪已加载的项目数据，防止重复加载

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
            const dataToLoad = pendingLoadRef.current;
            pendingLoadRef.current = null;
            // 标记为已加载，防止 useEffect 重复发送
            loadedProjectRef.current = dataToLoad;
            sendMessage('LOAD_PROJECT', dataToLoad);
          }
          break;

        case 'PROJECT_LOADED':
          if (!data.success) {
            console.error('Failed to load project:', data.error);
          }
          break;

        case 'PROJECT_SAVED':
          if (data.success && onSave) {
            onSave(data.data as string);
          } else if (!data.success) {
            console.error('Failed to save project:', data.error);
          }
          break;

        case 'THUMBNAIL':
          if (data.success && onThumbnail) {
            onThumbnail(data.data as string);
          } else if (!data.success) {
            console.error('Failed to get thumbnail:', data.error);
          }
          break;

        case 'PROJECT_CHANGED':
          onProjectChange?.();
          break;

        case 'BROWSER_NOT_SUPPORTED':
          console.error('Browser not supported for Scratch editor');
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onSave, onThumbnail, onProjectChange, sendMessage]);

  // 加载项目数据
  useEffect(() => {
    if (projectData) {
      // 如果这个项目数据已经加载过了，不要重复加载
      if (loadedProjectRef.current === projectData) {
        return;
      }
      if (isReady) {
        loadedProjectRef.current = projectData;
        sendMessage('LOAD_PROJECT', projectData);
      } else {
        // 保存待加载的数据
        pendingLoadRef.current = projectData;
      }
    }
  }, [projectData, isReady, sendMessage]);

  // 监听保存请求事件
  useEffect(() => {
    const handleSaveRequest = () => {
      sendMessage('SAVE_PROJECT');
    };

    window.addEventListener('scratch-save-request', handleSaveRequest);
    return () => window.removeEventListener('scratch-save-request', handleSaveRequest);
  }, [sendMessage]);

  // 公开获取项目数据的方法
  const requestSave = useCallback(() => {
    sendMessage('SAVE_PROJECT');
  }, [sendMessage]);

  // 运行项目
  const runProject = useCallback(() => {
    sendMessage('RUN_PROJECT');
  }, [sendMessage]);

  // 停止项目
  const stopProject = useCallback(() => {
    sendMessage('STOP_PROJECT');
  }, [sendMessage]);

  // 获取项目截图
  const getThumbnail = useCallback(() => {
    sendMessage('GET_THUMBNAIL');
  }, [sendMessage]);

  // 将方法挂载到 window 上，供父组件调用
  useEffect(() => {
    (window as unknown as Record<string, unknown>).scratchEditor = {
      requestSave,
      runProject,
      stopProject,
      getThumbnail,
    };
    return () => {
      delete (window as unknown as Record<string, unknown>).scratchEditor;
    };
  }, [requestSave, runProject, stopProject, getThumbnail]);

  return (
    <div className="w-full h-full relative">
      {isLoading && (
        <div className="absolute inset-0 bg-white flex items-center justify-center z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">加载 Scratch 编辑器中...</p>
          </div>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src="/scratch/embedded.html"
        className="w-full h-full border-0"
        allow="microphone; camera"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
      />
    </div>
  );
}
