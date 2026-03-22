import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

export enum DevicePlatform {
  WEB = 'web',
  ANDROID = 'android',
  IOS = 'ios',
}

export enum AppType {
  CLIENT = 'client',
  BACKOFFICE = 'backoffice',
  DELIVERY = 'delivery',
}

@Entity('device_tokens')
@Index(['userId'])
@Index(['platform'])
@Index(['appType'])
@Index(['isActive'])
@Unique(['token']) // FCM tokens are unique globally
export class DeviceToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  userId: number;

  @Column({ type: 'text' })
  token: string;

  @Column({
    type: 'enum',
    enum: DevicePlatform,
    default: DevicePlatform.WEB,
  })
  platform: DevicePlatform;

  @Column({
    type: 'enum',
    enum: AppType,
  })
  appType: AppType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  deviceName: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  browserName: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  osName: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt: Date | null;

  @CreateDateColumn()
  dateCreated: Date;

  @UpdateDateColumn()
  dateUpdated: Date;
}
