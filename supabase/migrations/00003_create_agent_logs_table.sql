-- 创建Agent调用日志表
CREATE TABLE IF NOT EXISTS agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  user_message TEXT NOT NULL,
  ai_response TEXT,
  agents_involved TEXT[] DEFAULT '{}',
  memory_updates JSONB DEFAULT '{}',
  data_recorded JSONB DEFAULT '{}',
  processing_time_ms INTEGER,
  status TEXT DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_agent_logs_user_id ON agent_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_session_id ON agent_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created_at ON agent_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_logs_status ON agent_logs(status);

-- RLS策略
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;

-- 管理员可以查看所有日志
CREATE POLICY "管理员可以查看所有Agent日志" ON agent_logs
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

-- 用户可以查看自己的日志
CREATE POLICY "用户可以查看自己的Agent日志" ON agent_logs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 系统可以插入日志（通过service role）
CREATE POLICY "系统可以插入Agent日志" ON agent_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

COMMENT ON TABLE agent_logs IS 'Agent调用日志表，记录每次对话的Agent工作流程';
COMMENT ON COLUMN agent_logs.agents_involved IS '参与的Agent列表：coordinator, data_recorder, analyzer, educator, motivator';
COMMENT ON COLUMN agent_logs.memory_updates IS 'Memory Update处理结果：events, patterns, preferences, profile';
COMMENT ON COLUMN agent_logs.data_recorded IS '记录的数据：blood_sugar, meal, exercise等';
