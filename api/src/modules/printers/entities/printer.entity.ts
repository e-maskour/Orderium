import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToMany,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';
import { PrintJob } from './print-job.entity';

export type PrinterBrand = 'epson' | 'star' | 'generic' | 'qztray' | 'browser';
export type ConnectionType = 'wifi' | 'usb' | 'network' | 'browser';
export type PaperWidth = 58 | 80 | 210;
export type DocumentType =
    | 'receipt'
    | 'bl'
    | 'devis'
    | 'bon_commande'
    | 'pos'
    | 'stock';

@Entity('printers')
@Index(['name'], { unique: true })
export class Printer {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 60 })
    name: string;

    @Column({ type: 'varchar', length: 20 })
    brand: PrinterBrand;

    @Column({ name: 'connection_type', type: 'varchar', length: 20 })
    connectionType: ConnectionType;

    @Column({ type: 'varchar', length: 60, nullable: true })
    model: string | null;

    @Column({ type: 'inet', nullable: true })
    ip: string | null;

    @Column({ type: 'int', default: 8008 })
    port: number;

    @Column({ name: 'paper_width', type: 'smallint', default: 80 })
    paperWidth: PaperWidth;

    @Column({ name: 'is_default', type: 'boolean', default: false })
    isDefault: boolean;

    @Column({ name: 'document_types', type: 'text', array: true, default: '{}' })
    documentTypes: DocumentType[];

    @Column({ name: 'last_seen_at', type: 'timestamptz', nullable: true })
    lastSeenAt: Date | null;

    @Column({ name: 'is_enabled', type: 'boolean', default: true })
    isEnabled: boolean;

    @OneToMany(() => PrintJob, (job) => job.printer)
    printJobs: PrintJob[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
