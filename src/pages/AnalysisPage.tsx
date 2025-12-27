import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import FeedbackDialog from '@/components/FeedbackDialog';
import { images } from '@/assets/images';
import { 
  getRecentBloodSugarRecords, 
  getUserPreferences, 
  getBehaviorPatterns, 
  getMemoryEvents,
  getFeedbackRecords,
  getMemoryStats 
} from '@/db/api';
import type { 
  BloodSugarRecord, 
  UserPreference, 
  BehaviorPattern, 
  MemoryEvent,
  FeedbackRecord 
} from '@/types/types';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  ReferenceLine
} from 'recharts';
import { 
  Brain, 
  Heart, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  AlertCircle,
  Sparkles,
  Target,
  Clock,
  Lightbulb,
  Star,
  Loader2
} from 'lucide-react';

export default function AnalysisPageNew() {
  const [bloodSugarRecords, setBloodSugarRecords] = useState<BloodSugarRecord[]>([]);
  const [preferences, setPreferences] = useState<UserPreference[]>([]);
  const [patterns, setPatterns] = useState<BehaviorPattern[]>([]);
  const [events, setEvents] = useState<MemoryEvent[]>([]);
  const [feedback, setFeedback] = useState<FeedbackRecord[]>([]);
  const [memoryStats, setMemoryStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // 反馈对话框状态
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackRecord | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    const [bsRecords, prefs, pats, evts, fb, stats] = await Promise.all([
      getRecentBloodSugarRecords(30),
      getUserPreferences(50),
      getBehaviorPatterns(50),
      getMemoryEvents(100),
      getFeedbackRecords(50),
      getMemoryStats(),
    ]);
    
    setBloodSugarRecords(bsRecords);
    setPreferences(prefs);
    setPatterns(pats);
    setEvents(evts);
    setFeedback(fb);
    setMemoryStats(stats);
    setLoading(false);
  };
  
  // 打开反馈对话框
  const handleOpenFeedback = (fb: FeedbackRecord) => {
    setSelectedFeedback(fb);
    setFeedbackDialogOpen(true);
  };
  
  // 反馈提交成功后刷新数据
  const handleFeedbackSuccess = () => {
    loadAllData();
  };

  // 计算血糖统计数据
  const bloodSugarStats = {
    average: bloodSugarRecords.length > 0 
      ? bloodSugarRecords.reduce((sum, r) => sum + r.value, 0) / bloodSugarRecords.length 
      : 0,
    max: bloodSugarRecords.length > 0 ? Math.max(...bloodSugarRecords.map(r => r.value)) : 0,
    min: bloodSugarRecords.length > 0 ? Math.min(...bloodSugarRecords.map(r => r.value)) : 0,
    count: bloodSugarRecords.length,
  };

  // 准备血糖图表数据
  const chartData = bloodSugarRecords
    .map(record => ({
      time: new Date(record.measured_at).toLocaleDateString('zh-CN', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      value: record.value,
      type: record.measurement_type,
    }))
    .reverse();

  // 计算趋势
  const getTrend = () => {
    if (bloodSugarRecords.length < 2) return 'stable';
    const recent = bloodSugarRecords.slice(0, Math.ceil(bloodSugarRecords.length / 2));
    const earlier = bloodSugarRecords.slice(Math.ceil(bloodSugarRecords.length / 2));
    const recentAvg = recent.reduce((sum, r) => sum + r.value, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, r) => sum + r.value, 0) / earlier.length;
    
    if (recentAvg > earlierAvg + 0.5) return 'up';
    if (recentAvg < earlierAvg - 0.5) return 'down';
    return 'stable';
  };

  const trend = getTrend();

  // 置信度颜色映射
  const confidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'from-green-400 to-emerald-500';
      case 'medium': return 'from-yellow-400 to-orange-500';
      case 'low': return 'from-gray-400 to-slate-500';
      default: return 'from-gray-400 to-slate-500';
    }
  };

  // 置信度文本
  const confidenceText = (confidence: string) => {
    switch (confidence) {
      case 'high': return '高';
      case 'medium': return '中';
      case 'low': return '低';
      default: return '未知';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full p-6 space-y-6">
      {/* 顶部标题 */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full overflow-hidden shadow-lg ring-2 ring-primary/20 animate-float">
          <img 
            src={images.drSugarAvatar} 
            alt="糖博士" 
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <h1 className="text-3xl font-bold gradient-text">我的健康报告</h1>
          <p className="text-muted-foreground">糖博士为您整理的健康数据</p>
        </div>
      </div>

      {/* 数据概览卡片 */}
      <div className="bento-grid">
        <Card className="glass-card bento-item-small">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              最近记录
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold gradient-text">{memoryStats?.events || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">条健康记录</p>
          </CardContent>
        </Card>

        <Card className="glass-card bento-item-small">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Heart className="w-4 h-4 text-secondary" />
              我的习惯
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold gradient-text">{memoryStats?.preferences || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">条生活习惯</p>
          </CardContent>
        </Card>

        <Card className="glass-card bento-item-small">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent-foreground" />
              健康规律
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold gradient-text">{memoryStats?.patterns || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">条发现的规律</p>
          </CardContent>
        </Card>
      </div>

      {/* 主要内容区域 - Tabs */}
      <Tabs defaultValue="blood-sugar" className="space-y-4">
        <TabsList className="glass-card">
          <TabsTrigger value="blood-sugar" className="rounded-3xl">
            <Activity className="w-4 h-4 mr-2" />
            血糖变化
          </TabsTrigger>
          <TabsTrigger value="preferences" className="rounded-3xl">
            <Heart className="w-4 h-4 mr-2" />
            我的习惯
          </TabsTrigger>
          <TabsTrigger value="patterns" className="rounded-3xl">
            <Target className="w-4 h-4 mr-2" />
            发现的规律
          </TabsTrigger>
          <TabsTrigger value="events" className="rounded-3xl">
            <Clock className="w-4 h-4 mr-2" />
            最近活动
          </TabsTrigger>
          <TabsTrigger value="feedback" className="rounded-3xl">
            <Lightbulb className="w-4 h-4 mr-2" />
            建议效果
          </TabsTrigger>
        </TabsList>

        {/* 血糖趋势 Tab */}
        <TabsContent value="blood-sugar" className="space-y-4">
          <div className="bento-grid">
            {/* 统计卡片 */}
            <Card className="glass-card bento-item-small">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">平均血糖</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{bloodSugarStats.average.toFixed(1)} mmol/L</div>
                <div className="flex items-center gap-1 mt-2">
                  {trend === 'up' && <TrendingUp className="w-4 h-4 text-red-500" />}
                  {trend === 'down' && <TrendingDown className="w-4 h-4 text-green-500" />}
                  {trend === 'stable' && <Activity className="w-4 h-4 text-blue-500" />}
                  <span className="text-xs text-muted-foreground">
                    {trend === 'up' && '上升趋势'}
                    {trend === 'down' && '下降趋势'}
                    {trend === 'stable' && '保持稳定'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card bento-item-small">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">最高值</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">{bloodSugarStats.max.toFixed(1)} mmol/L</div>
              </CardContent>
            </Card>

            <Card className="glass-card bento-item-small">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">最低值</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">{bloodSugarStats.min.toFixed(1)} mmol/L</div>
              </CardContent>
            </Card>
          </div>

          {/* 血糖趋势图 */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>30天血糖变化曲线</CardTitle>
              <CardDescription>共测量 {bloodSugarStats.count} 次</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="time" 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '1.5rem',
                    }}
                  />
                  <Legend />
                  <ReferenceLine y={7.0} stroke="hsl(var(--primary))" strokeDasharray="3 3" label="目标上限" />
                  <ReferenceLine y={3.9} stroke="hsl(var(--primary))" strokeDasharray="3 3" label="目标下限" />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--chart-1))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--chart-1))', r: 4 }}
                    name="血糖值 (mmol/L)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 个人偏好 Tab */}
        <TabsContent value="preferences" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-secondary" />
                我的生活习惯
              </CardTitle>
              <CardDescription>
                糖博士了解到的您的饮食偏好、过敏信息和生活习惯
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-3">
                  {preferences.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Heart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>还没有记录您的习惯</p>
                      <p className="text-sm mt-2">多和糖博士聊聊天，我会慢慢了解您</p>
                    </div>
                  ) : (
                    preferences.map((pref) => (
                      <Card key={pref.id} className="glass-card p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={`pill-tag bg-gradient-to-r ${
                                pref.preference_type === 'allergy' ? 'from-red-400 to-pink-500' :
                                pref.preference_type === 'dislike' ? 'from-orange-400 to-amber-500' :
                                pref.preference_type === 'habit' ? 'from-blue-400 to-cyan-500' :
                                'from-purple-400 to-indigo-500'
                              }`}>
                                {pref.preference_type === 'allergy' ? '过敏' :
                                 pref.preference_type === 'dislike' ? '不喜欢' :
                                 pref.preference_type === 'habit' ? '习惯' : '时间安排'}
                              </Badge>
                              <Badge className={`pill-tag bg-gradient-to-r ${confidenceColor(pref.confidence)}`}>
                                {pref.confidence === 'high' ? '很确定' :
                                 pref.confidence === 'medium' ? '比较确定' : '不太确定'}
                              </Badge>
                            </div>
                            <p className="text-sm">{pref.content}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span>来源: {pref.source === 'user_stated' ? '您告诉我的' : '我观察到的'}</span>
                              <span>更新: {new Date(pref.updated_at).toLocaleDateString('zh-CN')}</span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 行为模式 Tab */}
        <TabsContent value="patterns" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                糖博士发现的规律
              </CardTitle>
              <CardDescription>
                通过分析您的数据，发现的健康规律和食物反应
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-3">
                  {patterns.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>还没有发现规律</p>
                      <p className="text-sm mt-2">坚持记录数据，我会帮您找到健康规律</p>
                    </div>
                  ) : (
                    patterns.map((pattern) => (
                      <Card key={pattern.id} className="glass-card p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={`pill-tag bg-gradient-to-r ${
                                pattern.pattern_type === 'food_reaction' ? 'from-green-400 to-emerald-500' :
                                pattern.pattern_type === 'time_pattern' ? 'from-blue-400 to-cyan-500' :
                                'from-purple-400 to-indigo-500'
                              }`}>
                                {pattern.pattern_type === 'food_reaction' ? '食物反应' :
                                 pattern.pattern_type === 'time_pattern' ? '时间规律' : '运动影响'}
                              </Badge>
                              <Badge className={`pill-tag bg-gradient-to-r ${confidenceColor(pattern.confidence)}`}>
                                {pattern.confidence === 'high' ? '很确定' :
                                 pattern.confidence === 'medium' ? '比较确定' : '不太确定'}
                              </Badge>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Star className="w-3 h-3" />
                                <span>发现 {pattern.evidence_count} 次</span>
                              </div>
                            </div>
                            <p className="text-sm font-medium mb-1">{pattern.pattern_description}</p>
                            {pattern.last_observed_at && (
                              <p className="text-xs text-muted-foreground">
                                最后一次: {new Date(pattern.last_observed_at).toLocaleDateString('zh-CN')}
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 记忆事件 Tab */}
        <TabsContent value="events" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-accent-foreground" />
                最近的健康活动
              </CardTitle>
              <CardDescription>
                糖博士记录的最近100条健康数据
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-3">
                  {events.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>还没有活动记录</p>
                      <p className="text-sm mt-2">开始记录您的健康数据吧</p>
                    </div>
                  ) : (
                    events.map((event) => (
                      <Card key={event.id} className="glass-card p-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br ${
                            event.event_type === 'blood_sugar' ? 'from-red-400 to-pink-500' :
                            event.event_type === 'meal' ? 'from-green-400 to-emerald-500' :
                            event.event_type === 'exercise' ? 'from-blue-400 to-cyan-500' :
                            event.event_type === 'medication' ? 'from-purple-400 to-indigo-500' :
                            'from-yellow-400 to-orange-500'
                          }`}>
                            {event.event_type === 'blood_sugar' && <Activity className="w-5 h-5 text-white" />}
                            {event.event_type === 'meal' && <Heart className="w-5 h-5 text-white" />}
                            {event.event_type === 'exercise' && <TrendingUp className="w-5 h-5 text-white" />}
                            {event.event_type === 'medication' && <AlertCircle className="w-5 h-5 text-white" />}
                            {event.event_type === 'conversation' && <Brain className="w-5 h-5 text-white" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="pill-tag bg-gradient-to-r from-gray-400 to-slate-500">
                                {event.event_type === 'blood_sugar' ? '血糖' :
                                 event.event_type === 'meal' ? '饮食' :
                                 event.event_type === 'exercise' ? '运动' :
                                 event.event_type === 'medication' ? '用药' : '对话'}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                重要程度: {event.importance_score}/10
                              </span>
                            </div>
                            <p className="text-sm font-medium mb-1">{event.event_summary}</p>
                            {event.tags && event.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {event.tags.map((tag, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs rounded-full">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {new Date(event.event_time).toLocaleString('zh-CN')}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 反馈记录 Tab */}
        <TabsContent value="feedback" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                糖博士的建议效果
              </CardTitle>
              <CardDescription>
                记录建议的执行情况和效果，帮助糖博士更好地为您服务
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-3">
                  {feedback.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Lightbulb className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>还没有建议记录</p>
                      <p className="text-sm mt-2">试试糖博士的建议，记录效果吧</p>
                    </div>
                  ) : (
                    feedback.map((fb) => (
                      <Card key={fb.id} className="glass-card p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-medium flex-1">{fb.suggestion_content}</p>
                            <div className="flex items-center gap-2">
                              <Badge className={`pill-tag ${
                                fb.action_taken === null 
                                  ? 'bg-gradient-to-r from-blue-400 to-cyan-500'
                                  : fb.action_taken 
                                    ? 'bg-gradient-to-r from-green-400 to-emerald-500' 
                                    : 'bg-gradient-to-r from-gray-400 to-slate-500'
                              }`}>
                                {fb.action_taken === null ? '待反馈' : fb.action_taken ? '已执行' : '未执行'}
                              </Badge>
                              {fb.action_taken === null && (
                                <Button
                                  size="sm"
                                  onClick={() => handleOpenFeedback(fb)}
                                  className="rounded-3xl"
                                >
                                  提供反馈
                                </Button>
                              )}
                            </div>
                          </div>
                          
                          {fb.action_taken && fb.outcome_description && (
                            <div className="bg-muted/50 rounded-2xl p-3 text-sm">
                              <p className="font-medium mb-1">执行结果:</p>
                              <p>{fb.outcome_description}</p>
                            </div>
                          )}
                          
                          {fb.blood_sugar_before && fb.blood_sugar_after && (
                            <div className="flex items-center gap-4 text-sm">
                              <span>执行前: <strong>{fb.blood_sugar_before}</strong> mmol/L</span>
                              <span>→</span>
                              <span>执行后: <strong>{fb.blood_sugar_after}</strong> mmol/L</span>
                              <span className={`font-medium ${
                                fb.blood_sugar_after < fb.blood_sugar_before 
                                  ? 'text-green-500' 
                                  : fb.blood_sugar_after > fb.blood_sugar_before
                                    ? 'text-red-500'
                                    : 'text-muted-foreground'
                              }`}>
                                {fb.blood_sugar_after < fb.blood_sugar_before 
                                  ? `↓ ${(fb.blood_sugar_before - fb.blood_sugar_after).toFixed(1)}`
                                  : fb.blood_sugar_after > fb.blood_sugar_before
                                    ? `↑ ${(fb.blood_sugar_after - fb.blood_sugar_before).toFixed(1)}`
                                    : '持平'}
                              </span>
                              {fb.effectiveness_score && (
                                <Badge className="pill-tag bg-gradient-to-r from-yellow-400 to-orange-500">
                                  效果评分: {fb.effectiveness_score}/10
                                </Badge>
                              )}
                            </div>
                          )}
                          
                          <p className="text-xs text-muted-foreground">
                            {new Date(fb.created_at).toLocaleString('zh-CN')}
                          </p>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* 反馈对话框 */}
      {selectedFeedback && (
        <FeedbackDialog
          open={feedbackDialogOpen}
          onOpenChange={setFeedbackDialogOpen}
          feedbackId={selectedFeedback.id}
          suggestionContent={selectedFeedback.suggestion_content}
          onSuccess={handleFeedbackSuccess}
        />
      )}
    </div>
  );
}
