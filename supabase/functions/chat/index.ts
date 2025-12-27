import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 智能时间识别函数
function parseTimeExpression(userMessage: string, currentTime: Date = new Date()): Date {
  const msg = userMessage.toLowerCase();
  const result = new Date(currentTime);
  
  // 识别"昨天"
  if (msg.includes('昨天') || msg.includes('昨日')) {
    result.setDate(result.getDate() - 1);
  }
  // 识别"前天"
  else if (msg.includes('前天') || msg.includes('前日')) {
    result.setDate(result.getDate() - 2);
  }
  // 识别"明天"
  else if (msg.includes('明天') || msg.includes('明日')) {
    result.setDate(result.getDate() + 1);
  }
  // 识别"今天早上/上午"
  else if (msg.includes('今天早上') || msg.includes('今天上午') || msg.includes('今早') || msg.includes('早上')) {
    result.setHours(8, 0, 0, 0);
  }
  // 识别"今天中午"
  else if (msg.includes('今天中午') || msg.includes('中午')) {
    result.setHours(12, 0, 0, 0);
  }
  // 识别"今天下午"
  else if (msg.includes('今天下午') || msg.includes('下午')) {
    result.setHours(15, 0, 0, 0);
  }
  // 识别"今天晚上"
  else if (msg.includes('今天晚上') || msg.includes('晚上') || msg.includes('今晚')) {
    result.setHours(19, 0, 0, 0);
  }
  // 识别"X天前"
  else {
    const daysAgoMatch = msg.match(/(\d+)\s*天前/);
    if (daysAgoMatch) {
      const days = parseInt(daysAgoMatch[1]);
      result.setDate(result.getDate() - days);
    }
  }
  
  // 识别具体时间点（如"8点"、"下午3点"）
  const timeMatch = msg.match(/(\d{1,2})\s*[点时]/);
  if (timeMatch) {
    let hour = parseInt(timeMatch[1]);
    // 如果提到"下午"或"晚上"，且小时数小于12，加12
    if ((msg.includes('下午') || msg.includes('晚上')) && hour < 12) {
      hour += 12;
    }
    result.setHours(hour, 0, 0, 0);
  }
  
  return result;
}

// 习惯养成检测函数
async function detectHabits(userId: string, supabase: any) {
  console.log('=== 开始检测习惯养成 ===');
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  // 1. 检测运动习惯
  const { data: exercises } = await supabase
    .from('exercise_records')
    .select('*')
    .eq('user_id', userId)
    .gte('exercise_time', thirtyDaysAgo.toISOString())
    .order('exercise_time', { ascending: false });
  
  if (exercises && exercises.length >= 3) {
    // 按运动类型分组统计
    const exerciseGroups: any = {};
    exercises.forEach((ex: any) => {
      const type = ex.exercise_type;
      if (!exerciseGroups[type]) {
        exerciseGroups[type] = [];
      }
      exerciseGroups[type].push(ex);
    });
    
    // 对于每种运动类型，如果次数>=3，创建习惯记录
    for (const [type, records] of Object.entries(exerciseGroups)) {
      const recordList = records as any[];
      if (recordList.length >= 3) {
        // 检查是否已存在该习惯
        const { data: existing } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', userId)
          .eq('preference_type', 'habit')
          .ilike('content', `%${type}%`)
          .maybeSingle();
        
        if (!existing) {
          // 创建新习惯
          await supabase.from('user_preferences').insert({
            user_id: userId,
            preference_type: 'habit',
            content: `坚持${type}运动，已完成${recordList.length}次`,
            confidence: recordList.length >= 5 ? 'high' : 'medium',
            source: 'inferred',
          });
          console.log(`✅ 检测到运动习惯: ${type}，${recordList.length}次`);
        } else {
          // 更新现有习惯
          await supabase
            .from('user_preferences')
            .update({
              content: `坚持${type}运动，已完成${recordList.length}次`,
              confidence: recordList.length >= 5 ? 'high' : 'medium',
              updated_at: now.toISOString(),
            })
            .eq('id', existing.id);
          console.log(`✅ 更新运动习惯: ${type}，${recordList.length}次`);
        }
        
        // 如果次数>=5，创建行为模式
        if (recordList.length >= 5) {
          const { data: patternExists } = await supabase
            .from('behavior_patterns')
            .select('*')
            .eq('user_id', userId)
            .eq('pattern_type', 'activity_impact')
            .ilike('pattern_description', `%${type}%`)
            .maybeSingle();
          
          if (!patternExists) {
            await supabase.from('behavior_patterns').insert({
              user_id: userId,
              pattern_type: 'activity_impact',
              pattern_description: `规律进行${type}运动，有助于血糖控制`,
              pattern_data: { exercise_type: type, count: recordList.length },
              confidence: 'high',
              evidence_count: recordList.length,
              last_observed_at: now.toISOString(),
            });
            console.log(`✅ 创建运动规律: ${type}`);
          } else {
            await supabase
              .from('behavior_patterns')
              .update({
                evidence_count: recordList.length,
                last_observed_at: now.toISOString(),
              })
              .eq('id', patternExists.id);
            console.log(`✅ 更新运动规律: ${type}`);
          }
        }
      }
    }
  }
  
  // 2. 检测饮食习惯
  const { data: meals } = await supabase
    .from('meal_records')
    .select('*')
    .eq('user_id', userId)
    .gte('meal_time', thirtyDaysAgo.toISOString())
    .order('meal_time', { ascending: false });
  
  if (meals && meals.length >= 10) {
    // 分析常吃的食物
    const foodFrequency: any = {};
    meals.forEach((meal: any) => {
      const foods = meal.food_items.split(/[、，,]/);
      foods.forEach((food: string) => {
        const trimmed = food.trim();
        if (trimmed) {
          foodFrequency[trimmed] = (foodFrequency[trimmed] || 0) + 1;
        }
      });
    });
    
    // 找出出现次数>=5的食物
    for (const [food, count] of Object.entries(foodFrequency)) {
      if ((count as number) >= 5) {
        const { data: existing } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', userId)
          .eq('preference_type', 'habit')
          .ilike('content', `%${food}%`)
          .maybeSingle();
        
        if (!existing) {
          await supabase.from('user_preferences').insert({
            user_id: userId,
            preference_type: 'habit',
            content: `经常食用${food}`,
            confidence: 'medium',
            source: 'inferred',
          });
          console.log(`✅ 检测到饮食习惯: ${food}，${count}次`);
        }
      }
    }
  }
  
  // 3. 检测测量习惯（固定时间测血糖）
  const { data: bloodSugars } = await supabase
    .from('blood_sugar_records')
    .select('*')
    .eq('user_id', userId)
    .gte('measured_at', thirtyDaysAgo.toISOString())
    .order('measured_at', { ascending: false });
  
  if (bloodSugars && bloodSugars.length >= 7) {
    // 按测量类型分组
    const typeGroups: any = {};
    bloodSugars.forEach((bs: any) => {
      const type = bs.measurement_type;
      if (!typeGroups[type]) {
        typeGroups[type] = [];
      }
      typeGroups[type].push(bs);
    });
    
    // 如果某个类型的测量>=7次，说明有规律测量习惯
    for (const [type, records] of Object.entries(typeGroups)) {
      const recordList = records as any[];
      if (recordList.length >= 7) {
        const typeName = type === 'fasting' ? '空腹' :
                        type === 'before_meal' ? '餐前' :
                        type === 'after_meal' ? '餐后' :
                        type === 'bedtime' ? '睡前' : '随机';
        
        const { data: existing } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', userId)
          .eq('preference_type', 'habit')
          .ilike('content', `%${typeName}%测血糖%`)
          .maybeSingle();
        
        if (!existing) {
          await supabase.from('user_preferences').insert({
            user_id: userId,
            preference_type: 'habit',
            content: `坚持${typeName}测血糖，已测量${recordList.length}次`,
            confidence: 'high',
            source: 'inferred',
          });
          console.log(`✅ 检测到测量习惯: ${typeName}，${recordList.length}次`);
        } else {
          await supabase
            .from('user_preferences')
            .update({
              content: `坚持${typeName}测血糖，已测量${recordList.length}次`,
              updated_at: now.toISOString(),
            })
            .eq('id', existing.id);
        }
      }
    }
  }
  
  console.log('=== 习惯检测完成 ===');
}

// AI Memory系统 - 完整的系统提示词
const SYSTEM_PROMPT = `# Role Description
你是一个专精于内分泌与血糖管理的"AI健康记忆架构师"。你的核心任务不是简单的聊天，而是管理一个多层级的记忆系统，确保对用户的建议是基于连续历史、个性化偏好和医学逻辑的。

# System Architecture (你的大脑结构)

## Short-term Memory (STM)
当前对话的上下文缓存，包含：
- 正在讨论的话题
- 用户当前的情绪状态
- 本次对话中提到的临时信息

## Long-term Factual Memory (LTM-F)

### Profile (用户档案)
- 基本信息：姓名、年龄、糖尿病类型
- 医疗信息：当前用药、目标血糖范围
- 健康备注：其他重要健康信息

### Event Logs (事件日志)
时间轴上的结构化事件：
- 血糖测量事件：数值、时间、测量类型
- 饮食事件：食物内容、餐次、时间
- 运动事件：运动类型、时长、强度
- 用药事件：药物名称、剂量、时间

### Feedback Records (反馈记录)
- 历史建议的采纳情况
- 建议执行后的血糖变化
- 有效性评分
- **重要**: 根据反馈优化后续建议
  - 效果评分>=7的建议，优先推荐类似方案
  - 效果评分<=3的建议，避免重复推荐
  - 血糖改善明显的建议，作为成功案例引用

## Long-term Pattern Memory (LTM-P)

### Patterns (行为模式)
从事件日志中抽象出的规律：
- 食物反应模式：特定食物对血糖的影响
- 时间规律：特定时段的血糖波动趋势
- 活动影响：运动对血糖的调节效果

### Preferences (偏好与禁忌)
- 过敏源：明确的过敏食物或药物
- 不喜欢：用户不喜欢的食物或活动
- 习惯：用户的日常习惯
- 日程：固定的时间安排

# Operational Workflow (严格执行的步骤)

## Step 1: Memory Retrieval & Contextualization (记忆检索)
在回复用户之前，先在"思维链"中执行检索：

1. **Check Profile**: 确认用户基础病况及过敏源
2. **Check History**: 搜索与当前输入语义相关的历史事件
3. **Check Patterns**: 调用已形成的规律
4. **Check Preferences**: 检查用户偏好和禁忌

## Step 2: Reasoning & Guidance (推理与指导)
基于检索结果生成建议：

1. **冲突检测**: 如果用户行为违背LTM-P（禁忌），立即发出预警
2. **模式匹配**: 如果当前情境符合LTM-P（模式），引用历史数据作为劝导依据
3. **通用建议**: 如果没有历史数据，提供通用医学建议，并标记该事件为"待观察"

## Step 3: Response Generation (响应输出)
向用户输出自然语言回复：
- 语气需专业、温暖且具有连续性
- 不要表现得像第一次认识用户
- 主动引用历史记录建立信任
- 使用共情语言关注用户情感

## Step 4: Memory Consolidation (记忆沉淀)
在回复之后，必须输出一个结构化的内存更新块（Memory Update Block）。

**重要：格式必须严格遵守，否则无法保存数据！**

格式如下（在自然语言回复后添加）：
\`\`\`
---MEMORY_UPDATE---
{
  "events": [
    {
      "type": "blood_sugar|meal|exercise|medication",
      "summary": "简短描述",
      "data": {具体数据字段}
    }
  ],
  "patterns": [
    {
      "type": "food_reaction|time_pattern|activity_impact",
      "description": "模式描述",
      "confidence": "high|medium|low"
    }
  ],
  "preferences": [
    {
      "type": "allergy|dislike|habit|schedule",
      "content": "具体内容"
    }
  ],
  "suggestions": [
    {
      "content": "具体建议内容",
      "category": "diet|exercise|medication|lifestyle"
    }
  ],
  "profile": {
    "diabetes_type": "type1|type2|prediabetes",
    "medication": "药物信息"
  }
}
\`\`\`

**数据字段说明**：
- blood_sugar事件: {"value": 7.2, "measurement_type": "fasting|before_meal|after_meal|bedtime|random"}
- meal事件: {"meal_type": "breakfast|lunch|dinner|snack", "food_items": "具体食物"}
- exercise事件: {"exercise_type": "运动类型", "duration_minutes": 30, "intensity": "light|moderate|vigorous"}

**重要提醒**：
1. 字段名必须完全一致，不能使用food、food_list等其他名称，必须是food_items
2. meal_type必须是四个值之一：breakfast、lunch、dinner、snack（如果用户没说具体餐次，根据时间推断）
3. measurement_type必须是五个值之一：fasting、before_meal、after_meal、bedtime、random
4. intensity必须是三个值之一：light、moderate、vigorous
5. duration_minutes必须是数字，不能是字符串
6. 当用户提到运动时，必须输出exercise类型的事件

**示例**：
用户说："我刚吃了油条和豆浆"
你的回复应该是：
\`\`\`
好的！油条和豆浆是经典的早餐搭配。不过油条是油炸食品，碳水化合物含量较高，建议适量食用。我已经帮您记录了这次早餐。

---MEMORY_UPDATE---
{
  "events": [
    {
      "type": "meal",
      "summary": "早餐：油条和豆浆",
      "data": {
        "meal_type": "breakfast",
        "food_items": "油条、豆浆"
      }
    }
  ]
}
\`\`\`

# Constraints (约束条件)

1. **持久化假设**: 必须假设你拥有持久化存储能力，在对话中主动引用之前的设定
2. **时间处理**: 
   - 当用户说"昨天"、"前天"、"今天早上"等时间表达时，在data字段中添加time_expression字段记录原始表达
   - 系统会自动将时间表达转换为具体时间戳
   - 示例：用户说"我昨天跑步了30分钟"，data应包含 "time_expression": "昨天"
3. **核心指标**: 始终关注"血糖"这一核心指标，所有建议都要围绕平稳血糖展开
4. **医学边界**: 你不是医生，不能提供诊断或治疗建议，遇到严重问题建议就医
5. **连续性**: 每次对话都要体现对用户历史的了解，建立长期陪伴感

# Response Format (回复格式)

你的每次回复应该包含两部分：

1. **自然语言回复**（给用户看的）
2. **Memory Update Block**（JSON格式，用于系统存储）

**关键规则**：
- 当用户提到血糖、饮食、运动、用药时，**必须**输出Memory Update Block
- 当用户明确表达偏好、禁忌、习惯时，**必须**记录到preferences
- 当发现重复模式时（如多次提到同一食物的反应），记录到patterns
- **当你给出具体的行动建议时（如饮食调整、运动建议、生活方式改变），必须记录到suggestions**
- 格式必须严格：---MEMORY_UPDATE--- 后面直接跟JSON对象（不需要json标记）

**建议记录规则**：
- 只记录具体的、可执行的建议（如"晚餐减少米饭量到半碗"）
- 不记录一般性知识（如"碳水化合物会升高血糖"）
- 建议内容要简洁明确，方便用户后续反馈
- 每次对话最多记录2-3条核心建议

示例1（记录饮食）：
\`\`\`
用户："我今天吃了煎饼果子"
AI回复：
煎饼果子是很受欢迎的早餐！不过它主要是精制面粉，升糖指数较高。建议搭配一些蔬菜或蛋白质，可以帮助稳定血糖。我已经帮您记录了这次早餐。

---MEMORY_UPDATE---
{"events":[{"type":"meal","summary":"早餐：煎饼果子","data":{"meal_type":"breakfast","food_items":"煎饼果子"}}]}
\`\`\`

示例2（记录运动）：
\`\`\`
用户："我跑步了30分钟"
AI回复：
太棒了！30分钟的跑步对血糖控制很有帮助。运动可以提高胰岛素敏感性，建议在运动后1-2小时测一下血糖，观察运动效果。我已经帮您记录了这次运动。

---MEMORY_UPDATE---
{"events":[{"type":"exercise","summary":"跑步30分钟","data":{"exercise_type":"跑步","duration_minutes":30,"intensity":"moderate"}}]}
\`\`\`

示例3（记录血糖）：
\`\`\`
用户："我刚测了血糖，空腹7.2"
AI回复：
空腹血糖7.2 mmol/L，稍微偏高了一点。理想的空腹血糖应该在4.0-6.0之间。建议注意晚餐的碳水摄入，避免睡前加餐。我已经帮您记录了这次测量。

---MEMORY_UPDATE---
{"events":[{"type":"blood_sugar","summary":"空腹血糖7.2","data":{"value":7.2,"measurement_type":"fasting"}}]}
\`\`\`

示例4（记录建议）：
\`\`\`
用户："我最近血糖总是偏高，怎么办？"
AI回复：
根据您最近的血糖记录，我有几条建议：

1. **饮食调整**：晚餐时将米饭量减少到半碗，增加蔬菜摄入
2. **运动建议**：每天晚饭后30分钟散步20-30分钟
3. **监测频率**：建议每天测量空腹血糖和晚餐后2小时血糖

这些调整可以帮助您更好地控制血糖。坚持一周后，我们再看看效果如何。

---MEMORY_UPDATE---
{"suggestions":[{"content":"晚餐时将米饭量减少到半碗，增加蔬菜摄入","category":"diet"},{"content":"每天晚饭后30分钟散步20-30分钟","category":"exercise"}]}
\`\`\`

现在，请等待用户输入，并按上述流程开始工作。`;

// 处理Memory Update的函数
async function processMemoryUpdate(aiResponse: string, userId: string, supabase: any, userMessage: string) {
  const result = {
    events: 0,
    patterns: 0,
    preferences: 0,
    profile: false,
    dataRecorded: {
      blood_sugar: 0,
      meal: 0,
      exercise: 0,
    },
  };

  try {
    console.log('=== 开始处理Memory Update ===');
    console.log('AI回复长度:', aiResponse.length);
    console.log('用户消息:', userMessage);
    
    // 提取Memory Update Block（更宽松的匹配）
    // 匹配 ---MEMORY_UPDATE--- 后面的JSON对象
    const memoryMatch = aiResponse.match(/---MEMORY_UPDATE---\s*\n?\s*(\{[\s\S]+\})/);
    
    if (!memoryMatch) {
      console.log('⚠️ 未找到Memory Update Block');
      // 即使没有Memory Update，也执行习惯检测
      await detectHabits(userId, supabase);
      return result;
    }

    let jsonStr = memoryMatch[1].trim();
    console.log('提取到的JSON原始内容:', jsonStr);
    
    // 尝试找到最后一个完整的 }
    const lastBrace = jsonStr.lastIndexOf('}');
    if (lastBrace !== -1) {
      jsonStr = jsonStr.substring(0, lastBrace + 1);
    }
    
    console.log('清理后的JSON:', jsonStr);
    
    const memoryUpdate = JSON.parse(jsonStr);
    
    // 智能时间识别
    const eventTime = parseTimeExpression(userMessage);
    const eventTimeStr = eventTime.toISOString();
    console.log('识别的事件时间:', eventTimeStr);
    
    console.log('解析成功，包含的键:', Object.keys(memoryUpdate));

    // 1. 处理事件（events）
    if (memoryUpdate.events && Array.isArray(memoryUpdate.events)) {
      console.log(`发现 ${memoryUpdate.events.length} 个事件`);
      result.events = memoryUpdate.events.length;
      
      for (const event of memoryUpdate.events) {
        console.log('处理事件:', event.type, event.summary);
        
        // 插入到memory_events表
        const { error: eventError } = await supabase.from('memory_events').insert({
          user_id: userId,
          event_type: event.type,
          event_summary: event.summary || '',
          event_data: event.data || {},
          tags: event.tags || [],
          importance_score: event.importance || 5,
          event_time: eventTimeStr,
        });
        
        if (eventError) {
          console.error('❌ 插入memory_events失败:', eventError);
        }

        // 同时插入到对应的具体表（使用智能识别的时间）
        if (event.type === 'blood_sugar' && event.data?.value) {
          const { error } = await supabase.from('blood_sugar_records').insert({
            user_id: userId,
            value: parseFloat(event.data.value),
            measured_at: eventTimeStr,
            measurement_type: event.data.measurement_type || 'random',
            notes: event.data.notes || null,
          });
          if (error) {
            console.error('❌ 插入blood_sugar_records失败:', error);
          } else {
            console.log('✅ 已记录血糖数据:', event.data.value, '时间:', eventTimeStr);
            result.dataRecorded.blood_sugar++;
          }
        } else if (event.type === 'meal') {
          // 兼容多种字段名：food_items, food, food_list
          const foodItems = event.data?.food_items || event.data?.food || event.data?.food_list;
          if (foodItems) {
            // 如果是数组，转换为字符串
            const foodStr = Array.isArray(foodItems) ? foodItems.join('、') : String(foodItems);
            
            // 确保meal_type是有效值
            let mealType = event.data?.meal_type || 'snack';
            const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
            if (!validMealTypes.includes(mealType)) {
              mealType = 'snack';
            }
            
            const { error } = await supabase.from('meal_records').insert({
              user_id: userId,
              meal_type: mealType,
              food_items: foodStr,
              meal_time: eventTimeStr,
              notes: event.data?.notes || null,
            });
            if (error) {
              console.error('❌ 插入meal_records失败:', error);
              console.error('尝试插入的数据:', { meal_type: mealType, food_items: foodStr });
            } else {
              console.log('✅ 已记录饮食数据:', foodStr, '时间:', eventTimeStr);
              result.dataRecorded.meal++;
            }
          } else {
            console.log('⚠️ meal事件缺少food_items字段:', event.data);
          }
        } else if (event.type === 'exercise') {
          const exerciseType = event.data?.exercise_type;
          if (exerciseType) {
            // 确保duration_minutes是数字
            let duration = event.data?.duration_minutes || 30;
            if (typeof duration === 'string') {
              duration = parseInt(duration) || 30;
            }
            
            // 确保intensity是有效值
            let intensity = event.data?.intensity || 'moderate';
            const validIntensities = ['light', 'moderate', 'vigorous'];
            if (!validIntensities.includes(intensity)) {
              intensity = 'moderate';
            }
            
            const { error } = await supabase.from('exercise_records').insert({
              user_id: userId,
              exercise_type: exerciseType,
              duration_minutes: duration,
              intensity: intensity,
              exercise_time: eventTimeStr,
              notes: event.data?.notes || null,
            });
            if (error) {
              console.error('❌ 插入exercise_records失败:', error);
              console.error('尝试插入的数据:', { exercise_type: exerciseType, duration_minutes: duration, intensity });
            } else {
              console.log('✅ 已记录运动数据:', exerciseType, duration, '分钟', '时间:', eventTimeStr);
              result.dataRecorded.exercise++;
            }
          } else {
            console.log('⚠️ exercise事件缺少exercise_type字段:', event.data);
          }
        }
      }
      console.log(`✅ 成功处理 ${memoryUpdate.events.length} 个事件`);
    } else {
      console.log('⚠️ 没有events数据');
    }

    // 2. 处理模式（patterns）
    if (memoryUpdate.patterns && Array.isArray(memoryUpdate.patterns)) {
      console.log(`发现 ${memoryUpdate.patterns.length} 个模式`);
      result.patterns = memoryUpdate.patterns.length;
      
      for (const pattern of memoryUpdate.patterns) {
        // 检查是否已存在类似模式
        const { data: existing } = await supabase
          .from('behavior_patterns')
          .select('*')
          .eq('user_id', userId)
          .eq('pattern_type', pattern.type)
          .ilike('pattern_description', `%${pattern.description.substring(0, 20)}%`)
          .maybeSingle();

        if (existing) {
          // 更新现有模式的证据计数
          await supabase
            .from('behavior_patterns')
            .update({
              evidence_count: existing.evidence_count + 1,
              last_observed_at: now,
              confidence: pattern.confidence || existing.confidence,
            })
            .eq('id', existing.id);
          console.log('✅ 更新行为模式:', pattern.description);
        } else {
          // 创建新模式
          await supabase.from('behavior_patterns').insert({
            user_id: userId,
            pattern_type: pattern.type,
            pattern_description: pattern.description,
            pattern_data: { evidence: pattern.evidence || '' },
            confidence: pattern.confidence || 'medium',
            evidence_count: 1,
            last_observed_at: now,
          });
          console.log('✅ 创建新行为模式:', pattern.description);
        }
      }
    }

    // 3. 处理偏好（preferences）
    if (memoryUpdate.preferences && Array.isArray(memoryUpdate.preferences)) {
      console.log(`发现 ${memoryUpdate.preferences.length} 个偏好`);
      result.preferences = memoryUpdate.preferences.length;
      
      for (const pref of memoryUpdate.preferences) {
        // 检查是否已存在
        const { data: existing } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', userId)
          .eq('preference_type', pref.type)
          .eq('content', pref.content)
          .maybeSingle();

        if (!existing) {
          await supabase.from('user_preferences').insert({
            user_id: userId,
            preference_type: pref.type,
            content: pref.content,
            confidence: 'high',
            source: pref.source || 'user_stated',
          });
          console.log('✅ 添加用户偏好:', pref.content);
        }
      }
    }
    
    // 4. 处理建议（suggestions）
    if (memoryUpdate.suggestions && Array.isArray(memoryUpdate.suggestions)) {
      console.log(`发现 ${memoryUpdate.suggestions.length} 个建议`);
      
      for (const suggestion of memoryUpdate.suggestions) {
        // 记录建议到feedback_records表
        await supabase.from('feedback_records').insert({
          user_id: userId,
          suggestion_content: suggestion.content,
          action_taken: null, // 待用户反馈
          outcome_description: null,
          blood_sugar_before: null,
          blood_sugar_after: null,
          effectiveness_score: null,
        });
        console.log('✅ 记录建议:', suggestion.content);
      }
    }

    // 5. 处理档案更新（profile）
    if (memoryUpdate.profile && Object.keys(memoryUpdate.profile).length > 0) {
      const profileUpdates: any = {};
      if (memoryUpdate.profile.diabetes_type) {
        profileUpdates.diabetes_type = memoryUpdate.profile.diabetes_type;
      }
      if (memoryUpdate.profile.medication) {
        profileUpdates.medication = memoryUpdate.profile.medication;
      }
      if (memoryUpdate.profile.health_notes) {
        profileUpdates.health_notes = memoryUpdate.profile.health_notes;
      }

      if (Object.keys(profileUpdates).length > 0) {
        await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('id', userId);
        console.log('✅ 更新用户档案');
        result.profile = true;
      }
    }
    
    console.log('=== Memory Update处理完成 ===');
    
    // 执行习惯检测
    await detectHabits(userId, supabase);

  } catch (error) {
    console.error('❌ 处理Memory Update失败:', error);
    console.error('错误详情:', error.message);
    console.error('错误堆栈:', error.stack);
    console.error('AI回复内容:', aiResponse);
  }

  return result;
}

Deno.serve(async (req) => {
  // 处理CORS预检请求
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userId } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: '无效的消息格式' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 初始化Supabase客户端
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 构建记忆上下文
    let memoryContext = '';
    
    if (userId) {
      // 1. 加载用户档案
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, diabetes_type, medication, target_blood_sugar_min, target_blood_sugar_max, health_notes')
        .eq('id', userId)
        .maybeSingle();

      if (profile) {
        memoryContext += '\n\n## 用户档案 (Profile)\n';
        memoryContext += `- 用户名: ${profile.username}\n`;
        if (profile.diabetes_type) memoryContext += `- 糖尿病类型: ${profile.diabetes_type}\n`;
        if (profile.medication) memoryContext += `- 当前用药: ${profile.medication}\n`;
        memoryContext += `- 目标血糖范围: ${profile.target_blood_sugar_min}-${profile.target_blood_sugar_max} mmol/L\n`;
        if (profile.health_notes) memoryContext += `- 健康备注: ${profile.health_notes}\n`;
      }

      // 2. 加载用户偏好与禁忌
      const { data: preferences } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (preferences && preferences.length > 0) {
        memoryContext += '\n## 用户偏好与禁忌 (Preferences)\n';
        const allergies = preferences.filter(p => p.preference_type === 'allergy');
        const dislikes = preferences.filter(p => p.preference_type === 'dislike');
        const habits = preferences.filter(p => p.preference_type === 'habit');
        const schedules = preferences.filter(p => p.preference_type === 'schedule');

        if (allergies.length > 0) {
          memoryContext += '### 过敏源:\n';
          allergies.forEach(p => memoryContext += `- ${p.content}\n`);
        }
        if (dislikes.length > 0) {
          memoryContext += '### 不喜欢:\n';
          dislikes.forEach(p => memoryContext += `- ${p.content}\n`);
        }
        if (habits.length > 0) {
          memoryContext += '### 习惯:\n';
          habits.forEach(p => memoryContext += `- ${p.content}\n`);
        }
        if (schedules.length > 0) {
          memoryContext += '### 日程:\n';
          schedules.forEach(p => memoryContext += `- ${p.content}\n`);
        }
      }

      // 3. 加载行为模式
      const { data: patterns } = await supabase
        .from('behavior_patterns')
        .select('*')
        .eq('user_id', userId)
        .gte('evidence_count', 2) // 至少有2次证据的模式
        .order('evidence_count', { ascending: false })
        .limit(10);

      if (patterns && patterns.length > 0) {
        memoryContext += '\n## 行为模式 (Patterns)\n';
        patterns.forEach(p => {
          memoryContext += `- [${p.pattern_type}] ${p.pattern_description} (置信度: ${p.confidence}, 证据数: ${p.evidence_count})\n`;
        });
      }

      // 4. 加载最近的血糖数据
      const { data: recentRecords } = await supabase
        .from('blood_sugar_records')
        .select('value, measured_at, measurement_type')
        .eq('user_id', userId)
        .order('measured_at', { ascending: false })
        .limit(5);

      if (recentRecords && recentRecords.length > 0) {
        memoryContext += '\n## 最近的血糖记录 (Recent Blood Sugar)\n';
        recentRecords.forEach((record: any) => {
          const date = new Date(record.measured_at).toLocaleString('zh-CN');
          memoryContext += `- ${date}: ${record.value} mmol/L (${record.measurement_type})\n`;
        });
      }

      // 5. 加载最近的记忆事件（用于语义相关性检索）
      const { data: recentEvents } = await supabase
        .from('memory_events')
        .select('event_type, event_summary, event_time')
        .eq('user_id', userId)
        .order('event_time', { ascending: false })
        .limit(10);

      if (recentEvents && recentEvents.length > 0) {
        memoryContext += '\n## 最近的事件 (Recent Events)\n';
        recentEvents.forEach((event: any) => {
          const date = new Date(event.event_time).toLocaleString('zh-CN');
          memoryContext += `- [${event.event_type}] ${event.event_summary} (${date})\n`;
        });
      }
      
      // 6. 加载反馈记录（用于优化建议）
      const { data: feedbackRecords } = await supabase
        .from('feedback_records')
        .select('*')
        .eq('user_id', userId)
        .not('action_taken', 'is', null) // 只加载已反馈的记录
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (feedbackRecords && feedbackRecords.length > 0) {
        memoryContext += '\n## 历史建议反馈 (Feedback History)\n';
        memoryContext += '**重要**: 根据以下反馈优化你的建议\n';
        
        // 分类显示：效果好的和效果差的
        const goodFeedback = feedbackRecords.filter((fb: any) => 
          fb.action_taken && fb.effectiveness_score && fb.effectiveness_score >= 7
        );
        const badFeedback = feedbackRecords.filter((fb: any) => 
          fb.action_taken && fb.effectiveness_score && fb.effectiveness_score <= 3
        );
        
        if (goodFeedback.length > 0) {
          memoryContext += '\n### ✅ 效果好的建议（优先推荐类似方案）:\n';
          goodFeedback.forEach((fb: any) => {
            const improvement = fb.blood_sugar_before && fb.blood_sugar_after 
              ? ` (血糖从${fb.blood_sugar_before}降到${fb.blood_sugar_after})`
              : '';
            memoryContext += `- "${fb.suggestion_content}" - 评分${fb.effectiveness_score}/10${improvement}\n`;
            if (fb.outcome_description) {
              memoryContext += `  用户反馈: ${fb.outcome_description}\n`;
            }
          });
        }
        
        if (badFeedback.length > 0) {
          memoryContext += '\n### ❌ 效果差的建议（避免重复推荐）:\n';
          badFeedback.forEach((fb: any) => {
            memoryContext += `- "${fb.suggestion_content}" - 评分${fb.effectiveness_score}/10\n`;
            if (fb.outcome_description) {
              memoryContext += `  用户反馈: ${fb.outcome_description}\n`;
            }
          });
        }
      }
    }

    // 构建完整的消息列表
    const fullMessages = [
      { role: 'system', content: SYSTEM_PROMPT + memoryContext },
      ...messages
    ];

    // 调用文心大模型API
    const apiUrl = 'https://api-integrations.appmiaoda.com/app-8hw3c8pteqrl/api-Xa6JZMByJlDa/v2/chat/completions';
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: fullMessages,
        enable_thinking: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API调用失败:', errorText);
      return new Response(
        JSON.stringify({ error: 'AI服务暂时不可用，请稍后重试' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 创建流式响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let fullResponse = ''; // 累积完整的AI回复

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  
                  if (content) {
                    fullResponse += content; // 累积完整回复
                    // 转发内容到客户端
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
                    );
                  }
                } catch (e) {
                  console.error('解析响应失败:', e);
                }
              }
            }
          }

          // 流式响应完成后，处理Memory Update并记录日志
          if (fullResponse && userId) {
            // 获取用户最后一条消息
            const userMessage = messages.length > 0 ? messages[messages.length - 1].content : '';
            
            const startTime = Date.now();
            const memoryResult = await processMemoryUpdate(fullResponse, userId, supabase, userMessage);
            const processingTime = Date.now() - startTime;

            // 分析涉及的Agent
            const agentsInvolved = ['coordinator']; // 对话协调Agent总是参与
            if (memoryResult.dataRecorded.blood_sugar > 0 || memoryResult.dataRecorded.meal > 0 || memoryResult.dataRecorded.exercise > 0) {
              agentsInvolved.push('data_recorder'); // 数据记录Agent
            }
            if (fullResponse.includes('分析') || fullResponse.includes('趋势') || fullResponse.includes('平均')) {
              agentsInvolved.push('analyzer'); // 即时分析Agent
            }
            if (fullResponse.includes('GI') || fullResponse.includes('升糖') || fullResponse.includes('建议') || fullResponse.includes('知识')) {
              agentsInvolved.push('educator'); // 教育科普Agent
            }
            if (fullResponse.includes('加油') || fullResponse.includes('棒') || fullResponse.includes('进步') || fullResponse.includes('坚持')) {
              agentsInvolved.push('motivator'); // 激励支持Agent
            }

            // 记录Agent日志
            const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await supabase.from('agent_logs').insert({
              user_id: userId,
              session_id: sessionId,
              user_message: messages[messages.length - 1]?.content || '',
              ai_response: fullResponse,
              agents_involved: agentsInvolved,
              memory_updates: {
                events: memoryResult.events,
                patterns: memoryResult.patterns,
                preferences: memoryResult.preferences,
                profile: memoryResult.profile,
              },
              data_recorded: memoryResult.dataRecorded,
              processing_time_ms: processingTime,
              status: 'success',
            });

            console.log('✅ Agent日志已记录:', {
              agents: agentsInvolved,
              memoryUpdates: memoryResult,
              processingTime: `${processingTime}ms`,
            });
          }

        } catch (error) {
          console.error('流式读取错误:', error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('处理请求时出错:', error);
    return new Response(
      JSON.stringify({ error: '服务器内部错误' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
