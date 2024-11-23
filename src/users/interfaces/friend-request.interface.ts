export interface FriendRequest {
  id: number;
  sender: {
    id: number;
    name: string;
    nik: string;
    avatarPath?: string;
  };
  message?: string;
  createdAt: Date;
}
