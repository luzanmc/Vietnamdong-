export interface AchievementStats {
  tasksCompleted: number;
  streakDays: number;
  referredCount: number;
  lifetimeEarned: number;
}

export type AchievementMetric = keyof AchievementStats;

export interface AchievementDef {
  code: string;
  icon: string;
  titleVi: string;
  titleEn: string;
  descVi: string;
  descEn: string;
  metric: AchievementMetric;
  target: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    code: 'first_task',
    icon: 'bi-flag-fill',
    titleVi: 'Bước đầu tiên',
    titleEn: 'First Step',
    descVi: 'Hoàn thành nhiệm vụ đầu tiên',
    descEn: 'Complete your first task',
    metric: 'tasksCompleted',
    target: 1,
  },
  {
    code: 'tasks_10',
    icon: 'bi-lightning-fill',
    titleVi: 'Chăm chỉ',
    titleEn: 'Hard Worker',
    descVi: 'Hoàn thành 10 nhiệm vụ',
    descEn: 'Complete 10 tasks',
    metric: 'tasksCompleted',
    target: 10,
  },
  {
    code: 'tasks_50',
    icon: 'bi-fire',
    titleVi: 'Cày cuốc',
    titleEn: 'Grinder',
    descVi: 'Hoàn thành 50 nhiệm vụ',
    descEn: 'Complete 50 tasks',
    metric: 'tasksCompleted',
    target: 50,
  },
  {
    code: 'tasks_200',
    icon: 'bi-trophy-fill',
    titleVi: 'Huyền thoại nhiệm vụ',
    titleEn: 'Task Legend',
    descVi: 'Hoàn thành 200 nhiệm vụ',
    descEn: 'Complete 200 tasks',
    metric: 'tasksCompleted',
    target: 200,
  },
  {
    code: 'streak_3',
    icon: 'bi-calendar-check',
    titleVi: 'Đều đặn',
    titleEn: 'Consistent',
    descVi: 'Điểm danh 3 ngày liên tiếp',
    descEn: '3-day check-in streak',
    metric: 'streakDays',
    target: 3,
  },
  {
    code: 'streak_7',
    icon: 'bi-calendar2-week',
    titleVi: 'Một tuần vàng',
    titleEn: 'Golden Week',
    descVi: 'Điểm danh 7 ngày liên tiếp',
    descEn: '7-day check-in streak',
    metric: 'streakDays',
    target: 7,
  },
  {
    code: 'streak_30',
    icon: 'bi-calendar-heart',
    titleVi: 'Kiên trì',
    titleEn: 'Persistent',
    descVi: 'Điểm danh 30 ngày liên tiếp',
    descEn: '30-day check-in streak',
    metric: 'streakDays',
    target: 30,
  },
  {
    code: 'referral_1',
    icon: 'bi-person-plus-fill',
    titleVi: 'Người kết nối',
    titleEn: 'Connector',
    descVi: 'Mời thành công 1 người bạn',
    descEn: 'Successfully refer 1 friend',
    metric: 'referredCount',
    target: 1,
  },
  {
    code: 'referral_5',
    icon: 'bi-people-fill',
    titleVi: 'Đại sứ',
    titleEn: 'Ambassador',
    descVi: 'Mời thành công 5 người bạn',
    descEn: 'Successfully refer 5 friends',
    metric: 'referredCount',
    target: 5,
  },
  {
    code: 'earned_1000',
    icon: 'bi-gem',
    titleVi: 'Nghìn đầu tiên',
    titleEn: 'First Thousand',
    descVi: 'Kiếm được tổng cộng 1.000 VNC',
    descEn: 'Earn a total of 1,000 VNC',
    metric: 'lifetimeEarned',
    target: 1000,
  },
  {
    code: 'earned_10000',
    icon: 'bi-gem',
    titleVi: 'Triệu phú VNC',
    titleEn: 'VNC Millionaire',
    descVi: 'Kiếm được tổng cộng 10.000 VNC',
    descEn: 'Earn a total of 10,000 VNC',
    metric: 'lifetimeEarned',
    target: 10000,
  },
];
