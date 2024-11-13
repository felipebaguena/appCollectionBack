import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Game } from '../games/game.entity';
import { Platform } from '../platforms/platform.entity';

@Entity()
export class UserGame {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.userGames)
  user: User;

  @ManyToOne(() => Game, (game) => game.userGames, {
    onDelete: 'CASCADE',
  })
  game: Game;

  @ManyToMany(() => Platform)
  @JoinTable({
    name: 'user_game_platforms',
    joinColumn: { name: 'userGameId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'platformId', referencedColumnName: 'id' },
  })
  platforms: Platform[];

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
