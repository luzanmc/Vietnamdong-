export interface QuestDef {
  code: string;
  titleVi: string;
  titleEn: string;
  descVi: string;
  descEn: string;
  target: number;
  reward: number;
  period: 'week' | 'month';
}

export const QUESTS: QuestDef[] = [
  {
    code: 'weekly_tasks_20',
    titleVi: 'Nhiệm vụ tuần',
    titleEn: 'Weekly Quest',
    descVi: 'Hoàn thành 20 nhiệm vụ trong tuần này',
    descEn: 'Complete 20 tasks this week',
    target: 20,
    reward: 20,
    period: 'week',
  },
  {
    code: 'monthly_tasks_100',
    titleVi: 'Nhiệm vụ tháng',
    titleEn: 'Monthly Quest',
    descVi: 'Hoàn thành 100 nhiệm vụ trong tháng này',
    descEn: 'Complete 100 tasks this month',
    target: 100,
    reward: 100,
    period: 'month',
  },
];

export function currentPeriodKey(period: 'week' | 'month', now = new Date()): string {
  if (period === 'month') {
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  }
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function periodStart(period: 'week' | 'month', now = new Date()): Date {
  if (period === 'month') {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }
  const day = now.getUTCDay() || 7;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - day + 1);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}
