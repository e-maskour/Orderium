import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import {
  BaseDocument,
  BaseStandardItem,
} from '../../../common/entities/base-document.entity';

export enum QuoteStatus {
  DRAFT = 'draft', // Brouillons
  OPEN = 'open', // Ouvert
  SIGNED = 'signed', // Signée (à facturer)
  CLOSED = 'closed', // Non signée (fermée)
  DELIVERED = 'delivered', // Convertie en bon de livraison seulement
  INVOICED = 'invoiced', // Convertie en facture (avec ou sans bon)
}

@Entity('quotes')
@Index(['documentNumber'])
@Index(['customerId'])
@Index(['date'])
@Index(['expirationDate'])
export class Quote extends BaseDocument {
  // Override documentNumber to use quoteNumber for backwards compatibility
  get quoteNumber(): string {
    return this.documentNumber;
  }

  set quoteNumber(value: string) {
    this.documentNumber = value;
  }

  @Column({ type: 'date', nullable: true })
  expirationDate: Date | null;

  @Column({
    type: 'enum',
    enum: QuoteStatus,
    default: QuoteStatus.DRAFT,
  })
  status: QuoteStatus;

  // isValidated and notes inherited from BaseDocument

  @Column({ type: 'text', nullable: true })
  clientNotes: string | null; // Notes added by client when signing

  @Column({ type: 'varchar', length: 255, nullable: true })
  signedBy: string | null; // Name of person who signed

  @Column({ type: 'timestamp', nullable: true })
  signedDate: Date | null; // Date when quote was signed

  @Column({ type: 'varchar', length: 100, nullable: true, unique: true })
  shareToken: string | null; // Token for sharing with client

  @Column({ type: 'timestamp', nullable: true })
  shareTokenExpiry: Date | null; // Expiry date for share token

  @Column({ type: 'int', nullable: true })
  convertedToInvoiceId: number | null; // Reference to invoice if converted

  @Column({ type: 'int', nullable: true })
  convertedToOrderId: number | null; // Reference to order (bon de livraison) if converted

  // dateCreated, dateUpdated, and customer relationship inherited from BaseDocument

  @OneToMany(() => QuoteItem, (item) => item.quote)
  items: QuoteItem[];
}

@Entity('quote_items')
@Index(['quoteId'])
@Index(['productId'])
export class QuoteItem extends BaseStandardItem {
  @ManyToOne(() => Quote, (quote) => quote.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quoteId' })
  quote: Quote;

  @Column({ type: 'int' })
  quoteId: number;

  // product relationship and productId inherited from BaseStandardItem
}
