export interface CommentDto {
  id: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  isEdited: boolean;
  parentId: number | null;
  read: boolean;
  user: {
    id: number;
    name: string;
    nik: string;
    avatarPath?: string;
    isFriend?: boolean;
    isPending?: boolean;
    isOnline?: boolean;
  };
  replies?: CommentDto[];
}
