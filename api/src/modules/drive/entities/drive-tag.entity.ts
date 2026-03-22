import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { DriveNodeTag } from './drive-node-tag.entity';

@Entity('drive_tags')
export class DriveTag {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 7, nullable: true })
  color: string | null;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number | null;

  @OneToMany(() => DriveNodeTag, (nt) => nt.tag)
  nodeTags: DriveNodeTag[];
}
