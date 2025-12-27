import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/db/supabase';
import type { AgentLog } from '@/types/types';
import { Activity, Brain, Database, TrendingUp, Users, Clock, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPage() {
  const { profile } = useAuth();
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCalls: 0,
    successRate: 0,
    avgProcessingTime: 0,
    agentUsage: {} as Record<string, number>,
    dataRecorded: {
      blood_sugar: 0,
      meal: 0,
      exercise: 0,
    },
  });

  useEffect(() => {
    if (profile?.role === 'admin') {
      loadLogs();
      loadStats();
    }
  }, [profile]);

  const loadLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('agent_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('加载日志失败:', error);
      toast.error('加载日志失败');
    } else {
      setLogs(data || []);
    }
    setLoading(false);
  };

  const loadStats = async () => {
    const { data, error } = await supabase
      .from('agent_logs')
      .select('*');

    if (error) {
      console.error('加载统计失败:', error);
      return;
    }

    if (!data || data.length === 0) return;

    // 计算统计数据
    const totalCalls = data.length;
    const successCount = data.filter(log => log.status === 'success').length;
    const successRate = (successCount / totalCalls) * 100;
    
    const totalProcessingTime = data.reduce((sum, log) => sum + (log.processing_time_ms || 0), 0);
    const avgProcessingTime = totalProcessingTime / totalCalls;

    // Agent使用统计
    const agentUsage: Record<string, number> = {};
    data.forEach(log => {
      log.agents_involved.forEach((agent: string) => {
        agentUsage[agent] = (agentUsage[agent] || 0) + 1;
      });
    });

    // 数据记录统计
    const dataRecorded = {
      blood_sugar: data.reduce((sum, log) => sum + (log.data_recorded?.blood_sugar || 0), 0),
      meal: data.reduce((sum, log) => sum + (log.data_recorded?.meal || 0), 0),
      exercise: data.reduce((sum, log) => sum + (log.data_recorded?.exercise || 0), 0),
    };

    setStats({
      totalCalls,
      successRate,
      avgProcessingTime,
      agentUsage,
      dataRecorded,
    });
  };

  const getAgentLabel = (agent: string) => {
    const labels: Record<string, string> = {
      coordinator: '对话协调',
      data_recorder: '数据记录',
      analyzer: '即时分析',
      educator: '教育科普',
      motivator: '激励支持',
    };
    return labels[agent] || agent;
  };

  const getAgentColor = (agent: string) => {
    const colors: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      coordinator: 'default',
      data_recorder: 'secondary',
      analyzer: 'outline',
      educator: 'default',
      motivator: 'secondary',
    };
    return colors[agent] || 'outline';
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="container mx-auto p-4 xl:p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">您没有权限访问此页面</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 xl:p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl xl:text-3xl font-bold text-foreground flex items-center gap-2">
          <Activity className="w-6 h-6 xl:w-8 xl:h-8" />
          Agent监控后台
        </h1>
        <p className="text-muted-foreground mt-2">
          多Agent系统工作流程和调用情况监控
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 xl:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总调用次数</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCalls}</div>
            <p className="text-xs text-muted-foreground">
              成功率: {stats.successRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均处理时间</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgProcessingTime.toFixed(0)}ms</div>
            <p className="text-xs text-muted-foreground">
              Memory Update处理
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">数据记录</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.dataRecorded.blood_sugar + stats.dataRecorded.meal + stats.dataRecorded.exercise}
            </div>
            <p className="text-xs text-muted-foreground">
              血糖 {stats.dataRecorded.blood_sugar} | 饮食 {stats.dataRecorded.meal} | 运动 {stats.dataRecorded.exercise}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">最活跃Agent</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(stats.agentUsage).length > 0
                ? getAgentLabel(Object.entries(stats.agentUsage).sort((a, b) => b[1] - a[1])[0][0])
                : '-'}
            </div>
            <p className="text-xs text-muted-foreground">
              {Object.keys(stats.agentUsage).length} 个Agent协同工作
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="logs">调用日志</TabsTrigger>
          <TabsTrigger value="agents">Agent统计</TabsTrigger>
          <TabsTrigger value="workflow">工作流分析</TabsTrigger>
        </TabsList>

        {/* 调用日志 */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>最近调用日志</CardTitle>
              <CardDescription>
                显示最近100条Agent调用记录
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center py-8 text-muted-foreground">加载中...</p>
              ) : logs.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">暂无日志数据</p>
              ) : (
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {logs.map((log) => (
                      <div key={log.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {log.status === 'success' ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-500" />
                              )}
                              <span className="text-sm text-muted-foreground">
                                {new Date(log.created_at).toLocaleString('zh-CN')}
                              </span>
                              {log.processing_time_ms && (
                                <Badge variant="outline" className="text-xs">
                                  {log.processing_time_ms}ms
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm font-medium mb-2">
                              用户: {log.user_message}
                            </p>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              AI: {log.ai_response?.substring(0, 200)}...
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span className="text-xs text-muted-foreground">涉及Agent:</span>
                          {log.agents_involved.map((agent) => (
                            <Badge key={agent} variant={getAgentColor(agent)}>
                              {getAgentLabel(agent)}
                            </Badge>
                          ))}
                        </div>

                        {(log.memory_updates?.events || log.memory_updates?.patterns || log.memory_updates?.preferences) && (
                          <div className="flex flex-wrap gap-2 text-xs">
                            {log.memory_updates.events > 0 && (
                              <span className="text-muted-foreground">
                                事件: {log.memory_updates.events}
                              </span>
                            )}
                            {log.memory_updates.patterns > 0 && (
                              <span className="text-muted-foreground">
                                模式: {log.memory_updates.patterns}
                              </span>
                            )}
                            {log.memory_updates.preferences > 0 && (
                              <span className="text-muted-foreground">
                                偏好: {log.memory_updates.preferences}
                              </span>
                            )}
                          </div>
                        )}

                        {(log.data_recorded?.blood_sugar || log.data_recorded?.meal || log.data_recorded?.exercise) && (
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="text-muted-foreground">数据记录:</span>
                            {log.data_recorded.blood_sugar > 0 && (
                              <Badge variant="secondary">血糖 {log.data_recorded.blood_sugar}</Badge>
                            )}
                            {log.data_recorded.meal > 0 && (
                              <Badge variant="secondary">饮食 {log.data_recorded.meal}</Badge>
                            )}
                            {log.data_recorded.exercise > 0 && (
                              <Badge variant="secondary">运动 {log.data_recorded.exercise}</Badge>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Agent统计 */}
        <TabsContent value="agents">
          <Card>
            <CardHeader>
              <CardTitle>Agent调用统计</CardTitle>
              <CardDescription>
                各Agent的调用频率和工作负载
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(stats.agentUsage)
                  .sort((a, b) => b[1] - a[1])
                  .map(([agent, count]) => (
                    <div key={agent} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Brain className="w-5 h-5 text-primary" />
                        <div>
                          <p className="font-medium">{getAgentLabel(agent)}</p>
                          <p className="text-sm text-muted-foreground">
                            调用次数: {count}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{count}</p>
                        <p className="text-xs text-muted-foreground">
                          {((count / stats.totalCalls) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 工作流分析 */}
        <TabsContent value="workflow">
          <Card>
            <CardHeader>
              <CardTitle>多Agent协同工作流</CardTitle>
              <CardDescription>
                分析Agent之间的协作模式
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-6 border rounded-lg bg-muted/50">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    典型工作流程
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Badge>1</Badge>
                      <span className="text-sm">对话协调Agent接收用户输入</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge>2</Badge>
                      <span className="text-sm">数据记录Agent提取结构化数据</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge>3</Badge>
                      <span className="text-sm">即时分析Agent分析历史趋势</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge>4</Badge>
                      <span className="text-sm">教育科普Agent提供知识解释</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge>5</Badge>
                      <span className="text-sm">激励支持Agent给予情感支持</span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Memory Update处理</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      AI自动提取事件、模式、偏好并更新记忆系统
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>事件提取</span>
                        <span className="font-medium">{logs.reduce((sum, log) => sum + (log.memory_updates?.events || 0), 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>模式识别</span>
                        <span className="font-medium">{logs.reduce((sum, log) => sum + (log.memory_updates?.patterns || 0), 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>偏好记录</span>
                        <span className="font-medium">{logs.reduce((sum, log) => sum + (log.memory_updates?.preferences || 0), 0)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">数据记录效率</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      自动识别并记录用户的健康数据
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>血糖记录</span>
                        <span className="font-medium">{stats.dataRecorded.blood_sugar}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>饮食记录</span>
                        <span className="font-medium">{stats.dataRecorded.meal}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>运动记录</span>
                        <span className="font-medium">{stats.dataRecorded.exercise}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
