-- 创建用户角色枚举
CREATE TYPE public.user_role AS ENUM ('user', 'admin');

-- 创建用户配置表
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT,
  role public.user_role NOT NULL DEFAULT 'user',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建血糖记录表
CREATE TABLE public.blood_sugar_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  value DECIMAL(5,2) NOT NULL, -- 血糖值
  measured_at TIMESTAMPTZ NOT NULL, -- 测量时间
  measurement_type TEXT NOT NULL, -- 测量类型：fasting(空腹), before_meal(餐前), after_meal(餐后), bedtime(睡前), random(随机)
  notes TEXT, -- 备注
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建饮食记录表
CREATE TABLE public.meal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  meal_type TEXT NOT NULL, -- 餐次：breakfast(早餐), lunch(午餐), dinner(晚餐), snack(加餐)
  food_items TEXT NOT NULL, -- 食物内容
  meal_time TIMESTAMPTZ NOT NULL, -- 用餐时间
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建运动记录表
CREATE TABLE public.exercise_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exercise_type TEXT NOT NULL, -- 运动类型
  duration_minutes INTEGER NOT NULL, -- 运动时长（分钟）
  intensity TEXT, -- 强度：light(轻度), moderate(中度), vigorous(剧烈)
  exercise_time TIMESTAMPTZ NOT NULL, -- 运动时间
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建对话历史表
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- user 或 assistant
  content TEXT NOT NULL,
  agent_type TEXT, -- 对于assistant消息，标记是哪个agent回复的
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_blood_sugar_user_time ON public.blood_sugar_records(user_id, measured_at DESC);
CREATE INDEX idx_meal_user_time ON public.meal_records(user_id, meal_time DESC);
CREATE INDEX idx_exercise_user_time ON public.exercise_records(user_id, exercise_time DESC);
CREATE INDEX idx_chat_user_time ON public.chat_messages(user_id, created_at DESC);

-- 创建触发器函数：自动同步用户
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_count int;
BEGIN
  SELECT COUNT(*) INTO user_count FROM profiles;
  
  -- 从email中提取用户名（去掉@miaoda.com后缀）
  INSERT INTO public.profiles (id, username, email, role)
  VALUES (
    NEW.id,
    REPLACE(NEW.email, '@miaoda.com', ''),
    NEW.email,
    CASE WHEN user_count = 0 THEN 'admin'::public.user_role ELSE 'user'::public.user_role END
  );
  RETURN NEW;
END;
$$;

-- 创建触发器
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL)
  EXECUTE FUNCTION handle_new_user();

-- 创建辅助函数：检查是否为管理员
CREATE OR REPLACE FUNCTION is_admin(uid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = uid AND p.role = 'admin'::user_role
  );
$$;

-- 设置RLS策略
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_sugar_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Profiles表策略
CREATE POLICY "管理员可以查看所有用户" ON profiles
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "用户可以查看自己的资料" ON profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "用户可以更新自己的资料" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id)
  WITH CHECK (role IS NOT DISTINCT FROM (SELECT role FROM profiles WHERE id = auth.uid()));

CREATE POLICY "管理员可以更新所有用户" ON profiles
  FOR UPDATE TO authenticated USING (is_admin(auth.uid()));

-- 血糖记录表策略
CREATE POLICY "用户可以查看自己的血糖记录" ON blood_sugar_records
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "用户可以插入自己的血糖记录" ON blood_sugar_records
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以更新自己的血糖记录" ON blood_sugar_records
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "用户可以删除自己的血糖记录" ON blood_sugar_records
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 饮食记录表策略
CREATE POLICY "用户可以查看自己的饮食记录" ON meal_records
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "用户可以插入自己的饮食记录" ON meal_records
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以更新自己的饮食记录" ON meal_records
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "用户可以删除自己的饮食记录" ON meal_records
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 运动记录表策略
CREATE POLICY "用户可以查看自己的运动记录" ON exercise_records
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "用户可以插入自己的运动记录" ON exercise_records
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以更新自己的运动记录" ON exercise_records
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "用户可以删除自己的运动记录" ON exercise_records
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 对话历史表策略
CREATE POLICY "用户可以查看自己的对话历史" ON chat_messages
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "用户可以插入自己的对话消息" ON chat_messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以删除自己的对话历史" ON chat_messages
  FOR DELETE TO authenticated USING (auth.uid() = user_id);