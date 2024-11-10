import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
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

  @Column({ name: 'article_id', nullable: true })
  articleId: number;

  @Column({ name: 'game_id', nullable: true })
  gameId: number;

  @ManyToOne(() => Article, (article) => article.images, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'article_id' })
  article: Article;

  @ManyToOne(() => Game, (game) => game.articleImages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'game_id' })
  game: Game;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  order: number;
}
