import { useEffect, useState } from 'react';
import { Loader2, Search, FileText } from 'lucide-react';

interface AnalyzingAnimationProps {
  onComplete?: () => void;
  duration?: number; // 动画持续时间（毫秒）
}

/**
 * AI分析过程动画组件
 * 模拟AI分析和查找论文的过程
 */
export default function AnalyzingAnimation({ onComplete, duration = 2000 }: AnalyzingAnimationProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // 第一步：分析中
    const timer1 = setTimeout(() => {
      setCurrentStep(1);
    }, 500);

    // 第二步：检索医学循证知识库
    const timer2 = setTimeout(() => {
      setCurrentStep(2);
    }, 1200);

    // 完成动画
    const timer3 = setTimeout(() => {
      if (onComplete) {
        onComplete();
      }
    }, duration);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onComplete, duration]);

  return (
    <div className="space-y-3 py-2">
      {/* 分析中 */}
      <div className="flex items-center gap-2 text-sm">
        <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
          {currentStep >= 0 && (
            <Loader2 className="w-3 h-3 text-primary animate-spin" />
          )}
        </div>
        <span className={`transition-opacity ${currentStep >= 0 ? 'opacity-100' : 'opacity-50'}`}>
          分析中...
        </span>
      </div>

      {/* 检索医学循证知识库 */}
      <div className="flex items-start gap-2 text-sm">
        <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
          {currentStep >= 1 && (
            <Search className="w-3 h-3 text-primary animate-pulse" />
          )}
        </div>
        <div className={`flex-1 transition-opacity ${currentStep >= 1 ? 'opacity-100' : 'opacity-50'}`}>
          <div>检索医学循证知识库中...</div>
          {currentStep >= 2 && (
            <div className="text-xs text-muted-foreground mt-1 animate-fade-in">
              从1000万+医学文献和专家共识中寻找循证依据
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
