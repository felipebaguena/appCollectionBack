export interface UserBasic {
  id: number;
  nik: string;
  avatarPath?: string;
  isFriend: boolean;
  hasPendingFriendRequest: boolean;
}
