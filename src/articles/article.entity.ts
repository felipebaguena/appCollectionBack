import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToMany,
  JoinTable,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Game } from '../games/game.entity';
import { Platform } from '../platforms/platform.entity';
import { Genre } from '../genres/genre.entity';
import { Developer } from '../developers/developer.entity';
import { ArticleImage } from '../article-images/article-image.entity';
import { ArticleTemplate } from '../article-templates/article-template.entity';
import { Comment } from './comment.entity';

@Entity()
export class Article {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ nullable: true })
  subtitle: string;

  @Column('text')
  content: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

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

  @ManyToMany(() => ArticleImage, (image) => image.articles)
  @JoinTable({
    name: 'article_images_articles',
    joinColumn: {
      name: 'article_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'image_id',
      referencedColumnName: 'id',
    },
  })
  images: ArticleImage[];

  @Column({ nullable: true })
  coverImageId: number;

  @ManyToOne(() => ArticleTemplate, (template) => template.articles)
  @JoinColumn({ name: 'template_id' })
  template: ArticleTemplate;

  @Column({ name: 'template_id', nullable: true })
  templateId: number;

  @Column({ type: 'timestamp', nullable: true })
  scheduledPublishAt: Date;

  @OneToMany(() => Comment, (comment) => comment.article)
  comments: Comment[];
}
