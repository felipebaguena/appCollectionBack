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

  @OneToMany(() => Image, (image) => image.game)
  images: Image[];
}
