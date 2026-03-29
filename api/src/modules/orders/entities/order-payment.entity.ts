import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';
import { Order } from './order.entity';
import { Partner } from '../../partners/entities/partner.entity';
import { numericTransformer } from '../../../common/transformers/numeric.transformer';

export enum OrderPaymentType {
    CASH = 'cash',
    CHECK = 'check',
    BANK_TRANSFER = 'bank_transfer',
    CREDIT_CARD = 'credit_card',
    MOBILE_PAYMENT = 'mobile_payment',
    OTHER = 'other',
}

@Entity('order_payments')
@Index(['orderId'])
@Index(['customerId'])
export class OrderPayment {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Order, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'orderId' })
    order: Order;

    @Column({ type: 'int' })
    orderId: number;

    @ManyToOne(() => Partner, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'customerId' })
    customer: Partner;

    @Column({ type: 'int', nullable: true })
    customerId: number | null;

    @Column('decimal', {
        precision: 18,
        scale: 2,
        transformer: numericTransformer,
    })
    amount: number;

    @Column({ type: 'date' })
    paymentDate: string;

    @Column({
        type: 'enum',
        enum: OrderPaymentType,
        default: OrderPaymentType.CASH,
    })
    paymentType: OrderPaymentType;

    @Column({ type: 'text', nullable: true })
    notes: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true })
    referenceNumber: string | null;

    @CreateDateColumn({ name: 'date_created' })
    dateCreated: Date;

    @UpdateDateColumn({ name: 'date_updated' })
    dateUpdated: Date;
}
