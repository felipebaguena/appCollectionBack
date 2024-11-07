import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { Game } from '../games/game.entity';
import { Article } from '../articles/article.entity';

@Entity()
export class Genre {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  code: string;

  @ManyToMany(() => Game, (game) => game.genres)
  games: Game[];

  @ManyToMany(() => Article, (article) => article.relatedGenres)
  articles: Article[];
}
