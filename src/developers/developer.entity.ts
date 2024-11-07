import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { Game } from '../games/game.entity';
import { Article } from '../articles/article.entity';

@Entity()
export class Developer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  code: string;

  @ManyToMany(() => Game, (game) => game.developers)
  games: Game[];

  @ManyToMany(() => Article, (article) => article.relatedDevelopers)
  articles: Article[];
}
