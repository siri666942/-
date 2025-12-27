import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getRecentBloodSugarRecords } from '@/db/api';
import type { BloodSugarRecord } from '@/types/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Activity, AlertCircle } from 'lucide-react';

export default function AnalysisPage() {
  const [records, setRecords] = useState<BloodSugarRecord[]>([]);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [days]);

  const loadData = async () => {
    setLoading(true);
    const data = await getRecentBloodSugarRecords(days);
    setRecords(data);
    setLoading(false);
  };

  // 计算统计数据
  const stats = {
    average: records.length > 0 ? records.reduce((sum, r) => sum + r.value, 0) / records.length : 0,
    max: records.length > 0 ? Math.max(...records.map(r => r.value)) : 0,
    min: records.length > 0 ? Math.min(...records.map(r => r.value)) : 0,
    count: records.length,
  };

  // 准备图表数据
  const chartData = records.map(record => ({
    time: new Date(record.measured_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    value: record.value,
    type: record.measurement_type,
  })).reverse();

  // 计算趋势
  const getTrend = () => {
    if (records.length < 2) return 'stable';
    const recent = records.slice(0, Math.ceil(records.length / 2));
    const earlier = records.slice(Math.ceil(records.length / 2));
    const recentAvg = recent.reduce((sum, r) => sum + r.value, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, r) => sum + r.value, 0) / earlier.length;
    
    if (recentAvg > earlierAvg + 0.5) return 'up';
    if (recentAvg < earlierAvg - 0.5) return 'down';
    return 'stable';
  };

  const trend = getTrend();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">数据分析</h1>
          <p className="text-muted-foreground mt-2">
            查看您的血糖趋势和统计数据
          </p>
        </div>
        <Select value={days.toString()} onValueChange={(v) => setDays(parseInt(v))}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">最近7天</SelectItem>
            <SelectItem value="14">最近14天</SelectItem>
            <SelectItem value="30">最近30天</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均血糖</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.average > 0 ? stats.average.toFixed(1) : '-'} mmol/L
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              基于 {stats.count} 次测量
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">最高值</CardTitle>
            <TrendingUp className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {stats.max > 0 ? stats.max.toFixed(1) : '-'} mmol/L
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              需要注意控制
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">最低值</CardTitle>
            <TrendingDown className="h-4 w-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-chart-2">
              {stats.min > 0 ? stats.min.toFixed(1) : '-'} mmol/L
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              保持良好状态
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">趋势</CardTitle>
            {trend === 'up' && <TrendingUp className="h-4 w-4 text-chart-3" />}
            {trend === 'down' && <TrendingDown className="h-4 w-4 text-chart-2" />}
            {trend === 'stable' && <Activity className="h-4 w-4 text-primary" />}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {trend === 'up' && '上升'}
              {trend === 'down' && '下降'}
              {trend === 'stable' && '平稳'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {trend === 'up' && '需要加强控制'}
              {trend === 'down' && '控制效果良好'}
              {trend === 'stable' && '保持当前状态'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 趋势图表 */}
      <Card>
        <CardHeader>
          <CardTitle>血糖趋势图</CardTitle>
          <CardDescription>
            查看您的血糖变化趋势
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              加载中...
            </div>
          ) : records.length === 0 ? (
            <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
              <AlertCircle className="w-12 h-12 mb-4" />
              <p>暂无数据</p>
              <p className="text-sm mt-2">请先添加血糖记录</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  label={{ value: 'mmol/L', angle: -90, position: 'insideLeft' }}
                  domain={[0, 'auto']}
                />
                <Tooltip />
                <Legend />
                <ReferenceLine y={7.0} stroke="hsl(var(--chart-3))" strokeDasharray="3 3" label="空腹上限" />
                <ReferenceLine y={11.1} stroke="hsl(var(--destructive))" strokeDasharray="3 3" label="餐后上限" />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                  name="血糖值"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* 健康建议 */}
      <Card>
        <CardHeader>
          <CardTitle>健康建议</CardTitle>
          <CardDescription>
            基于您的数据分析
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {stats.average > 7.0 && (
            <div className="flex gap-3 p-4 bg-chart-3/10 rounded-lg">
              <AlertCircle className="w-5 h-5 text-chart-3 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">平均血糖偏高</p>
                <p className="text-sm text-muted-foreground mt-1">
                  建议调整饮食结构，增加运动量，必要时咨询医生调整用药方案
                </p>
              </div>
            </div>
          )}
          
          {stats.max > 11.1 && (
            <div className="flex gap-3 p-4 bg-destructive/10 rounded-lg">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">出现高血糖</p>
                <p className="text-sm text-muted-foreground mt-1">
                  餐后血糖超过11.1 mmol/L，建议控制碳水化合物摄入，餐后适当运动
                </p>
              </div>
            </div>
          )}

          {stats.average >= 4.0 && stats.average <= 7.0 && stats.max <= 11.1 && (
            <div className="flex gap-3 p-4 bg-chart-2/10 rounded-lg">
              <Activity className="w-5 h-5 text-chart-2 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">血糖控制良好</p>
                <p className="text-sm text-muted-foreground mt-1">
                  您的血糖控制在理想范围内，请继续保持良好的生活习惯
                </p>
              </div>
            </div>
          )}

          {records.length < 5 && (
            <div className="flex gap-3 p-4 bg-primary/10 rounded-lg">
              <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">数据不足</p>
                <p className="text-sm text-muted-foreground mt-1">
                  建议定期监测血糖，积累更多数据以获得更准确的分析结果
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
