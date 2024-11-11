import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Article } from '../articles/article.entity';
import { Game } from '../games/game.entity';

@Entity()
export class ArticleImage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  filename: string;

  @Column()
  path: string;

  @Column({ name: 'is_cover', default: false })
  isCover: boolean;

  @Column({ name: 'game_id', nullable: true })
  gameId: number;

  @ManyToOne(() => Game, (game) => game.articleImages, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'game_id' })
  game: Game;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  order: number;

  @ManyToMany(() => Article, (article) => article.images)
  articles: Article[];
}
