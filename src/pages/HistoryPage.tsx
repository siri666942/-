import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getChatMessagesByDate, getChatDates } from '@/db/api';
import { images } from '@/assets/images';
import { Calendar as CalendarIcon, MessageSquare, User, Bot, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export default function HistoryPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatDates, setChatDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // 加载有聊天记录的日期
  useEffect(() => {
    loadChatDates();
  }, []);

  // 当选择日期变化时，加载该日期的聊天记录
  useEffect(() => {
    loadMessages();
  }, [selectedDate]);

  const loadChatDates = async () => {
    const dates = await getChatDates();
    setChatDates(dates);
  };

  const loadMessages = async () => {
    setLoading(true);
    const data = await getChatMessagesByDate(selectedDate);
    setMessages(data);
    setLoading(false);
  };

  // 判断某个日期是否有聊天记录
  const hasChat = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return chatDates.includes(dateStr);
  };

  return (
    <div className="container mx-auto p-4 xl:p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">历史聊天记录</h1>
          <p className="text-muted-foreground mt-2">查看您与糖博士的历史对话</p>
        </div>
        
        {/* 日期选择器 */}
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="rounded-3xl">
              <CalendarIcon className="w-4 h-4 mr-2" />
              {format(selectedDate, 'yyyy年MM月dd日', { locale: zhCN })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 glass-card" align="end">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (date) {
                  setSelectedDate(date);
                  setCalendarOpen(false);
                }
              }}
              locale={zhCN}
              modifiers={{
                hasChat: (date) => hasChat(date),
              }}
              modifiersStyles={{
                hasChat: {
                  fontWeight: 'bold',
                  textDecoration: 'underline',
                  color: 'hsl(var(--primary))',
                },
              }}
            />
            <div className="p-3 border-t text-xs text-muted-foreground">
              <p>带下划线的日期有聊天记录</p>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* 聊天记录卡片 */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            {format(selectedDate, 'yyyy年MM月dd日', { locale: zhCN })} 的对话
          </CardTitle>
          <CardDescription>
            {messages.length > 0 
              ? `共 ${messages.length} 条消息` 
              : '当天没有聊天记录'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">加载中...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>当天没有聊天记录</p>
              <p className="text-sm mt-2">选择其他日期查看历史对话</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-primary/20">
                        <img 
                          src={images.drSugarAvatar} 
                          alt="糖博士" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    
                    <div
                      className={`max-w-[70%] rounded-3xl px-4 py-3 ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground'
                          : 'glass-card'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {msg.role === 'user' ? (
                          <User className="w-3 h-3" />
                        ) : (
                          <Bot className="w-3 h-3" />
                        )}
                        <span className="text-xs opacity-70">
                          {format(new Date(msg.created_at), 'HH:mm:ss')}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {msg.content}
                      </p>
                    </div>
                    
                    {msg.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
