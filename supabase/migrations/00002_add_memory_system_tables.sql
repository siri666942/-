-- 扩展用户档案表，添加健康档案字段
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS diabetes_type TEXT, -- 糖尿病类型：type1, type2, prediabetes
ADD COLUMN IF NOT EXISTS medication TEXT, -- 当前用药
ADD COLUMN IF NOT EXISTS target_blood_sugar_min DECIMAL(5,2) DEFAULT 4.0, -- 目标血糖下限
ADD COLUMN IF NOT EXISTS target_blood_sugar_max DECIMAL(5,2) DEFAULT 7.0, -- 目标血糖上限
ADD COLUMN IF NOT EXISTS health_notes TEXT; -- 其他健康备注

-- 创建用户偏好与禁忌表
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  preference_type TEXT NOT NULL, -- 类型：allergy(过敏), dislike(不喜欢), habit(习惯), schedule(日程)
  content TEXT NOT NULL, -- 具体内容
  confidence TEXT DEFAULT 'high', -- 置信度：high, medium, low
  source TEXT, -- 来源：user_stated(用户明确说明), inferred(系统推断)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_preferences_user ON public.user_preferences(user_id);
CREATE INDEX idx_user_preferences_type ON public.user_preferences(user_id, preference_type);

-- 创建行为模式表
CREATE TABLE IF NOT EXISTS public.behavior_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL, -- 类型：food_reaction(食物反应), time_pattern(时间规律), activity_impact(活动影响)
  pattern_description TEXT NOT NULL, -- 模式描述
  pattern_data JSONB, -- 模式相关数据
  confidence TEXT DEFAULT 'medium', -- 置信度：high, medium, low
  evidence_count INTEGER DEFAULT 1, -- 支持证据数量
  last_observed_at TIMESTAMPTZ, -- 最后观察时间
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_behavior_patterns_user ON public.behavior_patterns(user_id);
CREATE INDEX idx_behavior_patterns_type ON public.behavior_patterns(user_id, pattern_type);

-- 创建反馈记录表
CREATE TABLE IF NOT EXISTS public.feedback_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  suggestion_content TEXT NOT NULL, -- 建议内容
  action_taken BOOLEAN, -- 是否采纳
  outcome_description TEXT, -- 结果描述
  blood_sugar_before DECIMAL(5,2), -- 建议前血糖
  blood_sugar_after DECIMAL(5,2), -- 建议后血糖
  effectiveness_score INTEGER, -- 有效性评分 1-5
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_feedback_records_user ON public.feedback_records(user_id);
CREATE INDEX idx_feedback_records_effectiveness ON public.feedback_records(user_id, effectiveness_score);

-- 创建记忆事件表（用于快速检索和RAG）
CREATE TABLE IF NOT EXISTS public.memory_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 事件类型：blood_sugar, meal, exercise, medication, conversation
  event_summary TEXT NOT NULL, -- 事件摘要（用于语义搜索）
  event_data JSONB NOT NULL, -- 事件详细数据
  context TEXT, -- 当时的对话上下文
  tags TEXT[], -- 标签（用于快速过滤）
  importance_score INTEGER DEFAULT 5, -- 重要性评分 1-10
  event_time TIMESTAMPTZ NOT NULL, -- 事件发生时间
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_memory_events_user_time ON public.memory_events(user_id, event_time DESC);
CREATE INDEX idx_memory_events_type ON public.memory_events(user_id, event_type);
CREATE INDEX idx_memory_events_tags ON public.memory_events USING GIN(tags);

-- 设置RLS策略
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavior_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_events ENABLE ROW LEVEL SECURITY;

-- user_preferences 策略
CREATE POLICY "用户可以查看自己的偏好" ON user_preferences
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "用户可以插入自己的偏好" ON user_preferences
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以更新自己的偏好" ON user_preferences
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "用户可以删除自己的偏好" ON user_preferences
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- behavior_patterns 策略
CREATE POLICY "用户可以查看自己的行为模式" ON behavior_patterns
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "用户可以插入自己的行为模式" ON behavior_patterns
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以更新自己的行为模式" ON behavior_patterns
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "用户可以删除自己的行为模式" ON behavior_patterns
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- feedback_records 策略
CREATE POLICY "用户可以查看自己的反馈记录" ON feedback_records
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "用户可以插入自己的反馈记录" ON feedback_records
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- memory_events 策略
CREATE POLICY "用户可以查看自己的记忆事件" ON memory_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "用户可以插入自己的记忆事件" ON memory_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以删除自己的记忆事件" ON memory_events
  FOR DELETE TO authenticated USING (auth.uid() = user_id);