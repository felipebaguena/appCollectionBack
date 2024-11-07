import { Game } from 'src/games/game.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToMany,
} from 'typeorm';
import { Article } from 'src/articles/article.entity';

@Entity()
export class Platform {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  code: string;

  @OneToMany(() => Game, (game) => game.platforms)
  games: Game[];

  @ManyToMany(() => Article, (article) => article.relatedPlatforms)
  articles: Article[];
}
