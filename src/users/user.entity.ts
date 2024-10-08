import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Role } from '../roles/role.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column()
  password: string;

  @ManyToOne(() => Role, role => role.users)
  role: Role;
}