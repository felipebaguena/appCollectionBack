import { ProfileStats } from './profile-stats.interface';
import { YearlyStats } from './yearly-stats.interface';

export interface FriendDetail {
  id: number;
  nik: string;
  avatarPath?: string;
  friendsSince: Date;
  profileStats: ProfileStats;
  yearlyStats: YearlyStats;
}
