import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Image } from '../images/image.entity';

@Entity('game')
export class Game {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  platform: string;

  @Column({ name: 'release_year' })
  releaseYear: number;

  @Column('text')
  description: string;

  @Column({ nullable: true })
  coverId: number;

  @OneToMany(() => Image, image => image.game)
  images: Image[];
}