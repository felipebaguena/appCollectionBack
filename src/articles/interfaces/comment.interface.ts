export interface CommentDto {
  id: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  isEdited: boolean;
  user: {
    id: number;
    name: string;
    nik: string;
    avatarPath?: string;
  };
}
