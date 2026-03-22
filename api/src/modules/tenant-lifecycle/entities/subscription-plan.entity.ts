import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';
import { numericTransformer } from '../../../common/transformers/numeric.transformer';

@Entity('subscription_plans')
export class SubscriptionPlan {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    /** Internal key: 'trial' | 'basic' | 'pro' | 'enterprise' */
    @Column({ type: 'varchar', length: 50, unique: true })
    name: string;

    /** Human label displayed in UI */
    @Column({ type: 'varchar', length: 100 })
    displayName: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, transformer: numericTransformer })
    priceMonthly: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, transformer: numericTransformer })
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

    /** Feature flags: { delivery, reports, api_access, white_label } */
    @Column({ type: 'jsonb', default: '{}' })
    features: Record<string, boolean>;

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @Column({ type: 'int', default: 0 })
    sortOrder: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
