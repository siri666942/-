import { supabase } from './supabase';
import type {
  Profile,
  BloodSugarRecord,
  MealRecord,
  ExerciseRecord,
  ChatMessage,
  CreateBloodSugarRecordInput,
  CreateMealRecordInput,
  CreateExerciseRecordInput,
  CreateChatMessageInput,
} from '@/types/types';

// ==================== 用户相关 ====================

/**
 * 获取当前用户的配置信息
 */
export async function getCurrentUserProfile(): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', (await supabase.auth.getUser()).data.user?.id)
    .maybeSingle();

  if (error) {
    console.error('获取用户配置失败:', error);
    return null;
  }

  return data;
}

/**
 * 更新用户配置
 */
export async function updateUserProfile(updates: Partial<Profile>): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', (await supabase.auth.getUser()).data.user?.id);

  if (error) {
    console.error('更新用户配置失败:', error);
    return false;
  }

  return true;
}

/**
 * 获取所有用户（管理员）
 */
export async function getAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取用户列表失败:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

// ==================== 血糖记录相关 ====================

/**
 * 创建血糖记录
 */
export async function createBloodSugarRecord(
  input: CreateBloodSugarRecordInput
): Promise<BloodSugarRecord | null> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from('blood_sugar_records')
    .insert({
      user_id: user.id,
      ...input,
    })
    .select()
    .maybeSingle();

  if (error) {
    console.error('创建血糖记录失败:', error);
    return null;
  }

  return data;
}

/**
 * 获取用户的血糖记录列表
 */
export async function getBloodSugarRecords(
  limit = 50,
  offset = 0
): Promise<BloodSugarRecord[]> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return [];

  const { data, error } = await supabase
    .from('blood_sugar_records')
    .select('*')
    .eq('user_id', user.id)
    .order('measured_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('获取血糖记录失败:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

/**
 * 获取最近N天的血糖记录
 */
export async function getRecentBloodSugarRecords(days = 7): Promise<BloodSugarRecord[]> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return [];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('blood_sugar_records')
    .select('*')
    .eq('user_id', user.id)
    .gte('measured_at', startDate.toISOString())
    .order('measured_at', { ascending: false });

  if (error) {
    console.error('获取最近血糖记录失败:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

/**
 * 删除血糖记录
 */
export async function deleteBloodSugarRecord(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('blood_sugar_records')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('删除血糖记录失败:', error);
    return false;
  }

  return true;
}

// ==================== 饮食记录相关 ====================

/**
 * 创建饮食记录
 */
export async function createMealRecord(
  input: CreateMealRecordInput
): Promise<MealRecord | null> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from('meal_records')
    .insert({
      user_id: user.id,
      ...input,
    })
    .select()
    .maybeSingle();

  if (error) {
    console.error('创建饮食记录失败:', error);
    return null;
  }

  return data;
}

/**
 * 获取用户的饮食记录列表
 */
export async function getMealRecords(limit = 50, offset = 0): Promise<MealRecord[]> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return [];

  const { data, error } = await supabase
    .from('meal_records')
    .select('*')
    .eq('user_id', user.id)
    .order('meal_time', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('获取饮食记录失败:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

/**
 * 删除饮食记录
 */
export async function deleteMealRecord(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('meal_records')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('删除饮食记录失败:', error);
    return false;
  }

  return true;
}

// ==================== 运动记录相关 ====================

/**
 * 创建运动记录
 */
export async function createExerciseRecord(
  input: CreateExerciseRecordInput
): Promise<ExerciseRecord | null> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from('exercise_records')
    .insert({
      user_id: user.id,
      ...input,
    })
    .select()
    .maybeSingle();

  if (error) {
    console.error('创建运动记录失败:', error);
    return null;
  }

  return data;
}

/**
 * 获取用户的运动记录列表
 */
export async function getExerciseRecords(
  limit = 50,
  offset = 0
): Promise<ExerciseRecord[]> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return [];

  const { data, error } = await supabase
    .from('exercise_records')
    .select('*')
    .eq('user_id', user.id)
    .order('exercise_time', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('获取运动记录失败:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

/**
 * 删除运动记录
 */
export async function deleteExerciseRecord(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('exercise_records')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('删除运动记录失败:', error);
    return false;
  }

  return true;
}

// ==================== 对话历史相关 ====================

/**
 * 创建对话消息
 */
export async function createChatMessage(
  input: CreateChatMessageInput
): Promise<ChatMessage | null> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      user_id: user.id,
      ...input,
    })
    .select()
    .maybeSingle();

  if (error) {
    console.error('创建对话消息失败:', error);
    return null;
  }

  return data;
}

/**
 * 获取用户的对话历史
 */
export async function getChatMessages(limit = 50, offset = 0): Promise<ChatMessage[]> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return [];

  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('获取对话历史失败:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

/**
 * 获取最近的对话上下文（用于AI对话）
 */
export async function getRecentChatContext(limit = 10): Promise<ChatMessage[]> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return [];

  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('获取对话上下文失败:', error);
    return [];
  }

  // 反转顺序，使其按时间正序排列
  return Array.isArray(data) ? data.reverse() : [];
}

/**
 * 清空对话历史
 */
export async function clearChatHistory(): Promise<boolean> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return false;

  const { error } = await supabase
    .from('chat_messages')
    .delete()
    .eq('user_id', user.id);

  if (error) {
    console.error('清空对话历史失败:', error);
    return false;
  }

  return true;
}

// ==================== 记忆系统相关 ====================

/**
 * 获取用户偏好列表
 */
export async function getUserPreferences(limit = 50) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return [];

  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('获取用户偏好失败:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

/**
 * 获取行为模式列表
 */
export async function getBehaviorPatterns(limit = 50) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return [];

  const { data, error } = await supabase
    .from('behavior_patterns')
    .select('*')
    .eq('user_id', user.id)
    .order('last_observed_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('获取行为模式失败:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

/**
 * 获取记忆事件列表
 */
export async function getMemoryEvents(limit = 100) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return [];

  const { data, error } = await supabase
    .from('memory_events')
    .select('*')
    .eq('user_id', user.id)
    .order('event_time', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('获取记忆事件失败:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

/**
 * 获取反馈记录列表
 */
export async function getFeedbackRecords(limit = 50) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return [];

  const { data, error } = await supabase
    .from('feedback_records')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('获取反馈记录失败:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

/**
 * 获取记忆系统统计数据
 */
export async function getMemoryStats() {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return null;

  // 并行查询所有统计数据
  const [preferencesCount, patternsCount, eventsCount, feedbackCount] = await Promise.all([
    supabase.from('user_preferences').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('behavior_patterns').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('memory_events').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('feedback_records').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
  ]);

  return {
    preferences: preferencesCount.count || 0,
    patterns: patternsCount.count || 0,
    events: eventsCount.count || 0,
    feedback: feedbackCount.count || 0,
  };
}

/**
 * 获取历史聊天记录（按日期）
 */
export async function getChatMessagesByDate(date: Date) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return [];

  // 设置日期范围：当天的00:00:00到23:59:59
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('user_id', user.id)
    .gte('created_at', startOfDay.toISOString())
    .lte('created_at', endOfDay.toISOString())
    .order('created_at', { ascending: true });

  if (error) {
    console.error('获取历史聊天记录失败:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

/**
 * 获取有聊天记录的日期列表
 */
export async function getChatDates() {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return [];

  const { data, error } = await supabase
    .from('chat_messages')
    .select('created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取聊天日期失败:', error);
    return [];
  }

  // 提取唯一的日期（YYYY-MM-DD格式）
  const dates = new Set<string>();
  data?.forEach((msg: any) => {
    const date = new Date(msg.created_at);
    const dateStr = date.toISOString().split('T')[0];
    dates.add(dateStr);
  });

  return Array.from(dates).sort((a, b) => b.localeCompare(a));
}

