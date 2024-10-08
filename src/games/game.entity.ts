import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
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
}