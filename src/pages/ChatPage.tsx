import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import AnalyzingAnimation from '@/components/ui/AnalyzingAnimation';
import { sendStreamRequest } from '@/utils/stream';
import { createChatMessage, getChatMessages, clearChatHistory } from '@/db/api';
import { images } from '@/assets/images';
import { Streamdown } from 'streamdown';
import { Send, Trash2, Loader2, Bot, User } from 'lucide-react';
import { toast } from 'sonner';
import type { ChatMessage } from '@/types/types';

export default function ChatPage() {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false); // 分析动画状态
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingContentRef = useRef<string>(''); // 用ref保存流式内容

  // 加载历史消息
  useEffect(() => {
    loadMessages();
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingContent]);

  const loadMessages = async () => {
    setLoading(true);
    const history = await getChatMessages(100);
    // 过滤掉包含欢迎语的初始消息
    const filteredHistory = history.filter(msg => {
      if (msg.role === 'assistant') {
        const content = msg.content.toLowerCase();
        // 过滤掉包含欢迎语的消息
        if (content.includes('您好') && content.includes('我是您的') && content.includes('血糖健康管理助手')) {
          return false;
        }
      }
      return true;
    });
    setMessages(filteredHistory);
    setLoading(false);
  };

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage = input.trim();
    setInput('');

    // 保存用户消息到数据库
    const savedUserMsg = await createChatMessage({
      role: 'user',
      content: userMessage,
    });

    if (savedUserMsg) {
      setMessages(prev => [...prev, savedUserMsg]);
    }

    // 准备对话上下文
    const contextMessages = messages.slice(-10).map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
    contextMessages.push({ role: 'user', content: userMessage });

    // 显示分析动画（2秒）
    setIsAnalyzing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsAnalyzing(false);

    // 开始流式请求
    setIsStreaming(true);
    setStreamingContent('');
    streamingContentRef.current = ''; // 重置ref
    abortControllerRef.current = new AbortController();

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    await sendStreamRequest({
      functionUrl: `${supabaseUrl}/functions/v1/chat`,
      requestBody: {
        messages: contextMessages,
        userId: user?.id,
      },
      supabaseAnonKey,
      onData: (data) => {
        try {
          const parsed = JSON.parse(data);
          const chunk = parsed.content || '';
          streamingContentRef.current += chunk; // 更新ref
          setStreamingContent(prev => prev + chunk);
        } catch (e) {
          console.warn('解析数据失败:', e);
        }
      },
      onComplete: async () => {
        // 使用ref中保存的完整内容
        const finalContent = streamingContentRef.current;
        
        setIsStreaming(false);
        setStreamingContent('');
        streamingContentRef.current = '';
        
        // 保存助手回复到数据库
        if (finalContent) {
          const savedAssistantMsg = await createChatMessage({
            role: 'assistant',
            content: finalContent,
            agent_type: 'coordinator',
          });

          if (savedAssistantMsg) {
            setMessages(prev => [...prev, savedAssistantMsg]);
          }
        }
      },
      onError: (error) => {
        console.error('对话请求失败:', error);
        toast.error('对话请求失败，请重试');
        setIsStreaming(false);
        setStreamingContent('');
      },
      signal: abortControllerRef.current.signal,
    });
  };

  const handleClearHistory = async () => {
    if (!confirm('确定要清空所有对话历史吗？')) return;

    const success = await clearChatHistory();
    if (success) {
      setMessages([]);
      toast.success('对话历史已清空');
    } else {
      toast.error('清空失败，请重试');
    }
  };

  // 过滤消息内容，移除MEMORY_UPDATE标记和JSON部分
  const filterMessageContent = (content: string): string => {
    // 移除 ---MEMORY_UPDATE--- 标记及其后面的所有内容
    const memoryUpdateIndex = content.indexOf('---MEMORY_UPDATE---');
    if (memoryUpdateIndex !== -1) {
      content = content.substring(0, memoryUpdateIndex);
    }
    
    // 移除可能的JSON代码块（通常在```json和```之间）
    content = content.replace(/```json\s*\n[\s\S]*?\n```/g, '');
    
    // 移除独立的JSON对象（以{开头，}结尾的多行内容）
    content = content.replace(/\n\s*\{[\s\S]*?\}\s*$/g, '');
    
    // 清理多余的空行
    content = content.replace(/\n{3,}/g, '\n\n').trim();
    
    return content;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 顶部工具栏 - 毛玻璃效果 */}
      <div className="flex items-center justify-between p-4 border-b glass-card border-white/30">
        <div className="flex items-center gap-4">
          {/* 3D医生形象 */}
          <div className="w-16 h-16 rounded-full overflow-hidden shadow-lg ring-2 ring-primary/20 animate-float">
            <img 
              src={images.drSugarAvatar} 
              alt="糖博士" 
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold gradient-text">糖博士</h1>
            <p className="text-sm text-muted-foreground">Dr. Sugar</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearHistory}
          disabled={messages.length === 0}
          className="rounded-3xl"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          清空历史
        </Button>
      </div>
      {/* 对话区域 */}
      <ScrollArea className="flex-1 p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 space-y-6">
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center animate-pulse-soft">
                <Bot className="w-12 h-12 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold gradient-text mb-2">开始您的健康管理之旅</h2>
                <p className="text-muted-foreground">
                  您可以告诉我您的血糖数据、饮食情况、运动记录，<br />
                  或者询问任何关于血糖管理的问题
                </p>
              </div>
              <div className="flex flex-wrap gap-3 justify-center max-w-2xl mx-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInput('我刚测了血糖，空腹7.2')}
                  className="rounded-3xl"
                >
                  记录血糖数据
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInput('什么是GI值？')}
                  className="rounded-3xl"
                >
                  了解健康知识
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInput('我最近的血糖控制得怎么样？')}
                  className="rounded-3xl"
                >
                  查看数据分析
                </Button>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <Avatar className="w-10 h-10 ring-2 ring-primary/20">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent">
                      <Bot className="w-5 h-5 text-white" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <Card
                  className={`max-w-[80%] p-4 rounded-3xl ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-primary to-accent text-white shadow-lg'
                      : 'glass-card'
                  }`}
                >
                  <Streamdown
                    parseIncompleteMarkdown={false}
                    isAnimating={false}
                  >
                    {msg.role === 'assistant' ? filterMessageContent(msg.content) : msg.content}
                  </Streamdown>
                </Card>
                {msg.role === 'user' && (
                  <Avatar className="w-10 h-10 ring-2 ring-primary/20">
                    <AvatarFallback className="bg-gradient-to-br from-secondary to-accent">
                      <User className="w-5 h-5 text-white" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))
          )}

          {/* 分析动画 */}
          {isAnalyzing && (
            <div className="flex gap-3 justify-start">
              <Avatar className="w-10 h-10 ring-2 ring-primary/20">
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent">
                  <Bot className="w-5 h-5 text-white" />
                </AvatarFallback>
              </Avatar>
              <Card className="max-w-[80%] p-4 rounded-3xl glass-card">
                <AnalyzingAnimation />
              </Card>
            </div>
          )}

          {/* 流式输出中的消息 */}
          {isStreaming && streamingContent && (
            <div className="flex gap-3 justify-start">
              <Avatar className="w-10 h-10 ring-2 ring-primary/20">
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent">
                  <Bot className="w-5 h-5 text-white" />
                </AvatarFallback>
              </Avatar>
              <Card className="max-w-[80%] p-4 rounded-3xl glass-card">
                <Streamdown
                  parseIncompleteMarkdown={true}
                  isAnimating={true}
                >
                  {filterMessageContent(streamingContent)}
                </Streamdown>
              </Card>
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </ScrollArea>
      
      {/* 输入区域 - 柔软枕头设计 */}
      <div className="border-t glass-card border-white/30 p-4">
        <div className="max-w-4xl mx-auto flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="对话内容已开启隐私保护"
            className="soft-input min-h-[60px] max-h-[200px] resize-none"
            disabled={isStreaming}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            size="lg"
            className="soft-button px-6"
          >
            {isStreaming ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
