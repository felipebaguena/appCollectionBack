export interface MessageDto {
  id: number;
  content: string;
  createdAt: Date;
  read: boolean;
  sender: {
    id: number;
    name: string;
    nik: string;
    avatarPath?: string;
  };
  receiver: {
    id: number;
    name: string;
    nik: string;
    avatarPath?: string;
  };
}
