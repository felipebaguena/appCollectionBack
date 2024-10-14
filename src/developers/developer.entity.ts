import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { Game } from '../games/game.entity';

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
}
