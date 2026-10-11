import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, Send, Plus, Trash2, Paperclip, X, Copy, Check, MessageSquare, 
  Sparkles, RefreshCw, FileText, ChevronLeft, ChevronRight, Terminal
} from 'lucide-react';
import { AppProps } from '../types/application.types';
import { aiService } from '../services/ai.service';
import { vfsService } from '../services/vfs.service';
import { Conversation, Message, ModelInfo } from '../types/ai.types';
import { VfsNode } from '../types/vfs.types';

export const AIAssistantApp: React.FC<AppProps> = ({ customProps }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvoId, setCurrentConvoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState('llama3');
  const [isOllamaOnline, setIsOllamaOnline] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 768 : true));

  // File context attachment modal / state
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [availableFiles, setAvailableFiles] = useState<VfsNode[]>([]);
  const [attachedFile, setAttachedFile] = useState<VfsNode | null>(null);
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle cross-app file attachment trigger
  useEffect(() => {
    if (customProps?.attachFileId) {
      vfsService
        .getNode(customProps.attachFileId)
        .then((node) => {
          if (node && node.type === 'FILE') {
            setAttachedFile(node);
            setInputPrompt(`Please analyze and explain ${node.name}.`);
          }
        })
        .catch((err) => console.error('Failed to attach file from app prop:', err));
    }
  }, [customProps?.attachFileId]);

  // Load conversations and models on mount
  useEffect(() => {
    loadConversations();
    loadModels();
  }, []);

  // Auto-scroll when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const loadConversations = async () => {
    try {
      const list = await aiService.listConversations();
      setConversations(list);
      if (list.length > 0 && !currentConvoId) {
        selectConversation(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  const loadModels = async () => {
    try {
      const data = await aiService.listModels();
      const allModels = [...(data.ollama || []), ...(data.mock || [])];
      setModels(allModels);
      setIsOllamaOnline(data.ollama && data.ollama.length > 0);
      if (data.currentModel) {
        setSelectedModel(data.currentModel);
      } else if (allModels.length > 0) {
        setSelectedModel(allModels[0].name);
      } else {
        setSelectedModel('browseros-assistant-v1');
      }
    } catch (err) {
      console.error('Failed to load AI models:', err);
      const fallbackModels: ModelInfo[] = [
        { name: 'browseros-assistant-v1', description: 'BrowserOS Offline AI' },
        { name: 'code-helper-fast', description: 'Quick Code Assistant' },
      ];
      setModels(fallbackModels);
      setSelectedModel('browseros-assistant-v1');
      setIsOllamaOnline(false);
    }
  };

  const selectConversation = async (id: string) => {
    try {
      setCurrentConvoId(id);
      const convo = await aiService.getConversation(id);
      setMessages(convo.messages || []);
      setSelectedModel(convo.model || selectedModel);
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    } catch (err) {
      console.error('Failed to load conversation details:', err);
    }
  };

  const handleNewChat = () => {
    setCurrentConvoId(null);
    setMessages([]);
    setAttachedFile(null);
    setInputPrompt('');
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
    if (textareaRef.current) textareaRef.current.focus();
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await aiService.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (currentConvoId === id) {
        handleNewChat();
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const openFilePicker = async () => {
    try {
      const nodes = await vfsService.searchNodes('');
      const filesOnly = nodes.filter((n) => n.type === 'FILE');
      setAvailableFiles(filesOnly);
      setShowFilePicker(true);
    } catch (err) {
      console.error('Failed to list files for context attachment:', err);
    }
  };

  const handleSendMessage = async () => {
    const text = inputPrompt.trim();
    if (!text || isLoading) return;

    setInputPrompt('');
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      conversationId: currentConvoId || 'temp',
      role: 'user',
      content: text,
      contextName: attachedFile ? attachedFile.name : null,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMessage]);
    setIsLoading(true);

    try {
      const isSelectedMock =
        selectedModel.includes('browseros') || selectedModel.includes('code-helper');

      const response = await aiService.sendMessage({
        conversationId: currentConvoId || undefined,
        content: text,
        model: selectedModel || 'browseros-assistant-v1',
        provider: isSelectedMock ? 'mock' : 'ollama',
        attachFileId: attachedFile ? attachedFile.id : undefined,
      });

      setAttachedFile(null);
      if (!currentConvoId) {
        setCurrentConvoId(response.conversationId);
        await loadConversations();
      }

      setMessages((prev) => {
        // replace temp message or append assistant
        const filtered = prev.filter((m) => m.id !== tempUserMessage.id);
        return [...filtered, tempUserMessage, response.message];
      });
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMessage: Message = {
        id: `err-${Date.now()}`,
        conversationId: currentConvoId || 'temp',
        role: 'assistant',
        content: `Error: ${err.message || 'Failed to communicate with AI provider.'}`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeIdx(id);
    setTimeout(() => setCopiedCodeIdx(null), 2000);
  };

  // Render markdown text and extract code fences into interactive blocks
  const renderMessageContent = (content: string, msgId: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);

    return (
      <div className="space-y-2 text-xs leading-relaxed break-words">
        {parts.map((part, index) => {
          if (part.startsWith('```') && part.endsWith('```')) {
            const lines = part.slice(3, -3).trim().split('\n');
            const language = lines[0].trim() || 'text';
            const code = lines.slice(1).join('\n') || lines[0];
            const blockId = `${msgId}-code-${index}`;
            const isCopied = copiedCodeIdx === blockId;

            return (
              <div key={index} className="rounded-lg overflow-hidden border border-slate-700/80 bg-slate-950 my-2 shadow-inner">
                <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-[10px] text-slate-400">
                  <span className="font-mono text-purple-400">{language}</span>
                  <button
                    onClick={() => copyToClipboard(code, blockId)}
                    className="flex items-center space-x-1 hover:text-white transition-colors px-1.5 py-0.5 rounded hover:bg-slate-800"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3 text-[11px] font-mono overflow-x-auto text-emerald-300 selection:bg-purple-900">
                  <code>{code}</code>
                </pre>
              </div>
            );
          }

          // Format paragraphs and simple markdown bold/quote lines
          return (
            <div key={index} className="whitespace-pre-wrap">
              {part.split('\n').map((line, lIdx) => {
                if (line.startsWith('> ')) {
                  return (
                    <blockquote key={lIdx} className="border-l-2 border-purple-500 pl-2 text-slate-400 italic my-1">
                      {line.replace(/^>\s*/, '')}
                    </blockquote>
                  );
                }
                return <p key={lIdx}>{line}</p>;
              })}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="h-full w-full bg-slate-950 text-slate-200 flex flex-row overflow-hidden select-text text-xs relative">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="absolute inset-0 bg-black/60 z-20 md:hidden backdrop-blur-xs"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64 absolute inset-y-0 left-0 z-30 md:relative md:z-auto' : 'w-0'
        } transition-all duration-300 ease-in-out bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0 overflow-hidden shadow-2xl md:shadow-none`}
      >
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bot className="w-4 h-4 text-purple-400" />
            <span className="font-semibold text-white">BrowserOS AI</span>
          </div>
          <button
            onClick={handleNewChat}
            className="flex items-center space-x-1 px-2.5 py-1 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 rounded-lg text-[11px] transition-colors"
            title="Start a new chat"
          >
            <Plus className="w-3 h-3" />
            <span>New</span>
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="text-[10px] uppercase font-bold text-slate-500 px-2 py-1">Recent Chats</div>
          {conversations.length === 0 ? (
            <div className="text-center p-4 text-slate-500 text-[11px]">No conversations yet.</div>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                onClick={() => selectConversation(c.id)}
                className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs ${
                  currentConvoId === c.id
                    ? 'bg-purple-600/20 text-white border border-purple-500/40'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center space-x-2 truncate">
                  <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 text-slate-400 group-hover:text-purple-400" />
                  <span className="truncate">{c.title}</span>
                </div>
                <button
                  onClick={(e) => handleDeleteConversation(e, c.id)}
                  className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-1 rounded transition-opacity"
                  title="Delete chat"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Provider Connection Status */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40 text-[11px] flex items-center justify-between text-slate-400">
          <div className="flex items-center space-x-1.5">
            <div className={`w-2 h-2 rounded-full ${isOllamaOnline ? 'bg-emerald-400 animate-pulse' : 'bg-purple-400'}`} />
            <span>{isOllamaOnline ? 'Ollama Online' : 'BrowserOS Offline AI'}</span>
          </div>
          <button onClick={loadModels} title="Refresh Models" className="hover:text-white p-1">
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-900/60 backdrop-blur-sm">
        {/* Header Bar */}
        <div className="h-11 px-2.5 sm:px-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center space-x-2 min-w-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white flex-shrink-0"
              title="Toggle sidebar"
            >
              {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            <span className="font-medium text-slate-200 truncate text-xs">
              {currentConvoId
                ? conversations.find((c) => c.id === currentConvoId)?.title || 'Current Chat'
                : 'New Conversation'}
            </span>
          </div>

          {/* Model Selector Dropdown */}
          <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
            <span className="hidden sm:inline text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Model:</span>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-md px-1.5 sm:px-2 py-1 text-[11px] sm:text-xs text-purple-300 focus:outline-none focus:border-purple-500 max-w-[125px] sm:max-w-none truncate"
            >
              {models.map((m) => {
                const modelName = typeof m === 'string' ? m : m.name;
                const modelDesc = typeof m === 'object' && m.description ? `(${m.description})` : '';
                return (
                  <option key={modelName} value={modelName}>
                    {modelName} {modelDesc}
                  </option>
                );
              })}
              {models.length === 0 && (
                <option value="browseros-assistant-v1">browseros-assistant-v1 (Offline AI)</option>
              )}
            </select>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 text-slate-400">
              <div className="w-12 h-12 rounded-2xl bg-purple-600/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-lg shadow-purple-500/10">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="max-w-sm space-y-1">
                <h3 className="text-sm font-semibold text-white">How can I assist your workflow today?</h3>
                <p className="text-xs text-slate-500">
                  Ask me to write terminal commands, debug code, or attach files from your virtual filesystem for instant analysis.
                </p>
              </div>

              {/* Quick Prompt Suggestions */}
              <div className="grid grid-cols-2 gap-2 max-w-md w-full text-left pt-2">
                <button
                  onClick={() => setInputPrompt('How do I pipe virtual command output into a file using the Terminal?')}
                  className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white transition-colors text-[11px] flex items-start space-x-2"
                >
                  <Terminal className="w-3.5 h-3.5 text-purple-400 mt-0.5 flex-shrink-0" />
                  <span>Terminal output redirection</span>
                </button>
                <button
                  onClick={() => setInputPrompt('Can you write a TypeScript function to sort files by size?')}
                  className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white transition-colors text-[11px] flex items-start space-x-2"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
                  <span>TypeScript helper utility</span>
                </button>
              </div>
            </div>
          ) : (
            messages.map((m) => {
              const isUser = m.role === 'user';
              return (
                <div key={m.id} className={`flex items-start space-x-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                  {!isUser && (
                    <div className="w-7 h-7 rounded-lg bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 flex-shrink-0 mt-0.5">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`max-w-[85%] rounded-2xl p-3.5 ${
                    isUser
                      ? 'bg-purple-600 text-white rounded-br-sm shadow-md shadow-purple-900/30'
                      : 'bg-slate-800/80 border border-slate-700/70 text-slate-200 rounded-bl-sm shadow-sm'
                  }`}>
                    {/* Attached file context badge */}
                    {m.contextName && (
                      <div className="inline-flex items-center space-x-1 px-2 py-0.5 mb-2 rounded bg-black/30 border border-white/10 text-[10px] font-mono text-purple-200">
                        <Paperclip className="w-2.5 h-2.5" />
                        <span>Context: {m.contextName}</span>
                      </div>
                    )}

                    {renderMessageContent(m.content, m.id)}

                    <div className={`text-[9px] mt-1.5 text-right ${isUser ? 'text-purple-200/70' : 'text-slate-500'}`}>
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  {isUser && (
                    <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center text-slate-300 flex-shrink-0 text-xs font-semibold mt-0.5">
                      U
                    </div>
                  )}
                </div>
              );
            })
          )}

          {isLoading && (
            <div className="flex items-start space-x-3 justify-start">
              <div className="w-7 h-7 rounded-lg bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 flex-shrink-0 animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3.5 rounded-2xl rounded-bl-sm bg-slate-800/60 border border-slate-700/60 flex items-center space-x-2 text-slate-400 text-xs">
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="ml-1 text-[11px] text-slate-500">Generating reply...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80">
          {/* Active Context Attachment Pill */}
          {attachedFile && (
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 mb-2 rounded-lg bg-purple-600/20 border border-purple-500/40 text-purple-200 text-xs">
              <FileText className="w-3.5 h-3.5 text-purple-400" />
              <span className="font-mono text-[11px] truncate max-w-xs">{attachedFile.name}</span>
              <button
                onClick={() => setAttachedFile(null)}
                className="hover:text-white p-0.5 rounded transition-colors"
                title="Remove attached file"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          <div className="flex items-end space-x-2 bg-slate-900 border border-slate-700/80 focus-within:border-purple-500 rounded-xl px-3 py-2 transition-colors">
            <button
              onClick={openFilePicker}
              className="p-1.5 text-slate-400 hover:text-purple-300 hover:bg-slate-800 rounded-lg transition-colors flex-shrink-0"
              title="Attach virtual file from workspace"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <textarea
              ref={textareaRef}
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything or request coding help... (Enter to send, Shift+Enter for newline)"
              rows={1}
              className="flex-1 bg-transparent text-white text-xs resize-none focus:outline-none max-h-32 placeholder-slate-500 py-1"
            />

            <button
              onClick={handleSendMessage}
              disabled={isLoading || !inputPrompt.trim()}
              className="p-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:hover:bg-purple-600 text-white rounded-lg transition-colors flex-shrink-0"
              title="Send message"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* File Context Picker Modal */}
      {showFilePicker && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Paperclip className="w-4 h-4 text-purple-400" />
                <span className="font-semibold text-white">Attach Workspace File</span>
              </div>
              <button
                onClick={() => setShowFilePicker(false)}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 max-h-60 overflow-y-auto space-y-1">
              {availableFiles.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">No files found in virtual workspace.</div>
              ) : (
                availableFiles.map((f) => (
                  <div
                    key={f.id}
                    onClick={() => {
                      setAttachedFile(f);
                      setShowFilePicker(false);
                    }}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-purple-600/20 hover:border-purple-500/40 border border-transparent cursor-pointer transition-colors"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-200 truncate">{f.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {f.size < 1024 ? `${f.size} B` : `${(f.size / 1024).toFixed(1)} KB`}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-slate-800 bg-slate-950/40 flex justify-end">
              <button
                onClick={() => setShowFilePicker(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
