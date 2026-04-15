import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../../context/LanguageContext';
import { AdminLayout } from '../../components/AdminLayout';
import { PageHeader } from '../../components/PageHeader';
import { driveService, DriveNode, formatBytes } from '../../modules/drive';
import type { IBrowseFile, IBrowseFolder, IBrowseStorageResult } from '../../modules/drive';
import {
  HardDrive,
  FolderPlus,
  Upload,
  Search,
  Grid3x3,
  List,
  Trash2,
  RefreshCw,
  Star,
  Users,
  ChevronRight,
  Home,
  Folder,
  FolderOpen,
  File,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileCode,
  FileArchive,
  MoreVertical,
  X,
  Lock,
  Link,
  MessageCircle,
  SortAsc,
  SortDesc,
  Eye,
  Download,
  AlertTriangle,
  Database,
} from 'lucide-react';
import {
  toastSuccess,
  toastError,
  toastDeleted,
  toastCreated,
  toastConfirm,
} from '../../services/toast.service';
import { EmptyState } from '../../components/EmptyState';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dialog } from 'primereact/dialog';
import { ProgressBar } from 'primereact/progressbar';
import { Menu } from 'primereact/menu';
import { MenuItem } from 'primereact/menuitem';

// ─── Types ────────────────────────────────────────────────────────────────────

type DriveView = 'browse' | 'shared' | 'trash' | 'starred';
type ViewMode = 'grid' | 'list';
type SortKey = 'name' | 'date' | 'size' | 'type';

interface BreadcrumbEntry {
  prefix: string;
  name: string;
}

type BrowseItem = { kind: 'folder'; data: IBrowseFolder } | { kind: 'file'; data: IBrowseFile };

// ─── MIME helpers ─────────────────────────────────────────────────────────────

function getMimeLucideIcon(mime?: string | null): typeof File {
  if (!mime) return File;
  if (mime.startsWith('image/')) return FileImage;
  if (mime.startsWith('video/')) return FileVideo;
  if (mime.startsWith('audio/')) return FileAudio;
  if (mime.includes('pdf') || mime.includes('word') || mime.includes('text')) return FileText;
  if (mime.includes('zip') || mime.includes('tar') || mime.includes('gz') || mime.includes('rar'))
    return FileArchive;
  if (
    mime.includes('javascript') ||
    mime.includes('json') ||
    mime.includes('xml') ||
    mime.includes('html')
  )
    return FileCode;
  return File;
}

function getMimeAccentColor(mime?: string | null): string {
  if (!mime) return '#6366f1';
  if (mime.startsWith('image/')) return '#10b981';
  if (mime.startsWith('video/')) return '#8b5cf6';
  if (mime.startsWith('audio/')) return '#ec4899';
  if (mime.includes('pdf')) return '#ef4444';
  if (mime.includes('word') || mime.includes('document')) return '#3b82f6';
  if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv')) return '#22c55e';
  if (mime.includes('zip') || mime.includes('tar') || mime.includes('gz')) return '#f59e0b';
  return '#6366f1';
}

function guessMime(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mp3: 'audio/mpeg',
    zip: 'application/zip',
    gz: 'application/gzip',
    rar: 'application/rar',
    json: 'application/json',
    xml: 'application/xml',
    js: 'text/javascript',
    ts: 'text/typescript',
    html: 'text/html',
    css: 'text/css',
    csv: 'text/csv',
    txt: 'text/plain',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  return map[ext] ?? 'application/octet-stream';
}

// ─── Loading Skeletons ───────────────────────────────────────────────────────

function SkeletonCard({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === 'list') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.625rem 1rem',
          borderRadius: '0.5rem',
          background: 'rgba(0,0,0,0.02)',
        }}
      >
        <div
          style={{
            width: '2rem',
            height: '2rem',
            borderRadius: '0.5rem',
            background: '#e2e8f0',
            animation: 'pulse 1.5s ease-in-out infinite',
            flexShrink: 0,
          }}
        />
        <div
          style={{
            flex: 1,
            height: '0.875rem',
            borderRadius: '0.375rem',
            background: '#e2e8f0',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
        <div
          style={{
            width: '4rem',
            height: '0.75rem',
            borderRadius: '0.375rem',
            background: '#e2e8f0',
            animation: 'pulse 1.5s ease-in-out infinite',
            flexShrink: 0,
          }}
        />
        <div
          style={{
            width: '6rem',
            height: '0.75rem',
            borderRadius: '0.375rem',
            background: '#e2e8f0',
            animation: 'pulse 1.5s ease-in-out infinite',
            flexShrink: 0,
          }}
        />
      </div>
    );
  }
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.625rem',
        padding: '1.25rem 1rem',
        borderRadius: '0.875rem',
        background: 'rgba(255,255,255,0.8)',
        border: '1.5px solid rgba(226,232,240,0.7)',
      }}
    >
      <div
        style={{
          width: '3.5rem',
          height: '3.5rem',
          borderRadius: '1rem',
          background: '#e2e8f0',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}
      />
      <div
        style={{
          width: '70%',
          height: '0.8125rem',
          borderRadius: '0.375rem',
          background: '#e2e8f0',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}
      />
      <div
        style={{
          width: '45%',
          height: '0.6875rem',
          borderRadius: '0.375rem',
          background: '#e2e8f0',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}
      />
    </div>
  );
}

// ─── Browse Folder Card ───────────────────────────────────────────────────────

interface BrowseFolderCardProps {
  folder: IBrowseFolder;
  viewMode: ViewMode;
  isSelected: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

function BrowseFolderCard({
  folder,
  viewMode,
  isSelected,
  onSelect,
  onOpen,
  onContextMenu,
}: BrowseFolderCardProps) {
  const [hovered, setHovered] = useState(false);
  const FolderIcon = hovered ? FolderOpen : Folder;

  if (viewMode === 'list') {
    return (
      <div
        onClick={onSelect}
        onDoubleClick={onOpen}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.625rem 1rem',
          borderRadius: '0.5rem',
          background: isSelected
            ? 'rgba(35,90,228,0.08)'
            : hovered
              ? 'rgba(0,0,0,0.03)'
              : 'transparent',
          border: `1px solid ${isSelected ? 'rgba(35,90,228,0.25)' : 'transparent'}`,
          cursor: 'pointer',
          transition: 'all 0.15s',
          userSelect: 'none',
        }}
      >
        <div
          style={{
            width: '2rem',
            height: '2rem',
            borderRadius: '0.5rem',
            flexShrink: 0,
            background: '#f59e0b18',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <FolderIcon size={16} color="#f59e0b" strokeWidth={2} />
        </div>
        <span
          style={{
            flex: 1,
            fontSize: '0.875rem',
            fontWeight: 500,
            color: '#1e293b',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {folder.name}
        </span>
        <span style={{ width: '6rem', fontSize: '0.8125rem', color: '#94a3b8', flexShrink: 0 }}>
          —
        </span>
        <span style={{ width: '8rem', fontSize: '0.8125rem', color: '#94a3b8', flexShrink: 0 }}>
          —
        </span>
        {(hovered || isSelected) && (
          <Button
            text
            onClick={(e) => {
              e.stopPropagation();
              onContextMenu(e);
            }}
            style={{
              background: 'none',
              padding: '0.25rem',
              borderRadius: '0.375rem',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <MoreVertical size={16} />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={onSelect}
      onDoubleClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.625rem',
        padding: '1.25rem 1rem',
        borderRadius: '0.875rem',
        background: isSelected ? 'rgba(35,90,228,0.06)' : 'rgba(255,255,255,0.8)',
        border: `1.5px solid ${isSelected ? 'rgba(35,90,228,0.4)' : hovered ? 'rgba(226,232,240,1)' : 'rgba(226,232,240,0.7)'}`,
        boxShadow: hovered ? '0 4px 16px rgba(0,0,0,0.06)' : '0 1px 3px rgba(0,0,0,0.03)',
        cursor: 'pointer',
        transition: 'all 0.15s',
        userSelect: 'none',
        minWidth: 0,
      }}
    >
      {(hovered || isSelected) && (
        <Button
          text
          onClick={(e) => {
            e.stopPropagation();
            onContextMenu(e);
          }}
          style={{
            position: 'absolute',
            top: '0.5rem',
            right: '0.5rem',
            background: 'none',
            padding: '0.25rem',
            borderRadius: '0.375rem',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <MoreVertical size={15} />
        </Button>
      )}
      <div
        style={{
          width: '3.5rem',
          height: '3.5rem',
          borderRadius: '1rem',
          background: 'linear-gradient(135deg, #f59e0b22, #f59e0b10)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #f59e0b28',
        }}
      >
        <FolderIcon size={28} color="#f59e0b" strokeWidth={1.8} />
      </div>
      <span
        style={{
          fontSize: '0.8125rem',
          fontWeight: 600,
          color: '#1e293b',
          textAlign: 'center',
          width: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {folder.name}
      </span>
      <span style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>Dossier</span>
    </div>
  );
}

// ─── Browse File Card ─────────────────────────────────────────────────────────

interface BrowseFileCardProps {
  file: IBrowseFile;
  viewMode: ViewMode;
  isSelected: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  systemLabel: string;
}

function BrowseFileCard({
  file,
  viewMode,
  isSelected,
  onSelect,
  onOpen,
  onContextMenu,
  systemLabel,
}: BrowseFileCardProps) {
  const [hovered, setHovered] = useState(false);
  const mime = guessMime(file.name);
  const FileIcon = getMimeLucideIcon(mime);
  const accent = getMimeAccentColor(mime);
  const isSystem = file.source === 'system';

  if (viewMode === 'list') {
    return (
      <div
        onClick={onSelect}
        onDoubleClick={onOpen}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.625rem 1rem',
          borderRadius: '0.5rem',
          background: isSelected
            ? 'rgba(35,90,228,0.08)'
            : hovered
              ? 'rgba(0,0,0,0.03)'
              : 'transparent',
          border: `1px solid ${isSelected ? 'rgba(35,90,228,0.25)' : 'transparent'}`,
          cursor: 'pointer',
          transition: 'all 0.15s',
          userSelect: 'none',
        }}
      >
        <div
          style={{
            width: '2rem',
            height: '2rem',
            borderRadius: '0.5rem',
            flexShrink: 0,
            background: `${accent}18`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <FileIcon size={16} color={accent} strokeWidth={2} />
          {isSystem && (
            <div
              style={{
                position: 'absolute',
                bottom: -3,
                right: -3,
                width: '1rem',
                height: '1rem',
                borderRadius: '50%',
                background: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Lock size={7} color="white" strokeWidth={3} />
            </div>
          )}
        </div>
        <span
          style={{
            flex: 1,
            fontSize: '0.875rem',
            fontWeight: 500,
            color: '#1e293b',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {file.name}
        </span>
        {isSystem && (
          <span
            style={{
              fontSize: '0.6875rem',
              fontWeight: 600,
              color: '#64748b',
              background: 'rgba(100,116,139,0.1)',
              padding: '0.125rem 0.5rem',
              borderRadius: '99px',
              flexShrink: 0,
            }}
          >
            {systemLabel}
          </span>
        )}
        <span style={{ width: '6rem', fontSize: '0.8125rem', color: '#94a3b8', flexShrink: 0 }}>
          {formatBytes(file.sizeBytes)}
        </span>
        <span style={{ width: '8rem', fontSize: '0.8125rem', color: '#94a3b8', flexShrink: 0 }}>
          {new Date(file.lastModified).toLocaleDateString()}
        </span>
        {(hovered || isSelected) && (
          <Button
            text
            onClick={(e) => {
              e.stopPropagation();
              onContextMenu(e);
            }}
            style={{
              background: 'none',
              padding: '0.25rem',
              borderRadius: '0.375rem',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <MoreVertical size={16} />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={onSelect}
      onDoubleClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.625rem',
        padding: '1.25rem 1rem',
        borderRadius: '0.875rem',
        background: isSelected ? 'rgba(35,90,228,0.06)' : 'rgba(255,255,255,0.8)',
        border: `1.5px solid ${isSelected ? 'rgba(35,90,228,0.4)' : hovered ? 'rgba(226,232,240,1)' : 'rgba(226,232,240,0.7)'}`,
        boxShadow: hovered ? '0 4px 16px rgba(0,0,0,0.06)' : '0 1px 3px rgba(0,0,0,0.03)',
        cursor: 'pointer',
        transition: 'all 0.15s',
        userSelect: 'none',
        minWidth: 0,
      }}
    >
      {(hovered || isSelected) && (
        <Button
          text
          onClick={(e) => {
            e.stopPropagation();
            onContextMenu(e);
          }}
          style={{
            position: 'absolute',
            top: '0.5rem',
            right: '0.5rem',
            background: 'none',
            padding: '0.25rem',
            borderRadius: '0.375rem',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <MoreVertical size={15} />
        </Button>
      )}
      {/* System badge */}
      {isSystem && (
        <div
          style={{
            position: 'absolute',
            top: '0.5rem',
            left: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.2rem',
            background: 'rgba(100,116,139,0.12)',
            border: '1px solid rgba(100,116,139,0.2)',
            borderRadius: '99px',
            padding: '0.1rem 0.4rem 0.1rem 0.3rem',
          }}
        >
          <Lock size={9} color="#64748b" strokeWidth={2.5} />
          <span
            style={{
              fontSize: '0.625rem',
              fontWeight: 700,
              color: '#64748b',
              letterSpacing: '0.02em',
            }}
          >
            {systemLabel}
          </span>
        </div>
      )}
      <div
        style={{
          width: '3.5rem',
          height: '3.5rem',
          borderRadius: '1rem',
          background: `linear-gradient(135deg, ${accent}22, ${accent}10)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `1px solid ${accent}28`,
          marginTop: isSystem ? '0.5rem' : '0',
        }}
      >
        <FileIcon size={28} color={accent} strokeWidth={1.8} />
      </div>
      <span
        style={{
          fontSize: '0.8125rem',
          fontWeight: 600,
          color: '#1e293b',
          textAlign: 'center',
          width: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {file.name}
      </span>
      <span style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>{formatBytes(file.sizeBytes)}</span>
    </div>
  );
}

// ─── Legacy Node Card (used for Trash/Starred/Shared views) ──────────────────

interface NodeCardProps {
  node: DriveNode;
  viewMode: ViewMode;
  isSelected: boolean;
  onSelect: (node: DriveNode) => void;
  onOpen: (node: DriveNode) => void;
  onMenuOpen: (e: React.MouseEvent, node: DriveNode) => void;
  folderLabel: string;
}

function NodeCard({
  node,
  viewMode,
  isSelected,
  onSelect,
  onOpen,
  onMenuOpen,
  folderLabel,
}: NodeCardProps) {
  const [hovered, setHovered] = useState(false);
  const FileIcon = node.isFolder
    ? hovered
      ? FolderOpen
      : Folder
    : getMimeLucideIcon(node.mimeType);
  const accent = node.isFolder ? '#f59e0b' : getMimeAccentColor(node.mimeType);

  if (viewMode === 'list') {
    return (
      <div
        onClick={() => onSelect(node)}
        onDoubleClick={() => onOpen(node)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.625rem 1rem',
          borderRadius: '0.5rem',
          background: isSelected
            ? 'rgba(35,90,228,0.08)'
            : hovered
              ? 'rgba(0,0,0,0.03)'
              : 'transparent',
          border: `1px solid ${isSelected ? 'rgba(35,90,228,0.25)' : 'transparent'}`,
          cursor: 'pointer',
          transition: 'all 0.15s',
          userSelect: 'none',
        }}
      >
        <div
          style={{
            width: '2rem',
            height: '2rem',
            borderRadius: '0.5rem',
            flexShrink: 0,
            background: `${accent}18`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <FileIcon size={16} color={accent} strokeWidth={2} />
        </div>
        <span
          style={{
            flex: 1,
            fontSize: '0.875rem',
            fontWeight: 500,
            color: '#1e293b',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {node.name}
        </span>
        <span style={{ width: '6rem', fontSize: '0.8125rem', color: '#94a3b8', flexShrink: 0 }}>
          {node.isFolder ? '—' : formatBytes(node.sizeBytes ?? 0)}
        </span>
        <span style={{ width: '8rem', fontSize: '0.8125rem', color: '#94a3b8', flexShrink: 0 }}>
          {new Date(node.updatedAt).toLocaleDateString()}
        </span>
        <Button
          text
          onClick={(e) => {
            e.stopPropagation();
            onMenuOpen(e, node);
          }}
          style={{
            background: 'none',
            padding: '0.25rem',
            borderRadius: '0.375rem',
            color: '#94a3b8',
            display: hovered || isSelected ? 'flex' : 'none',
            alignItems: 'center',
          }}
        >
          <MoreVertical size={16} />
        </Button>
      </div>
    );
  }

  return (
    <div
      onClick={() => onSelect(node)}
      onDoubleClick={() => onOpen(node)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.625rem',
        padding: '1.25rem 1rem',
        borderRadius: '0.875rem',
        background: isSelected ? 'rgba(35,90,228,0.06)' : 'rgba(255,255,255,0.8)',
        border: `1.5px solid ${isSelected ? 'rgba(35,90,228,0.4)' : hovered ? 'rgba(226,232,240,1)' : 'rgba(226,232,240,0.7)'}`,
        boxShadow: hovered ? '0 4px 16px rgba(0,0,0,0.06)' : '0 1px 3px rgba(0,0,0,0.03)',
        cursor: 'pointer',
        transition: 'all 0.15s',
        userSelect: 'none',
        minWidth: 0,
      }}
    >
      {(hovered || isSelected) && (
        <Button
          text
          onClick={(e) => {
            e.stopPropagation();
            onMenuOpen(e, node);
          }}
          style={{
            position: 'absolute',
            top: '0.5rem',
            right: '0.5rem',
            background: 'none',
            padding: '0.25rem',
            borderRadius: '0.375rem',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <MoreVertical size={15} />
        </Button>
      )}
      <div
        style={{
          width: '3.5rem',
          height: '3.5rem',
          borderRadius: '1rem',
          background: `linear-gradient(135deg, ${accent}22, ${accent}10)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `1px solid ${accent}28`,
        }}
      >
        <FileIcon size={28} color={accent} strokeWidth={1.8} />
      </div>
      <span
        style={{
          fontSize: '0.8125rem',
          fontWeight: 600,
          color: '#1e293b',
          textAlign: 'center',
          width: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {node.name}
      </span>
      <span style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
        {node.isFolder ? folderLabel : formatBytes(node.sizeBytes ?? 0)}
      </span>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
// Uses the global EmptyState component — local alias for backward compatibility
// with callers that used the { icon, title, desc, action } signature
function DriveEmptyState({
  icon,
  title,
  desc,
  action,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  desc: string;
  action?: React.ReactNode;
}) {
  return <EmptyState icon={icon} title={title} description={desc} action={action} />;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DrivePage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const sortLabels: Record<SortKey, string> = {
    name: t('sortByName'),
    date: t('sortByDate'),
    size: t('sortBySize'),
    type: t('sortByType'),
  };

  // ── State ────────────────────────────────────────────────────────────────

  const [activeView, setActiveView] = useState<DriveView>('browse');

  // Browse (raw MinIO) state
  const [currentPrefix, setCurrentPrefix] = useState('');
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbEntry[]>([
    { prefix: '', name: t('allStorage') },
  ]);
  const [selectedBrowseItem, setSelectedBrowseItem] = useState<BrowseItem | null>(null);

  // Legacy (DB nodes) state
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [nodeBreadcrumb, setNodeBreadcrumb] = useState<Array<{ id: string | null; name: string }>>([
    { id: null, name: t('myDrive') },
  ]);
  const [selectedNode, setSelectedNode] = useState<DriveNode | null>(null);

  // Shared UI state
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);

  // Dialogs
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renameTarget, setRenameTarget] = useState<DriveNode | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  // Browse-specific dialogs
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState('');
  const [previewMime, setPreviewMime] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<IBrowseFile | null>(null);
  const [systemFileError, setSystemFileError] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Context menu
  const menuRef = useRef<Menu>(null);
  const [menuBrowseFile, setMenuBrowseFile] = useState<IBrowseFile | null>(null);
  const [menuBrowseFolder, setMenuBrowseFolder] = useState<IBrowseFolder | null>(null);
  const [menuNode, setMenuNode] = useState<DriveNode | null>(null);

  // Upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Queries ──────────────────────────────────────────────────────────────

  const browseQuery = useQuery({
    queryKey: ['drive-browse', currentPrefix],
    queryFn: () => driveService.browseStorage(currentPrefix),
    enabled: activeView === 'browse',
    staleTime: 30_000,
  });

  const nodesQuery = useQuery({
    queryKey: ['drive-nodes', activeView, currentFolderId],
    queryFn: async () => {
      if (activeView === 'trash') return driveService.listTrash();
      if (activeView === 'shared') return driveService.listSharedWithMe();
      if (currentFolderId) return driveService.listChildren(currentFolderId);
      return driveService.listRoot();
    },
    enabled: activeView !== 'browse',
  });

  const statsQuery = useQuery({
    queryKey: ['drive-stats'],
    queryFn: () => driveService.getStats(),
  });

  // ── Mutations ────────────────────────────────────────────────────────────

  const createFolderMutation = useMutation({
    mutationFn: (name: string) =>
      driveService.createFolder({
        name,
        parentNodeId: activeView === 'browse' ? undefined : (currentFolderId ?? undefined),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drive-nodes'] });
      queryClient.invalidateQueries({ queryKey: ['drive-browse'] });
      setShowNewFolder(false);
      setNewFolderName('');
      toastCreated(t('createFolder'));
    },
    onError: (e: Error) => toastError(t('failedToCreate') as string, { description: e.message }),
  });

  const trashMutation = useMutation({
    mutationFn: (nodeId: string) => driveService.trashNode(nodeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drive-nodes'] });
      queryClient.invalidateQueries({ queryKey: ['drive-browse'] });
      setSelectedNode(null);
      setDeleteTarget(null);
      toastDeleted(t('moveToTrash') as string);
    },
    onError: (e: Error) => toastError(t('error') as string, { description: e.message }),
  });

  const restoreMutation = useMutation({
    mutationFn: (nodeId: string) => driveService.restoreNode(nodeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drive-nodes'] });
      toastSuccess(t('restoreFile') as string);
    },
    onError: (e: Error) => toastError(t('error') as string, { description: e.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (nodeId: string) => driveService.permanentDelete(nodeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drive-nodes'] });
      setSelectedNode(null);
      toastDeleted(t('deleteForever') as string);
    },
    onError: (e: Error) => toastError(t('error') as string, { description: e.message }),
  });

  const renameMutation = useMutation({
    mutationFn: ({ nodeId, name }: { nodeId: string; name: string }) =>
      driveService.updateNode(nodeId, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drive-nodes'] });
      setRenameTarget(null);
      setRenameValue('');
      toastSuccess(t('save') as string);
    },
    onError: (e: Error) => toastError(t('failedToUpdate') as string, { description: e.message }),
  });

  // ── Handlers — Browse ────────────────────────────────────────────────────

  const navigateToFolder = useCallback((folder: IBrowseFolder) => {
    setBreadcrumbs((prev) => [...prev, { prefix: folder.prefix, name: folder.name }]);
    setCurrentPrefix(folder.prefix);
    setSelectedBrowseItem(null);
  }, []);

  const navigateToBreadcrumb = useCallback(
    (idx: number) => {
      const crumb = breadcrumbs[idx];
      setBreadcrumbs((prev) => prev.slice(0, idx + 1));
      setCurrentPrefix(crumb.prefix);
      setSelectedBrowseItem(null);
    },
    [breadcrumbs],
  );

  const getPresignedUrl = useCallback(async (file: IBrowseFile): Promise<string> => {
    if (file.driveNodeId) {
      const { url } = await driveService.getDownloadUrl(file.driveNodeId);
      return url;
    }
    return driveService.getRawUrl(file.key);
  }, []);

  const previewFile = useCallback(
    async (file: IBrowseFile) => {
      setIsLoadingPreview(true);
      setPreviewName(file.name);
      setPreviewMime(guessMime(file.name));
      setPreviewUrl(null);
      try {
        const url = await getPresignedUrl(file);
        setPreviewUrl(url);
      } catch (e: unknown) {
        toastError(t('error') as string, { description: (e as Error).message });
      } finally {
        setIsLoadingPreview(false);
      }
    },
    [getPresignedUrl, t],
  );

  const downloadFile = useCallback(
    async (file: IBrowseFile) => {
      try {
        const url = await getPresignedUrl(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.click();
      } catch (e: unknown) {
        toastError(t('error') as string, { description: (e as Error).message });
      }
    },
    [getPresignedUrl, t],
  );

  const copyShareLink = useCallback(
    async (file: IBrowseFile) => {
      try {
        const url = await getPresignedUrl(file);
        await navigator.clipboard.writeText(url);
        toastSuccess(t('linkCopied') as string);
      } catch (e: unknown) {
        toastError(t('error') as string, { description: (e as Error).message });
      }
    },
    [getPresignedUrl, t],
  );

  const shareWhatsApp = useCallback(
    async (file: IBrowseFile) => {
      try {
        const url = await getPresignedUrl(file);
        const message = encodeURIComponent(`${file.name}\n${url}`);
        window.open(`https://wa.me/?text=${message}`, '_blank', 'noopener,noreferrer');
      } catch (e: unknown) {
        toastError(t('error') as string, { description: (e as Error).message });
      }
    },
    [getPresignedUrl, t],
  );

  const handleDeleteBrowseFile = useCallback((file: IBrowseFile) => {
    if (!file.canDelete) {
      setSystemFileError(true);
      return;
    }
    setDeleteTarget(file);
  }, []);

  const confirmDeleteBrowseFile = useCallback(() => {
    if (!deleteTarget?.driveNodeId) return;
    trashMutation.mutate(deleteTarget.driveNodeId);
  }, [deleteTarget, trashMutation]);

  // ── Handlers — Legacy (DB nodes) ─────────────────────────────────────────

  const openNode = useCallback(
    (node: DriveNode) => {
      if (node.isFolder) {
        setNodeBreadcrumb((prev) => [...prev, { id: node.id, name: node.name }]);
        setCurrentFolderId(node.id);
        setSelectedNode(null);
      } else {
        driveService
          .getDownloadUrl(node.id)
          .then(({ url }) => window.open(url, '_blank', 'noopener,noreferrer'))
          .catch((e: Error) => toastError(t('error') as string, { description: e.message }));
      }
    },
    [t],
  );

  const navigateNodeBreadcrumb = useCallback(
    (entry: { id: string | null; name: string }) => {
      const idx = nodeBreadcrumb.findIndex((b) => b.id === entry.id);
      setNodeBreadcrumb((prev) => prev.slice(0, idx + 1));
      setCurrentFolderId(entry.id);
      setSelectedNode(null);
    },
    [nodeBreadcrumb],
  );

  const handleUploadFiles = useCallback(
    async (files: FileList) => {
      const uploads = Array.from(files);
      for (const file of uploads) {
        setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }));
        try {
          await driveService.uploadFile(
            file,
            activeView === 'browse' ? undefined : (currentFolderId ?? undefined),
            undefined,
            (pct) => setUploadProgress((prev) => ({ ...prev, [file.name]: pct })),
          );
          setUploadProgress((prev) => {
            const n = { ...prev };
            delete n[file.name];
            return n;
          });
          queryClient.invalidateQueries({ queryKey: ['drive-nodes'] });
          queryClient.invalidateQueries({ queryKey: ['drive-browse'] });
          toastCreated(t('uploadSuccess') as string);
        } catch (e: unknown) {
          setUploadProgress((prev) => {
            const n = { ...prev };
            delete n[file.name];
            return n;
          });
          toastError(t('uploadError') as string, { description: (e as Error).message });
        }
      }
    },
    [activeView, currentFolderId, queryClient, t],
  );

  // ── Context menus ────────────────────────────────────────────────────────

  const openBrowseFolderMenu = useCallback((e: React.MouseEvent, folder: IBrowseFolder) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuBrowseFolder(folder);
    setMenuBrowseFile(null);
    setMenuNode(null);
    menuRef.current?.show(e);
  }, []);

  const openBrowseFileMenu = useCallback((e: React.MouseEvent, file: IBrowseFile) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuBrowseFile(file);
    setMenuBrowseFolder(null);
    setMenuNode(null);
    menuRef.current?.show(e);
  }, []);

  const openNodeMenu = useCallback((e: React.MouseEvent, node: DriveNode) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuNode(node);
    setMenuBrowseFile(null);
    setMenuBrowseFolder(null);
    menuRef.current?.show(e);
  }, []);

  const buildMenuItems = (): MenuItem[] => {
    if (menuBrowseFolder) {
      return [
        {
          label: t('openFolder') as string,
          icon: 'pi pi-folder-open',
          command: () => navigateToFolder(menuBrowseFolder),
        },
      ];
    }

    if (menuBrowseFile) {
      const file = menuBrowseFile;
      const items: MenuItem[] = [
        { label: t('previewFile') as string, icon: 'pi pi-eye', command: () => previewFile(file) },
        {
          label: t('downloadFile') as string,
          icon: 'pi pi-download',
          command: () => downloadFile(file),
        },
        { separator: true },
        { label: t('copyLink') as string, icon: 'pi pi-link', command: () => copyShareLink(file) },
        {
          label: t('shareViaWhatsApp') as string,
          icon: 'pi pi-whatsapp',
          command: () => shareWhatsApp(file),
        },
      ];
      if (file.canDelete) {
        items.push({ separator: true });
        items.push({
          label: t('moveToTrash') as string,
          icon: 'pi pi-trash',
          command: () => handleDeleteBrowseFile(file),
        });
      }
      return items;
    }

    if (menuNode) {
      const node = menuNode;
      const items: MenuItem[] = [];
      if (!node.isFolder && activeView !== 'trash') {
        items.push({
          label: t('downloadFile') as string,
          icon: 'pi pi-download',
          command: () =>
            driveService
              .getDownloadUrl(node.id)
              .then(({ url }) => window.open(url, '_blank', 'noopener,noreferrer'))
              .catch(() => {}),
        });
      }
      if (activeView !== 'trash') {
        items.push({
          label: t('renameFile') as string,
          icon: 'pi pi-pencil',
          command: () => {
            setRenameTarget(node);
            setRenameValue(node.name);
          },
        });
        items.push({
          label: t('moveToTrash') as string,
          icon: 'pi pi-trash',
          command: () =>
            toastConfirm(
              (t('moveToTrash') as string) || 'Déplacer vers la corbeille ?',
              () => trashMutation.mutate(node.id),
              { variant: 'warning', confirmLabel: (t('moveToTrash') as string) || 'Corbeille' },
            ),
        });
      }
      if (activeView === 'trash') {
        items.push({
          label: t('restoreFile') as string,
          icon: 'pi pi-refresh',
          command: () => restoreMutation.mutate(node.id),
        });
        items.push({ separator: true });
        items.push({
          label: t('deleteForever') as string,
          icon: 'pi pi-times-circle',
          command: () =>
            toastConfirm(
              (t('deleteForever') as string) || 'Supprimer définitivement ?',
              () => deleteMutation.mutate(node.id),
              {
                variant: 'destructive',
                confirmLabel: (t('deleteForever') as string) || 'Supprimer',
              },
            ),
        });
      }
      return items;
    }
    return [];
  };

  // ── Sorting ──────────────────────────────────────────────────────────────

  const sortedBrowseItems = (): BrowseItem[] => {
    const data: IBrowseStorageResult | undefined = browseQuery.data;
    if (!data) return [];

    const folderItems: BrowseItem[] = data.folders.map((f) => ({
      kind: 'folder' as const,
      data: f,
    }));
    const fileItems: BrowseItem[] = data.files
      .filter((f) => !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .map((f) => ({ kind: 'file' as const, data: f }));

    const filteredFolders = folderItems.filter(
      (fi) =>
        !searchQuery ||
        (fi.data as IBrowseFolder).name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    // Folders first, then files
    return [
      ...filteredFolders.sort((a, b) => {
        const na = (a.data as IBrowseFolder).name;
        const nb = (b.data as IBrowseFolder).name;
        return sortAsc ? na.localeCompare(nb) : nb.localeCompare(na);
      }),
      ...fileItems.sort((a, b) => {
        const fa = a.data as IBrowseFile;
        const fb = b.data as IBrowseFile;
        let cmp = 0;
        if (sortKey === 'name') cmp = fa.name.localeCompare(fb.name);
        else if (sortKey === 'size') cmp = fa.sizeBytes - fb.sizeBytes;
        else if (sortKey === 'date')
          cmp = new Date(fa.lastModified).getTime() - new Date(fb.lastModified).getTime();
        return sortAsc ? cmp : -cmp;
      }),
    ];
  };

  const sortedNodes = (): DriveNode[] => {
    return [...(nodesQuery.data ?? [])].sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      let cmp = 0;
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortKey === 'size') cmp = (a.sizeBytes ?? 0) - (b.sizeBytes ?? 0);
      else if (sortKey === 'date')
        cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      else if (sortKey === 'type') cmp = (a.mimeType ?? '').localeCompare(b.mimeType ?? '');
      return sortAsc ? cmp : -cmp;
    });
  };

  // ── View change ───────────────────────────────────────────────────────────

  const changeView = (view: DriveView) => {
    setActiveView(view);
    setCurrentFolderId(null);
    setNodeBreadcrumb([
      {
        id: null,
        name:
          view === 'trash'
            ? t('trash')
            : view === 'shared'
              ? t('sharedWithMe')
              : view === 'starred'
                ? t('starred')
                : t('myDrive'),
      },
    ]);
    setSelectedNode(null);
    setSearchQuery('');
    if (view === 'browse') {
      setCurrentPrefix('');
      setBreadcrumbs([{ prefix: '', name: t('allStorage') }]);
      setSelectedBrowseItem(null);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const isBrowse = activeView === 'browse';
  const isBrowseLoading = browseQuery.isLoading;
  const isNodesLoading = nodesQuery.isLoading;
  const isLoading = isBrowse ? isBrowseLoading : isNodesLoading;
  const stats = statsQuery.data;
  const browseItems = sortedBrowseItems();
  const nodes = sortedNodes();
  const totalCount = isBrowse ? browseItems.length : nodes.length;

  // ── Nav items ─────────────────────────────────────────────────────────────
  const navItems: Array<{ key: DriveView; icon: typeof HardDrive; label: string }> = [
    { key: 'browse', icon: Database, label: t('allStorage') },
    { key: 'shared', icon: Users, label: t('sharedWithMe') },
    { key: 'starred', icon: Star, label: t('starred') },
    { key: 'trash', icon: Trash2, label: t('trash') },
  ];

  // ── Current breadcrumb for display ───────────────────────────────────────
  const currentBreadcrumb = isBrowse
    ? breadcrumbs
    : nodeBreadcrumb.map((b) => ({ prefix: b.id ?? '', name: b.name }));

  // ─── Preview mime check ───────────────────────────────────────────────────
  const canPreviewInBrowser = (mime: string) =>
    mime.startsWith('image/') || mime === 'application/pdf' || mime.startsWith('text/');

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AdminLayout>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>

      <PageHeader
        icon={HardDrive}
        title={t('drive')}
        subtitle={
          stats
            ? `${formatBytes(stats.totalBytes)} · ${stats.totalFiles} ${t('totalFiles')}`
            : undefined
        }
        actions={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button
              label={t('newFolder') as string}
              icon={<FolderPlus size={16} style={{ marginRight: '0.375rem' }} />}
              severity="secondary"
              outlined
              onClick={() => setShowNewFolder(true)}
            />
            {activeView !== 'trash' && (
              <Button
                label={t('uploadFile') as string}
                icon={<Upload size={16} style={{ marginRight: '0.375rem' }} />}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  background: 'linear-gradient(135deg, #235ae4, #1a47b8)',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(35,90,228,0.35)',
                }}
              />
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => e.target.files && handleUploadFiles(e.target.files)}
            />
          </div>
        }
      />

      {/* Upload progress */}
      {Object.entries(uploadProgress).length > 0 && (
        <div
          style={{
            marginBottom: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.375rem',
          }}
        >
          {Object.entries(uploadProgress).map(([name, pct]) => (
            <div
              key={name}
              style={{
                background: 'rgba(255,255,255,0.8)',
                borderRadius: '0.75rem',
                padding: '0.625rem 1rem',
                border: '1px solid rgba(226,232,240,0.6)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '0.375rem',
                }}
              >
                <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#374151' }}>
                  {name}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{pct}%</span>
              </div>
              <ProgressBar value={pct} style={{ height: '0.375rem', borderRadius: '99px' }} />
            </div>
          ))}
        </div>
      )}

      {/* Main layout */}
      <div
        style={{ display: 'flex', gap: '1rem', height: 'calc(100vh - 12rem)', minHeight: '30rem' }}
      >
        {/* Left nav */}
        <div
          style={{
            width: '13.5rem',
            flexShrink: 0,
            background: 'rgba(255,255,255,0.75)',
            backdropFilter: 'blur(8px)',
            borderRadius: '1rem',
            border: '1px solid rgba(226,232,240,0.6)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            padding: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
          }}
        >
          {navItems.map(({ key, icon: Icon, label }) => {
            const active = activeView === key;
            return (
              <Button
                key={key}
                text={!active}
                onClick={() => changeView(key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.625rem',
                  padding: '0.625rem 0.875rem',
                  borderRadius: '0.625rem',
                  background: active ? 'rgba(35,90,228,0.1)' : 'transparent',
                  border: `1px solid ${active ? 'rgba(35,90,228,0.25)' : 'transparent'}`,
                  width: '100%',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                  color: active ? '#235ae4' : '#475569',
                  fontWeight: active ? 600 : 500,
                  fontSize: '0.875rem',
                }}
              >
                <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
                {label}
              </Button>
            );
          })}

          {stats && (
            <div
              style={{
                marginTop: 'auto',
                paddingTop: '0.75rem',
                borderTop: '1px solid rgba(226,232,240,0.6)',
              }}
            >
              <p
                style={{
                  margin: '0 0 0.5rem',
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                {t('storageUsed')}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {[
                  { label: t('totalFiles'), value: stats.totalFiles },
                  { label: t('totalFolders'), value: stats.totalFolders },
                  { label: t('sharedCount'), value: stats.sharedWithMeCount },
                ].map(({ label, value }) => (
                  <div
                    key={String(label)}
                    style={{ display: 'flex', justifyContent: 'space-between' }}
                  >
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{label}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151' }}>
                      {value}
                    </span>
                  </div>
                ))}
                <span
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    color: '#235ae4',
                    marginTop: '0.25rem',
                  }}
                >
                  {formatBytes(stats.totalBytes)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Main content */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            background: 'rgba(255,255,255,0.75)',
            backdropFilter: 'blur(8px)',
            borderRadius: '1rem',
            border: '1px solid rgba(226,232,240,0.6)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Toolbar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.875rem 1.25rem',
              borderBottom: '1px solid rgba(226,232,240,0.6)',
              flexWrap: 'wrap',
            }}
          >
            {/* Breadcrumb */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                flex: 1,
                minWidth: 0,
                flexWrap: 'wrap',
              }}
            >
              {currentBreadcrumb.map((entry, idx) => (
                <span
                  key={entry.prefix + idx}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  {idx > 0 && <ChevronRight size={14} color="#cbd5e1" />}
                  <Button
                    text
                    onClick={() => {
                      if (idx >= currentBreadcrumb.length - 1) return;
                      if (isBrowse) navigateToBreadcrumb(idx);
                      else navigateNodeBreadcrumb(nodeBreadcrumb[idx]);
                    }}
                    style={{
                      background: 'none',
                      padding: '0.125rem 0.25rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.875rem',
                      fontWeight: idx === currentBreadcrumb.length - 1 ? 600 : 400,
                      color: idx === currentBreadcrumb.length - 1 ? '#1e293b' : '#64748b',
                      cursor: idx < currentBreadcrumb.length - 1 ? 'pointer' : 'default',
                    }}
                  >
                    {idx === 0 ? <Home size={15} strokeWidth={2} /> : entry.name}
                  </Button>
                </span>
              ))}
            </div>

            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: '0.625rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9ca3af',
                  pointerEvents: 'none',
                }}
              />
              <InputText
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('search') as string}
                style={{
                  paddingLeft: '2rem',
                  paddingRight: searchQuery ? '2rem' : '0.75rem',
                  height: '2rem',
                  fontSize: '0.8125rem',
                  width: '14rem',
                  border: '1px solid rgba(226,232,240,0.8)',
                  borderRadius: '0.5rem',
                  background: 'rgba(248,250,252,0.8)',
                }}
              />
              {searchQuery && (
                <Button
                  text
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '0.5rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    padding: '0.125rem',
                    color: '#9ca3af',
                  }}
                >
                  <X size={13} />
                </Button>
              )}
            </div>

            {/* Sort */}
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              {(['name', 'date', 'size'] as SortKey[]).map((key) => (
                <Button
                  key={key}
                  text={sortKey !== key}
                  onClick={() => {
                    if (sortKey === key) setSortAsc(!sortAsc);
                    else {
                      setSortKey(key);
                      setSortAsc(true);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.375rem',
                    background: sortKey === key ? 'rgba(35,90,228,0.1)' : 'transparent',
                    border: `1px solid ${sortKey === key ? 'rgba(35,90,228,0.3)' : 'rgba(226,232,240,0.6)'}`,
                    fontSize: '0.75rem',
                    fontWeight: sortKey === key ? 600 : 400,
                    color: sortKey === key ? '#235ae4' : '#64748b',
                  }}
                >
                  {sortLabels[key]}
                  {sortKey === key && (sortAsc ? <SortAsc size={11} /> : <SortDesc size={11} />)}
                </Button>
              ))}
            </div>

            {/* View toggle */}
            <div
              style={{
                display: 'flex',
                background: 'rgba(241,245,249,0.8)',
                borderRadius: '0.5rem',
                padding: '0.125rem',
              }}
            >
              {(['grid', 'list'] as ViewMode[]).map((mode) => (
                <Button
                  key={mode}
                  text={viewMode !== mode}
                  onClick={() => setViewMode(mode)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '2rem',
                    height: '1.75rem',
                    borderRadius: '0.375rem',
                    padding: 0,
                    background: viewMode === mode ? 'white' : 'transparent',
                    color: viewMode === mode ? '#1e293b' : '#9ca3af',
                    boxShadow: viewMode === mode ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  {mode === 'grid' ? <Grid3x3 size={15} /> : <List size={15} />}
                </Button>
              ))}
            </div>

            {/* Refresh */}
            <Button
              text
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['drive-browse'] });
                queryClient.invalidateQueries({ queryKey: ['drive-nodes'] });
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'none',
                color: '#94a3b8',
                padding: '0.25rem',
              }}
            >
              <RefreshCw size={15} />
            </Button>
          </div>

          {/* List header */}
          {viewMode === 'list' && totalCount > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.375rem 1rem',
                borderBottom: '1px solid rgba(226,232,240,0.6)',
              }}
            >
              <div style={{ width: '2rem', flexShrink: 0 }} />
              <span
                style={{
                  flex: 1,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {t('fileName')}
              </span>
              <span
                style={{
                  width: '6rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  flexShrink: 0,
                }}
              >
                {t('fileSize')}
              </span>
              <span
                style={{
                  width: '8rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  flexShrink: 0,
                }}
              >
                {t('lastModified')}
              </span>
              <div style={{ width: '2rem', flexShrink: 0 }} />
            </div>
          )}

          {/* Content */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: viewMode === 'grid' ? '1rem' : '0.5rem 0.75rem',
            }}
          >
            {isLoading ? (
              viewMode === 'grid' ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(8.5rem, 1fr))',
                    gap: '0.625rem',
                  }}
                >
                  {Array.from({ length: 12 }).map((_, i) => (
                    <SkeletonCard key={i} viewMode="grid" />
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <SkeletonCard key={i} viewMode="list" />
                  ))}
                </div>
              )
            ) : isBrowse ? (
              browseItems.length === 0 ? (
                <DriveEmptyState
                  icon={Database}
                  title={searchQuery ? (t('searchEmpty') as string) : (t('driveEmpty') as string)}
                  desc={
                    searchQuery ? (t('searchEmptyDesc') as string) : (t('driveEmptyDesc') as string)
                  }
                  action={
                    !searchQuery ? (
                      <Button
                        label={t('uploadFile') as string}
                        icon={<Upload size={14} style={{ marginRight: '0.375rem' }} />}
                        size="small"
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          background: 'linear-gradient(135deg, #235ae4, #1a47b8)',
                          border: 'none',
                        }}
                      />
                    ) : undefined
                  }
                />
              ) : viewMode === 'grid' ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(8.5rem, 1fr))',
                    gap: '0.625rem',
                  }}
                >
                  {browseItems.map((item, idx) =>
                    item.kind === 'folder' ? (
                      <BrowseFolderCard
                        key={item.data.prefix + idx}
                        folder={item.data}
                        viewMode="grid"
                        isSelected={
                          selectedBrowseItem?.kind === 'folder' &&
                          (selectedBrowseItem.data as IBrowseFolder).prefix === item.data.prefix
                        }
                        onSelect={() => setSelectedBrowseItem(item)}
                        onOpen={() => navigateToFolder(item.data)}
                        onContextMenu={(e) => openBrowseFolderMenu(e, item.data)}
                      />
                    ) : (
                      <BrowseFileCard
                        key={(item.data as IBrowseFile).key}
                        file={item.data as IBrowseFile}
                        viewMode="grid"
                        isSelected={
                          selectedBrowseItem?.kind === 'file' &&
                          (selectedBrowseItem.data as IBrowseFile).key ===
                            (item.data as IBrowseFile).key
                        }
                        onSelect={() => setSelectedBrowseItem(item)}
                        onOpen={() => previewFile(item.data as IBrowseFile)}
                        onContextMenu={(e) => openBrowseFileMenu(e, item.data as IBrowseFile)}
                        systemLabel={t('systemFile') as string}
                      />
                    ),
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                  {browseItems.map((item, idx) =>
                    item.kind === 'folder' ? (
                      <BrowseFolderCard
                        key={item.data.prefix + idx}
                        folder={item.data}
                        viewMode="list"
                        isSelected={
                          selectedBrowseItem?.kind === 'folder' &&
                          (selectedBrowseItem.data as IBrowseFolder).prefix === item.data.prefix
                        }
                        onSelect={() => setSelectedBrowseItem(item)}
                        onOpen={() => navigateToFolder(item.data)}
                        onContextMenu={(e) => openBrowseFolderMenu(e, item.data)}
                      />
                    ) : (
                      <BrowseFileCard
                        key={(item.data as IBrowseFile).key}
                        file={item.data as IBrowseFile}
                        viewMode="list"
                        isSelected={
                          selectedBrowseItem?.kind === 'file' &&
                          (selectedBrowseItem.data as IBrowseFile).key ===
                            (item.data as IBrowseFile).key
                        }
                        onSelect={() => setSelectedBrowseItem(item)}
                        onOpen={() => previewFile(item.data as IBrowseFile)}
                        onContextMenu={(e) => openBrowseFileMenu(e, item.data as IBrowseFile)}
                        systemLabel={t('systemFile') as string}
                      />
                    ),
                  )}
                </div>
              )
            ) : nodes.length === 0 ? (
              <DriveEmptyState
                icon={activeView === 'trash' ? Trash2 : activeView === 'shared' ? Users : Folder}
                title={
                  t(
                    activeView === 'trash'
                      ? 'trashEmpty'
                      : activeView === 'shared'
                        ? 'sharedEmpty'
                        : searchQuery
                          ? 'searchEmpty'
                          : 'driveEmpty',
                  ) as string
                }
                desc={
                  t(
                    activeView === 'trash'
                      ? 'trashEmptyDesc'
                      : activeView === 'shared'
                        ? 'sharedEmptyDesc'
                        : searchQuery
                          ? 'searchEmptyDesc'
                          : 'driveEmptyDesc',
                  ) as string
                }
              />
            ) : viewMode === 'grid' ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(8.5rem, 1fr))',
                  gap: '0.625rem',
                }}
              >
                {nodes.map((node) => (
                  <NodeCard
                    key={node.id}
                    node={node}
                    viewMode="grid"
                    isSelected={selectedNode?.id === node.id}
                    onSelect={setSelectedNode}
                    onOpen={openNode}
                    onMenuOpen={openNodeMenu}
                    folderLabel={t('fileType') as string}
                  />
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                {nodes.map((node) => (
                  <NodeCard
                    key={node.id}
                    node={node}
                    viewMode="list"
                    isSelected={selectedNode?.id === node.id}
                    onSelect={setSelectedNode}
                    onOpen={openNode}
                    onMenuOpen={openNodeMenu}
                    folderLabel={t('fileType') as string}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Status bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.5rem 1.25rem',
              borderTop: '1px solid rgba(226,232,240,0.6)',
              fontSize: '0.75rem',
              color: '#94a3b8',
            }}
          >
            <span>
              {totalCount} {totalCount === 1 ? t('item') : t('items')}
              {isBrowse &&
                selectedBrowseItem &&
                ` · ${t('selected')}: ${selectedBrowseItem.kind === 'folder' ? (selectedBrowseItem.data as IBrowseFolder).name : (selectedBrowseItem.data as IBrowseFile).name}`}
              {!isBrowse && selectedNode && ` · ${t('selected')}: ${selectedNode.name}`}
            </span>
            {isBrowse && selectedBrowseItem?.kind === 'file' && (
              <span>{formatBytes((selectedBrowseItem.data as IBrowseFile).sizeBytes)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Context Menu */}
      <Menu model={buildMenuItems()} popup ref={menuRef} />

      {/* ── File Preview Modal ─────────────────────────────────── */}
      <Dialog
        header={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Eye size={18} color="#235ae4" />
            <span
              style={{
                fontWeight: 700,
                fontSize: '1rem',
                color: '#1e293b',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '20rem',
              }}
            >
              {previewName}
            </span>
          </div>
        }
        visible={!!previewUrl || isLoadingPreview}
        onHide={() => {
          setPreviewUrl(null);
          setPreviewName('');
        }}
        style={{ width: '90vw', maxWidth: '60rem', borderRadius: '1rem' }}
        contentStyle={{ padding: 0, overflow: 'hidden' }}
        footer={
          previewUrl ? (
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                justifyContent: 'flex-end',
                padding: '0.75rem 1rem',
              }}
            >
              <Button
                label={t('openInNewTab') as string}
                icon={<Link size={14} style={{ marginRight: '0.375rem' }} />}
                outlined
                severity="secondary"
                size="small"
                onClick={() => window.open(previewUrl, '_blank', 'noopener,noreferrer')}
              />
              <Button
                label={t('downloadFile') as string}
                icon={<Download size={14} style={{ marginRight: '0.375rem' }} />}
                size="small"
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = previewUrl;
                  a.download = previewName;
                  a.click();
                }}
                style={{ background: 'linear-gradient(135deg, #235ae4, #1a47b8)', border: 'none' }}
              />
            </div>
          ) : null
        }
      >
        {isLoadingPreview ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '20rem',
            }}
          >
            <i className="pi pi-spin pi-spinner" style={{ fontSize: '1.5rem', color: '#235ae4' }} />
          </div>
        ) : previewUrl && canPreviewInBrowser(previewMime) ? (
          previewMime.startsWith('image/') ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f8fafc',
                padding: '1rem',
                maxHeight: '70vh',
              }}
            >
              <img
                src={previewUrl}
                alt={previewName}
                style={{
                  maxWidth: '100%',
                  maxHeight: '65vh',
                  objectFit: 'contain',
                  borderRadius: '0.5rem',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                }}
              />
            </div>
          ) : (
            <iframe
              src={previewUrl}
              title={previewName}
              style={{ width: '100%', height: '70vh', border: 'none' }}
              sandbox="allow-same-origin allow-scripts allow-popups"
            />
          )
        ) : previewUrl ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '3rem 2rem',
              gap: '1rem',
            }}
          >
            <File size={48} color="#94a3b8" strokeWidth={1.5} />
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>{t('noPreview')}</p>
          </div>
        ) : null}
      </Dialog>

      {/* ── Delete Confirmation Modal ──────────────────────────── */}
      <Dialog
        header={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '2.25rem',
                height: '2.25rem',
                borderRadius: '0.625rem',
                background: 'rgba(239,68,68,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Trash2 size={18} color="#ef4444" />
            </div>
            <span style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b' }}>
              {t('confirmDelete')}
            </span>
          </div>
        }
        visible={!!deleteTarget}
        onHide={() => setDeleteTarget(null)}
        style={{ width: '26rem', borderRadius: '1rem' }}
        footer={
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button
              label={t('cancel') as string}
              outlined
              severity="secondary"
              size="small"
              onClick={() => setDeleteTarget(null)}
            />
            <Button
              label={t('moveToTrash') as string}
              icon="pi pi-trash"
              severity="danger"
              size="small"
              loading={trashMutation.isPending}
              onClick={confirmDeleteBrowseFile}
            />
          </div>
        }
      >
        <div style={{ padding: '0.5rem 0' }}>
          <p style={{ margin: 0, color: '#374151', fontSize: '0.875rem' }}>
            {t('confirmDeleteDesc')}
          </p>
          {deleteTarget && (
            <div
              style={{
                marginTop: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                padding: '0.625rem 0.875rem',
                background: '#f8fafc',
                borderRadius: '0.625rem',
                border: '1px solid rgba(226,232,240,0.8)',
              }}
            >
              <File size={16} color="#64748b" strokeWidth={2} />
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1e293b' }}>
                {deleteTarget.name}
              </span>
            </div>
          )}
        </div>
      </Dialog>

      {/* ── System File Error Modal ────────────────────────────── */}
      <Dialog
        header={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '2.25rem',
                height: '2.25rem',
                borderRadius: '0.625rem',
                background: 'rgba(251,146,60,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle size={18} color="#f97316" />
            </div>
            <span style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b' }}>
              {t('systemFile')}
            </span>
          </div>
        }
        visible={systemFileError}
        onHide={() => setSystemFileError(false)}
        style={{ width: '26rem', borderRadius: '1rem' }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              label="OK"
              size="small"
              onClick={() => setSystemFileError(false)}
              style={{ background: 'linear-gradient(135deg, #235ae4, #1a47b8)', border: 'none' }}
            />
          </div>
        }
      >
        <div
          style={{ padding: '0.5rem 0', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}
        >
          <Lock
            size={20}
            color="#64748b"
            strokeWidth={2}
            style={{ flexShrink: 0, marginTop: '0.125rem' }}
          />
          <p style={{ margin: 0, color: '#374151', fontSize: '0.875rem', lineHeight: 1.6 }}>
            {t('systemFileNoDelete')}
          </p>
        </div>
      </Dialog>

      {/* ── New Folder Dialog ──────────────────────────────────── */}
      <Dialog
        header={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '2.25rem',
                height: '2.25rem',
                borderRadius: '0.625rem',
                background: 'rgba(35,90,228,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FolderPlus size={18} color="#f59e0b" />
            </div>
            <span style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b' }}>
              {t('newFolder')}
            </span>
          </div>
        }
        visible={showNewFolder}
        onHide={() => {
          setShowNewFolder(false);
          setNewFolderName('');
        }}
        style={{ width: '22rem', borderRadius: '1rem' }}
        footer={
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button
              label={t('cancel') as string}
              outlined
              severity="secondary"
              size="small"
              onClick={() => setShowNewFolder(false)}
            />
            <Button
              label={t('createFolder') as string}
              size="small"
              disabled={!newFolderName.trim() || createFolderMutation.isPending}
              loading={createFolderMutation.isPending}
              onClick={() =>
                newFolderName.trim() && createFolderMutation.mutate(newFolderName.trim())
              }
              style={{ background: 'linear-gradient(135deg, #235ae4, #1a47b8)', border: 'none' }}
            />
          </div>
        }
      >
        <div style={{ padding: '0.5rem 0' }}>
          <label
            style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#374151',
              marginBottom: '0.5rem',
            }}
          >
            {t('folderName')}
          </label>
          <InputText
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder={t('folderName') as string}
            autoFocus
            onKeyDown={(e) =>
              e.key === 'Enter' &&
              newFolderName.trim() &&
              createFolderMutation.mutate(newFolderName.trim())
            }
            style={{ width: '100%' }}
          />
        </div>
      </Dialog>

      {/* ── Rename Dialog ──────────────────────────────────────── */}
      <Dialog
        header={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '2.25rem',
                height: '2.25rem',
                borderRadius: '0.625rem',
                background: 'rgba(59,130,246,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <File size={18} color="#3b82f6" />
            </div>
            <span style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b' }}>
              {t('renameFile')}
            </span>
          </div>
        }
        visible={!!renameTarget}
        onHide={() => {
          setRenameTarget(null);
          setRenameValue('');
        }}
        style={{ width: '22rem', borderRadius: '1rem' }}
        footer={
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button
              label={t('cancel') as string}
              outlined
              severity="secondary"
              size="small"
              onClick={() => setRenameTarget(null)}
            />
            <Button
              label={t('save') as string}
              size="small"
              disabled={!renameValue.trim() || renameMutation.isPending}
              loading={renameMutation.isPending}
              onClick={() =>
                renameTarget &&
                renameValue.trim() &&
                renameMutation.mutate({ nodeId: renameTarget.id, name: renameValue.trim() })
              }
              style={{ background: 'linear-gradient(135deg, #235ae4, #1a47b8)', border: 'none' }}
            />
          </div>
        }
      >
        <div style={{ padding: '0.5rem 0' }}>
          <InputText
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            autoFocus
            onKeyDown={(e) =>
              e.key === 'Enter' &&
              renameTarget &&
              renameValue.trim() &&
              renameMutation.mutate({ nodeId: renameTarget.id, name: renameValue.trim() })
            }
            style={{ width: '100%' }}
          />
        </div>
      </Dialog>

      {/* Drag-and-drop overlay */}
      <DriveDropZone
        enabled={activeView !== 'trash'}
        onFiles={handleUploadFiles}
        dropLabel={t('uploadDrop') as string}
        orLabel={t('uploadOr') as string}
      />
    </AdminLayout>
  );
}

// ─── Drag-and-drop overlay ────────────────────────────────────────────────────

function DriveDropZone({
  enabled,
  onFiles,
  dropLabel,
  orLabel,
}: {
  enabled: boolean;
  onFiles: (files: FileList) => void;
  dropLabel: string;
  orLabel: string;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    if (e.dataTransfer.types.includes('Files')) setIsDragging(true);
  };

  const handleDragLeave = () => {
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) onFiles(e.dataTransfer.files);
  };

  if (!enabled) return null;

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: isDragging ? 50 : -1,
        pointerEvents: isDragging ? 'all' : 'none',
        background: isDragging ? 'rgba(35,90,228,0.06)' : 'transparent',
        backdropFilter: isDragging ? 'blur(2px)' : 'none',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {isDragging && (
        <div
          style={{
            padding: '3rem 4rem',
            borderRadius: '1.5rem',
            border: '2px dashed #f59e0b',
            background: 'rgba(255,255,255,0.95)',
            textAlign: 'center',
            boxShadow: '0 16px 64px rgba(0,0,0,0.12)',
          }}
        >
          <Upload size={48} color="#f59e0b" strokeWidth={1.5} style={{ marginBottom: '1rem' }} />
          <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>
            {dropLabel}
          </p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: '#94a3b8' }}>{orLabel}</p>
        </div>
      )}
    </div>
  );
}
