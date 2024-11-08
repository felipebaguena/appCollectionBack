import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Image } from '../images/image.entity';
import { Platform } from '../platforms/platform.entity';
import { Genre } from '../genres/genre.entity';
import { Developer } from '../developers/developer.entity';
import { Article } from '../articles/article.entity';
import { ArticleImage } from '../article-images/article-image.entity';

@Entity()
export class Game {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @ManyToMany(() => Platform)
  @JoinTable()
  platforms: Platform[];

  @ManyToMany(() => Genre, (genre) => genre.games)
  @JoinTable()
  genres: Genre[];

  @Column({ name: 'release_year' })
  releaseYear: number;

  @Column('text')
  description: string;

  @Column({ nullable: true })
  coverId: number;

  @OneToMany(() => Image, (image) => image.game, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  images: Image[];

  @ManyToMany(() => Developer)
  @JoinTable()
  developers: Developer[];

  @ManyToMany(() => Article, (article) => article.relatedGames)
  articles: Article[];

  @OneToMany(() => ArticleImage, (image) => image.game)
  articleImages: ArticleImage[];
}
