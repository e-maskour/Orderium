import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
    JoinColumn,
    Index,
} from 'typeorm';
import { Portal } from '../../portal/entities/portal.entity';
import { Printer } from './printer.entity';

export type PrintMethod = 'epson-epos' | 'star-webprnt' | 'qztray' | 'browser';
export type PrintStatus = 'success' | 'failed' | 'fallback';

@Entity('print_jobs')
@Index(['printedAt'])
export class PrintJob {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'printer_id', type: 'uuid', nullable: true })
    printerId: string | null;

    @ManyToOne(() => Printer, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'printer_id' })
    printer: Printer | null;

    @Column({ name: 'user_id', type: 'int', nullable: true })
    userId: number | null;

    @ManyToOne(() => Portal, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'user_id' })
    user: Portal | null;

    @Column({ name: 'document_type', length: 30 })
    documentType: string;

    @Column({ name: 'document_id', type: 'uuid', nullable: true })
    documentId: string | null;

    @Column({ type: 'varchar', length: 30, nullable: true })
    method: PrintMethod | null;

    @Column({ type: 'varchar', length: 20, default: 'success' })
    status: PrintStatus;

    @Column({ name: 'duration_ms', type: 'int', nullable: true })
    durationMs: number | null;

    @Column({ name: 'error_message', type: 'text', nullable: true })
    errorMessage: string | null;

    @CreateDateColumn({ name: 'printed_at' })
    printedAt: Date;
}
