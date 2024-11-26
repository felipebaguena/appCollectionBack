export interface UserBasic {
  id: number;
  nik: string;
  avatarPath?: string;
  isFriend: boolean;
  hasPendingFriendRequest: boolean;
  isOnline: boolean;
  lastSeen: Date;
}
