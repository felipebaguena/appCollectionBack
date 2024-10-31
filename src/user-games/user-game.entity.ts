import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { User } from '../users/user.entity';
import { Game } from '../games/game.entity';

@Entity()
export class UserGame {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.userGames)
  user: User;

  @ManyToOne(() => Game)
  game: Game;

  @Column({ type: 'decimal', precision: 2, scale: 1, nullable: true })
  rating: number;

  @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true })
  status: number;

  @Column({ default: false })
  complete: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  addedAt: Date;
}
