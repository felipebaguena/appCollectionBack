import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Article } from './article.entity';
import { User } from '../users/user.entity';

@Entity()
export class Comment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  content: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ default: false })
  isEdited: boolean;

  @ManyToOne(() => Article, (article) => article.comments)
  article: Article;

  @Column()
  articleId: number;

  @ManyToOne(() => User, (user) => user.comments)
  user: User;

  @Column({ nullable: true })
  userId: number;
}
