export interface ConversationPreview {
  friend: {
    id: number;
    name: string;
    nik: string;
    avatarPath?: string;
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
