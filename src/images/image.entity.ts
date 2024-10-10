import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Game } from '../games/game.entity';

@Entity('image')
export class Image {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  filename: string;

  @Column()
  path: string;

  @Column({ name: 'is_cover' })
  isCover: boolean;

  @Column({ name: 'game_id' })
  gameId: number;

  @ManyToOne(() => Game, game => game.images)
  @JoinColumn({ name: 'game_id' })
  game: Game;
}