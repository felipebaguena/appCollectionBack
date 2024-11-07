import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Game } from '../games/game.entity';
import { Platform } from '../platforms/platform.entity';
import { Genre } from '../genres/genre.entity';
import { Developer } from '../developers/developer.entity';

@Entity()
export class Article {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt: Date;

  @Column({ default: false })
  published: boolean;

  @ManyToMany(() => Game, (game) => game.articles)
  @JoinTable()
  relatedGames: Game[];

  @ManyToMany(() => Platform, (platform) => platform.articles)
  @JoinTable()
  relatedPlatforms: Platform[];

  @ManyToMany(() => Developer, (developer) => developer.articles)
  @JoinTable()
  relatedDevelopers: Developer[];

  @ManyToMany(() => Genre, (genre) => genre.articles)
  @JoinTable()
  relatedGenres: Genre[];
}
