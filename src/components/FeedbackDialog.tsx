import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feedbackId: string;
  suggestionContent: string;
  onSuccess?: () => void;
}

export default function FeedbackDialog({
  open,
  onOpenChange,
  feedbackId,
  suggestionContent,
  onSuccess,
}: FeedbackDialogProps) {
  const [actionTaken, setActionTaken] = useState<string>('yes');
  const [outcomeDescription, setOutcomeDescription] = useState('');
  const [bloodSugarBefore, setBloodSugarBefore] = useState('');
  const [bloodSugarAfter, setBloodSugarAfter] = useState('');
  const [effectivenessScore, setEffectivenessScore] = useState('5');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (actionTaken === 'yes' && !outcomeDescription.trim()) {
      toast.error('请描述执行结果');
      return;
    }

    setSubmitting(true);

    try {
      const updates: any = {
        action_taken: actionTaken === 'yes',
      };

      if (actionTaken === 'yes') {
        updates.outcome_description = outcomeDescription;
        
        if (bloodSugarBefore) {
          updates.blood_sugar_before = parseFloat(bloodSugarBefore);
        }
        if (bloodSugarAfter) {
          updates.blood_sugar_after = parseFloat(bloodSugarAfter);
        }
        if (effectivenessScore) {
          updates.effectiveness_score = parseInt(effectivenessScore);
        }
      }

      const { error } = await supabase
        .from('feedback_records')
        .update(updates)
        .eq('id', feedbackId);

      if (error) throw error;

      toast.success('反馈提交成功！');
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('提交反馈失败:', error);
      toast.error('提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card max-w-2xl">
        <DialogHeader>
          <DialogTitle className="gradient-text">建议执行反馈</DialogTitle>
          <DialogDescription>
            请告诉我们您是否执行了这条建议，以及执行效果如何
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 建议内容 */}
          <div className="bg-muted/50 rounded-2xl p-4">
            <Label className="text-sm font-medium mb-2 block">糖博士的建议：</Label>
            <p className="text-sm">{suggestionContent}</p>
          </div>

          {/* 是否执行 */}
          <div className="space-y-2">
            <Label>您执行了这条建议吗？</Label>
            <RadioGroup value={actionTaken} onValueChange={setActionTaken}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="yes" />
                <Label htmlFor="yes" className="cursor-pointer">是的，我执行了</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="no" />
                <Label htmlFor="no" className="cursor-pointer">还没有执行</Label>
              </div>
            </RadioGroup>
          </div>

          {/* 如果执行了，显示详细反馈表单 */}
          {actionTaken === 'yes' && (
            <>
              {/* 执行结果描述 */}
              <div className="space-y-2">
                <Label htmlFor="outcome">执行结果描述 *</Label>
                <Textarea
                  id="outcome"
                  placeholder="请描述执行这条建议后的感受和变化，例如：按照建议减少了晚餐的米饭量，第二天早上空腹血糖从7.5降到了6.8"
                  value={outcomeDescription}
                  onChange={(e) => setOutcomeDescription(e.target.value)}
                  className="soft-input min-h-[100px]"
                />
              </div>

              {/* 血糖数据 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="before">执行前血糖 (mmol/L)</Label>
                  <Input
                    id="before"
                    type="number"
                    step="0.1"
                    placeholder="例如：7.5"
                    value={bloodSugarBefore}
                    onChange={(e) => setBloodSugarBefore(e.target.value)}
                    className="soft-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="after">执行后血糖 (mmol/L)</Label>
                  <Input
                    id="after"
                    type="number"
                    step="0.1"
                    placeholder="例如：6.8"
                    value={bloodSugarAfter}
                    onChange={(e) => setBloodSugarAfter(e.target.value)}
                    className="soft-input"
                  />
                </div>
              </div>

              {/* 效果评分 */}
              <div className="space-y-2">
                <Label htmlFor="score">效果评分 (1-10分)</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="score"
                    type="range"
                    min="1"
                    max="10"
                    value={effectivenessScore}
                    onChange={(e) => setEffectivenessScore(e.target.value)}
                    className="flex-1"
                  />
                  <span className="text-2xl font-bold gradient-text w-12 text-center">
                    {effectivenessScore}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  1分=完全没效果，10分=效果非常好
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-3xl"
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="soft-button"
          >
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            提交反馈
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
