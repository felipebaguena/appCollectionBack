export interface ConversationPreview {
  friend: {
    id: number;
    name: string;
    nik: string;
    avatarPath?: string;
    isOnline: boolean;
    lastSeen: Date;
  };
  lastMessage: {
    id: number;
    content: string;
    createdAt: Date;
    read: boolean;
    isFromMe: boolean;
  };
  unreadCount: number;
}
