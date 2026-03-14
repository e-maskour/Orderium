import {
    Entity,
    PrimaryColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { DriveNode } from './drive-node.entity';
import { DriveTag } from './drive-tag.entity';

@Entity('drive_node_tags')
@Index(['tagId'])
export class DriveNodeTag {
    @PrimaryColumn({ name: 'node_id', type: 'uuid' })
    nodeId: string;

    @PrimaryColumn({ name: 'tag_id', type: 'int' })
    tagId: number;

    @ManyToOne(() => DriveNode, (n) => n.nodeTags, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'node_id' })
    node: DriveNode;

    @ManyToOne(() => DriveTag, (t) => t.nodeTags, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'tag_id' })
    tag: DriveTag;
}
