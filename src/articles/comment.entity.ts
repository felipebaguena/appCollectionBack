import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  OneToMany,
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

  @ManyToOne(() => Comment, (comment) => comment.replies)
  @JoinColumn({ name: 'parentId' })
  parent: Comment;

  @Column({ nullable: true })
  parentId: number;

  @OneToMany(() => Comment, (comment) => comment.parent)
  replies: Comment[];

  @Column({ default: false })
  read: boolean;
}
