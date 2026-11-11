import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { PlanFeatures } from '../../tenant/plan-features';
import { numericTransformer } from '../../../common/transformers/numeric.transformer';

@Entity('subscription_plans')
export class SubscriptionPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Internal key: 'trial' | 'starter' | 'business' | 'pro' | 'enterprise' */
  @Column({ type: 'varchar', length: 50, unique: true })
  name: string;

  /** Human label displayed in UI */
  @Column({ type: 'varchar', length: 100 })
  displayName: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  priceMonthly: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  priceYearly: number;

  @Column({ type: 'varchar', length: 3, default: 'MAD' })
  currency: string;

  @Column({ type: 'int' })
  maxUsers: number;

  @Column({ type: 'int' })
  maxProducts: number;

  @Column({ type: 'int' })
  maxOrdersPerMonth: number;

  @Column({ type: 'int' })
  maxStorageMb: number;

  /** -1 = unlimited (same convention for every limit). */
  @Column({ type: 'int', default: 1 })
  maxWarehouses: number;

  @Column({ type: 'int', default: 0 })
  maxDeliveryPersons: number;

  /** Feature flags: { pos, delivery, client_portal, reports } */
  @Column({ type: 'jsonb', default: '{}' })
  features: PlanFeatures;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
