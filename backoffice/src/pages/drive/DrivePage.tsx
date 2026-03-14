import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../../context/LanguageContext';
import { AdminLayout } from '../../components/AdminLayout';
import { PageHeader } from '../../components/PageHeader';
import { driveService, DriveNode, formatBytes } from '../../modules/drive';
import {
    HardDrive, FolderPlus, Upload, Search, Grid3x3, List,
    Trash2, RefreshCw, Star, Users, ChevronRight, Home,
    Folder, FolderOpen, File, FileText, FileImage, FileVideo, FileAudio,
    FileCode, FileArchive, MoreVertical, X,
    SortAsc, SortDesc,
} from 'lucide-react';
import { toastSuccess, toastError, toastDeleted, toastCreated } from '../../services/toast.service';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dialog } from 'primereact/dialog';
import { ProgressBar } from 'primereact/progressbar';
import { Menu } from 'primereact/menu';
import { MenuItem } from 'primereact/menuitem';

// ─── Types ────────────────────────────────────────────────────────────────────

type DriveView = 'my-drive' | 'shared' | 'trash' | 'starred';
type ViewMode = 'grid' | 'list';
type SortKey = 'name' | 'date' | 'size' | 'type';

interface BreadcrumbEntry {
    id: string | null;
    name: string;
}

// ─── MIME icon helper ─────────────────────────────────────────────────────────

function getMimeLucideIcon(mime?: string): typeof File {
    if (!mime) return File;
    if (mime.startsWith('image/')) return FileImage;
    if (mime.startsWith('video/')) return FileVideo;
    if (mime.startsWith('audio/')) return FileAudio;
    if (mime.includes('pdf') || mime.includes('word') || mime.includes('text')) return FileText;
    if (mime.includes('zip') || mime.includes('tar') || mime.includes('gz') || mime.includes('rar')) return FileArchive;
    if (mime.includes('javascript') || mime.includes('json') || mime.includes('xml') || mime.includes('html')) return FileCode;
    return File;
}

function getMimeAccentColor(mime?: string): string {
    if (!mime) return '#6366f1';
    if (mime.startsWith('image/')) return '#10b981';
    if (mime.startsWith('video/')) return '#8b5cf6';
    if (mime.startsWith('audio/')) return '#ec4899';
    if (mime.includes('pdf')) return '#ef4444';
    if (mime.includes('word') || mime.includes('document')) return '#3b82f6';
    if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv')) return '#22c55e';
    if (mime.includes('zip') || mime.includes('tar') || mime.includes('gz')) return '#f59e0b';
    if (mime.includes('javascript') || mime.includes('json') || mime.includes('code')) return '#f97316';
    return '#6366f1';
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface NodeCardProps {
    node: DriveNode;
    viewMode: ViewMode;
    isSelected: boolean;
    onSelect: (node: DriveNode) => void;
    onOpen: (node: DriveNode) => void;
    onMenuOpen: (e: React.MouseEvent, node: DriveNode) => void;
    folderLabel: string;
}

function NodeCard({ node, viewMode, isSelected, onSelect, onOpen, onMenuOpen, folderLabel }: NodeCardProps) {
    const [hovered, setHovered] = useState(false);
    const FileIcon = node.isFolder ? (hovered ? FolderOpen : Folder) : getMimeLucideIcon(node.mimeType ?? undefined);
    const accent = node.isFolder ? '#f59e0b' : getMimeAccentColor(node.mimeType ?? undefined);

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
                    background: isSelected ? 'rgba(245,158,11,0.08)' : hovered ? 'rgba(0,0,0,0.03)' : 'transparent',
                    border: `1px solid ${isSelected ? 'rgba(245,158,11,0.25)' : 'transparent'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    userSelect: 'none',
                }}
            >
                {/* Icon */}
                <div style={{
                    width: '2rem', height: '2rem', borderRadius: '0.5rem', flexShrink: 0,
                    background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <FileIcon size={16} color={accent} strokeWidth={2} />
                </div>

                {/* Name */}
                <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 500, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {node.name}
                </span>

                {/* Size */}
                <span style={{ width: '6rem', fontSize: '0.8125rem', color: '#94a3b8', flexShrink: 0 }}>
                    {node.isFolder ? '--' : formatBytes(node.sizeBytes ?? 0)}
                </span>

                {/* Date */}
                <span style={{ width: '8rem', fontSize: '0.8125rem', color: '#94a3b8', flexShrink: 0 }}>
                    {new Date(node.updatedAt).toLocaleDateString()}
                </span>

                {/* Actions */}
                <button
                    onClick={(e) => { e.stopPropagation(); onMenuOpen(e, node); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', borderRadius: '0.375rem', color: '#94a3b8', display: hovered || isSelected ? 'flex' : 'none', alignItems: 'center' }}
                >
                    <MoreVertical size={16} />
                </button>
            </div>
        );
    }

    // Grid card
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
                background: isSelected ? 'rgba(245,158,11,0.06)' : 'rgba(255,255,255,0.8)',
                border: `1.5px solid ${isSelected ? 'rgba(245,158,11,0.4)' : hovered ? 'rgba(226,232,240,1)' : 'rgba(226,232,240,0.7)'}`,
                boxShadow: hovered ? '0 4px 16px rgba(0,0,0,0.06)' : '0 1px 3px rgba(0,0,0,0.03)',
                cursor: 'pointer',
                transition: 'all 0.15s',
                userSelect: 'none',
                minWidth: 0,
            }}
        >
            {/* Actions button */}
            {(hovered || isSelected) && (
                <button
                    onClick={(e) => { e.stopPropagation(); onMenuOpen(e, node); }}
                    style={{
                        position: 'absolute', top: '0.5rem', right: '0.5rem',
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: '0.25rem', borderRadius: '0.375rem', color: '#64748b',
                        display: 'flex', alignItems: 'center',
                    }}
                >
                    <MoreVertical size={15} />
                </button>
            )}

            {/* Icon */}
            <div style={{
                width: '3.5rem', height: '3.5rem', borderRadius: '1rem',
                background: `linear-gradient(135deg, ${accent}22, ${accent}10)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1px solid ${accent}28`,
            }}>
                <FileIcon size={28} color={accent} strokeWidth={1.8} />
            </div>

            {/* Name */}
            <span style={{
                fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b',
                textAlign: 'center', width: '100%', overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontFamily: 'var(--font-latin)',
            }}>
                {node.name}
            </span>

            {/* Meta */}
            <span style={{ fontSize: '0.6875rem', color: '#94a3b8', fontFamily: 'var(--font-latin)' }}>
                {node.isFolder ? folderLabel : formatBytes(node.sizeBytes ?? 0)}
            </span>
        </div>
    );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, title, desc, action }: { icon: typeof Folder; title: string; desc: string; action?: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', gap: '1rem' }}>
            <div style={{ width: '5rem', height: '5rem', borderRadius: '1.5rem', background: 'rgba(245,158,11,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={36} color="#f59e0b" strokeWidth={1.5} />
            </div>
            <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#374151' }}>{title}</p>
                <p style={{ margin: '0.375rem 0 0', fontSize: '0.875rem', color: '#9ca3af' }}>{desc}</p>
            </div>
            {action && <div style={{ marginTop: '0.5rem' }}>{action}</div>}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DrivePage() {
    const { t } = useLanguage();
    const queryClient = useQueryClient();

    // Sort label lookup
    const sortLabels: Record<SortKey, string> = {
        name: t('sortByName'),
        date: t('sortByDate'),
        size: t('sortBySize'),
        type: t('sortByType'),
    };

    // ── State ────────────────────────────────────────────────────────────────

    const [activeView, setActiveView] = useState<DriveView>('my-drive');
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [breadcrumb, setBreadcrumb] = useState<BreadcrumbEntry[]>([{ id: null, name: t('myDrive') }]);
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortKey, setSortKey] = useState<SortKey>('name');
    const [sortAsc, setSortAsc] = useState(true);
    const [selectedNode, setSelectedNode] = useState<DriveNode | null>(null);

    // Dialogs
    const [showNewFolder, setShowNewFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [renameTarget, setRenameTarget] = useState<DriveNode | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

    // Context menu
    const menuRef = useRef<Menu>(null);
    const [menuTarget, setMenuTarget] = useState<DriveNode | null>(null);
    const menuItems: MenuItem[] = [];

    // Upload
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Queries ──────────────────────────────────────────────────────────────

    const nodesQuery = useQuery({
        queryKey: ['drive-nodes', activeView, currentFolderId],
        queryFn: async () => {
            if (activeView === 'trash') return driveService.listTrash();
            if (activeView === 'shared') return driveService.listSharedWithMe();
            if (currentFolderId) return driveService.listChildren(currentFolderId);
            return driveService.listRoot();
        },
    });

    const searchQuery2 = useQuery({
        queryKey: ['drive-search', searchQuery],
        queryFn: () => driveService.search({ q: searchQuery, limit: 50 }),
        enabled: searchQuery.trim().length > 1,
    });

    const statsQuery = useQuery({
        queryKey: ['drive-stats'],
        queryFn: () => driveService.getStats(),
    });

    // ── Mutations ────────────────────────────────────────────────────────────

    const createFolderMutation = useMutation({
        mutationFn: (name: string) =>
            driveService.createFolder({ name, parentNodeId: currentFolderId ?? undefined }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['drive-nodes'] });
            setShowNewFolder(false);
            setNewFolderName('');
            toastCreated(t('createFolder'));
        },
        onError: (e: Error) => toastError(t('failedToCreate'), { description: e.message }),
    });

    const trashMutation = useMutation({
        mutationFn: (nodeId: string) => driveService.trashNode(nodeId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['drive-nodes'] });
            setSelectedNode(null);
            toastDeleted(t('moveToTrash'));
        },
        onError: (e: Error) => toastError(t('error'), { description: e.message }),
    });

    const restoreMutation = useMutation({
        mutationFn: (nodeId: string) => driveService.restoreNode(nodeId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['drive-nodes'] });
            toastSuccess(t('restoreFile'));
        },
        onError: (e: Error) => toastError(t('error'), { description: e.message }),
    });

    const deleteMutation = useMutation({
        mutationFn: (nodeId: string) => driveService.permanentDelete(nodeId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['drive-nodes'] });
            setSelectedNode(null);
            toastDeleted(t('deleteForever'));
        },
        onError: (e: Error) => toastError(t('error'), { description: e.message }),
    });

    const renameMutation = useMutation({
        mutationFn: ({ nodeId, name }: { nodeId: string; name: string }) =>
            driveService.updateNode(nodeId, { name }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['drive-nodes'] });
            setRenameTarget(null);
            setRenameValue('');
            toastSuccess(t('save'));
        },
        onError: (e: Error) => toastError(t('failedToUpdate'), { description: e.message }),
    });

    // ── Handlers ─────────────────────────────────────────────────────────────

    const openNode = useCallback((node: DriveNode) => {
        if (node.isFolder) {
            setBreadcrumb((prev) => [...prev, { id: node.id, name: node.name }]);
            setCurrentFolderId(node.id);
            setSelectedNode(null);
        } else {
            // Download file
            driveService.getDownloadUrl(node.id).then(({ url }) => {
                window.open(url, '_blank', 'noopener,noreferrer');
            }).catch((e: Error) => toastError(t('error'), { description: e.message }));
        }
    }, [t]);

    const navigateBreadcrumb = useCallback((entry: BreadcrumbEntry) => {
        const idx = breadcrumb.findIndex((b) => b.id === entry.id);
        setBreadcrumb((prev) => prev.slice(0, idx + 1));
        setCurrentFolderId(entry.id);
        setSelectedNode(null);
    }, [breadcrumb]);

    const handleUploadFiles = useCallback(async (files: FileList) => {
        const uploads = Array.from(files);
        for (const file of uploads) {
            setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }));
            try {
                await driveService.uploadFile(file, currentFolderId ?? undefined, undefined, (pct) => {
                    setUploadProgress((prev) => ({ ...prev, [file.name]: pct }));
                });
                setUploadProgress((prev) => { const n = { ...prev }; delete n[file.name]; return n; });
                queryClient.invalidateQueries({ queryKey: ['drive-nodes'] });
                toastCreated(t('uploadSuccess'));
            } catch (e: unknown) {
                setUploadProgress((prev) => { const n = { ...prev }; delete n[file.name]; return n; });
                toastError(t('uploadError'), { description: (e as Error).message });
            }
        }
    }, [currentFolderId, queryClient, t]);

    const openContextMenu = useCallback((e: React.MouseEvent, node: DriveNode) => {
        e.preventDefault();
        e.stopPropagation();
        setMenuTarget(node);
        menuRef.current?.show(e);
    }, []);

    // Build context menu items dynamically based on view
    const buildMenuItems = (node: DriveNode | null): MenuItem[] => {
        if (!node) return [];
        const items: MenuItem[] = [];

        if (!node.isFolder && activeView !== 'trash') {
            items.push({
                label: t('downloadFile'),
                icon: 'pi pi-download',
                command: () => {
                    driveService.getDownloadUrl(node.id).then(({ url }) => {
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = node.name;
                        a.target = '_blank';
                        a.rel = 'noopener noreferrer';
                        a.click();
                    }).catch((e: Error) => toastError(t('error'), { description: e.message }));
                },
            });
        }

        if (activeView !== 'trash') {
            items.push({
                label: t('renameFile'),
                icon: 'pi pi-pencil',
                command: () => {
                    setRenameTarget(node);
                    setRenameValue(node.name);
                },
            });
            items.push({
                label: t('moveToTrash'),
                icon: 'pi pi-trash',
                command: () => trashMutation.mutate(node.id),
            });
        }

        if (activeView === 'trash') {
            items.push({
                label: t('restoreFile'),
                icon: 'pi pi-refresh',
                command: () => restoreMutation.mutate(node.id),
            });
            items.push({
                separator: true,
            });
            items.push({
                label: t('deleteForever'),
                icon: 'pi pi-times-circle',
                command: () => deleteMutation.mutate(node.id),
            });
        }

        return items;
    };

    // ── Sorting ──────────────────────────────────────────────────────────────

    const rawNodes: DriveNode[] =
        searchQuery.trim().length > 1
            ? ((searchQuery2.data?.nodes ?? []) as DriveNode[])
            : (nodesQuery.data ?? []);

    const sortedNodes = [...rawNodes].sort((a, b) => {
        // Folders always first
        if (a.isFolder && !b.isFolder) return -1;
        if (!a.isFolder && b.isFolder) return 1;

        let cmp = 0;
        if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
        else if (sortKey === 'size') cmp = (a.sizeBytes ?? 0) - (b.sizeBytes ?? 0);
        else if (sortKey === 'date') cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        else if (sortKey === 'type') cmp = (a.mimeType ?? '').localeCompare(b.mimeType ?? '');
        return sortAsc ? cmp : -cmp;
    });

    const isLoading = nodesQuery.isLoading || (searchQuery.trim().length > 1 && searchQuery2.isLoading);

    // ── Left nav items ────────────────────────────────────────────────────────

    const navItems: Array<{ key: DriveView; icon: typeof HardDrive; label: string }> = [
        { key: 'my-drive', icon: HardDrive, label: t('myDrive') },
        { key: 'shared', icon: Users, label: t('sharedWithMe') },
        { key: 'starred', icon: Star, label: t('starred') },
        { key: 'trash', icon: Trash2, label: t('trash') },
    ];

    const changeView = (view: DriveView) => {
        setActiveView(view);
        setCurrentFolderId(null);
        setBreadcrumb([{ id: null, name: t(view === 'my-drive' ? 'myDrive' : view === 'shared' ? 'sharedWithMe' : view === 'starred' ? 'starred' : 'trash') }]);
        setSelectedNode(null);
        setSearchQuery('');
    };

    // ── Stats ─────────────────────────────────────────────────────────────────

    const stats = statsQuery.data;

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <AdminLayout>
            <PageHeader
                icon={HardDrive}
                title={t('drive')}
                subtitle={stats ? `${formatBytes(stats.totalBytes)} · ${stats.totalFiles} ${t('totalFiles')}` : undefined}
                actions={
                    activeView !== 'trash' && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <Button
                                label={t('newFolder')}
                                icon={<FolderPlus size={15} style={{ marginRight: '0.375rem' }} />}
                                severity="secondary"
                                outlined
                                size="small"
                                onClick={() => setShowNewFolder(true)}
                                style={{ fontSize: '0.8125rem', height: '2.25rem' }}
                            />
                            <Button
                                label={t('uploadFile')}
                                icon={<Upload size={15} style={{ marginRight: '0.375rem' }} />}
                                size="small"
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    fontSize: '0.8125rem', height: '2.25rem',
                                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                    border: 'none', boxShadow: '0 2px 8px rgba(245,158,11,0.35)',
                                }}
                            />
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                style={{ display: 'none' }}
                                onChange={(e) => e.target.files && handleUploadFiles(e.target.files)}
                            />
                        </div>
                    )
                }
            />

            {/* Upload progress bar */}
            {Object.entries(uploadProgress).length > 0 && (
                <div style={{ marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    {Object.entries(uploadProgress).map(([name, pct]) => (
                        <div key={name} style={{
                            background: 'rgba(255,255,255,0.8)', borderRadius: '0.75rem', padding: '0.625rem 1rem',
                            border: '1px solid rgba(226,232,240,0.6)', backdropFilter: 'blur(8px)',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                                <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#374151' }}>{name}</span>
                                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{pct}%</span>
                            </div>
                            <ProgressBar value={pct} style={{ height: '0.375rem', borderRadius: '99px' }} />
                        </div>
                    ))}
                </div>
            )}

            {/* Main Drive Layout */}
            <div style={{ display: 'flex', gap: '1rem', height: 'calc(100vh - 12rem)', minHeight: '30rem' }}>

                {/* ── Left Navigation Panel ─────────────────────────────── */}
                <div style={{
                    width: '13.5rem', flexShrink: 0,
                    background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(8px)',
                    borderRadius: '1rem', border: '1px solid rgba(226,232,240,0.6)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    padding: '0.75rem',
                    display: 'flex', flexDirection: 'column', gap: '0.25rem',
                }}>
                    {navItems.map(({ key, icon: Icon, label }) => {
                        const active = activeView === key && !searchQuery;
                        return (
                            <button
                                key={key}
                                onClick={() => changeView(key)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.625rem',
                                    padding: '0.625rem 0.875rem', borderRadius: '0.625rem',
                                    background: active ? 'rgba(245,158,11,0.1)' : 'transparent',
                                    border: `1px solid ${active ? 'rgba(245,158,11,0.25)' : 'transparent'}`,
                                    cursor: 'pointer', width: '100%', textAlign: 'left',
                                    transition: 'all 0.15s', color: active ? '#d97706' : '#475569',
                                    fontWeight: active ? 600 : 500, fontSize: '0.875rem',
                                }}
                            >
                                <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
                                {label}
                            </button>
                        );
                    })}

                    {/* Storage stats at bottom */}
                    {stats && (
                        <div style={{ marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid rgba(226,232,240,0.6)' }}>
                            <p style={{ margin: '0 0 0.5rem', fontSize: '0.6875rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                {t('storageUsed')}
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                {[
                                    { label: t('totalFiles'), value: stats.totalFiles },
                                    { label: t('totalFolders'), value: stats.totalFolders },
                                    { label: t('sharedCount'), value: stats.sharedWithMeCount },
                                ].map(({ label, value }) => (
                                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{label}</span>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151' }}>{value}</span>
                                    </div>
                                ))}
                                <div style={{ marginTop: '0.25rem' }}>
                                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#f59e0b' }}>
                                        {formatBytes(stats.totalBytes)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Main Content Area ─────────────────────────────────── */}
                <div style={{
                    flex: 1, minWidth: 0,
                    background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(8px)',
                    borderRadius: '1rem', border: '1px solid rgba(226,232,240,0.6)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    display: 'flex', flexDirection: 'column', overflow: 'hidden',
                }}>

                    {/* Toolbar */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '0.875rem 1.25rem',
                        borderBottom: '1px solid rgba(226,232,240,0.6)',
                        flexWrap: 'wrap',
                    }}>
                        {/* Breadcrumb */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flex: 1, minWidth: 0 }}>
                            {breadcrumb.map((entry, idx) => (
                                <span key={entry.id ?? 'root'} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    {idx > 0 && <ChevronRight size={14} color="#cbd5e1" />}
                                    <button
                                        onClick={() => idx < breadcrumb.length - 1 ? navigateBreadcrumb(entry) : undefined}
                                        style={{
                                            background: 'none', border: 'none', cursor: idx < breadcrumb.length - 1 ? 'pointer' : 'default',
                                            padding: '0.125rem 0.25rem', borderRadius: '0.25rem',
                                            fontSize: '0.875rem',
                                            fontWeight: idx === breadcrumb.length - 1 ? 600 : 400,
                                            color: idx === breadcrumb.length - 1 ? '#1e293b' : '#64748b',
                                        }}
                                    >
                                        {idx === 0 ? <Home size={15} strokeWidth={2} /> : entry.name}
                                    </button>
                                </span>
                            ))}
                        </div>

                        {/* Search */}
                        <div style={{ position: 'relative' }}>
                            <Search size={14} style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
                            <InputText
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t('search')}
                                style={{
                                    paddingLeft: '2rem', paddingRight: searchQuery ? '2rem' : '0.75rem',
                                    height: '2rem', fontSize: '0.8125rem', width: '14rem',
                                    border: '1px solid rgba(226,232,240,0.8)',
                                    borderRadius: '0.5rem', background: 'rgba(248,250,252,0.8)',
                                }}
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '0.125rem' }}
                                >
                                    <X size={13} />
                                </button>
                            )}
                        </div>

                        {/* Sort */}
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                            {(['name', 'date', 'size', 'type'] as SortKey[]).map((key) => (
                                <button
                                    key={key}
                                    onClick={() => { if (sortKey === key) setSortAsc(!sortAsc); else { setSortKey(key); setSortAsc(true); } }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.25rem',
                                        padding: '0.25rem 0.5rem', borderRadius: '0.375rem',
                                        background: sortKey === key ? 'rgba(245,158,11,0.1)' : 'transparent',
                                        border: `1px solid ${sortKey === key ? 'rgba(245,158,11,0.3)' : 'rgba(226,232,240,0.6)'}`,
                                        cursor: 'pointer', fontSize: '0.75rem', fontWeight: sortKey === key ? 600 : 400,
                                        color: sortKey === key ? '#d97706' : '#64748b',
                                    }}
                                >
                                    {sortLabels[key]}
                                    {sortKey === key && (sortAsc ? <SortAsc size={11} /> : <SortDesc size={11} />)}
                                </button>
                            ))}
                        </div>

                        {/* View toggle */}
                        <div style={{ display: 'flex', background: 'rgba(241,245,249,0.8)', borderRadius: '0.5rem', padding: '0.125rem' }}>
                            {(['grid', 'list'] as ViewMode[]).map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => setViewMode(mode)}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        width: '2rem', height: '1.75rem', borderRadius: '0.375rem',
                                        background: viewMode === mode ? 'white' : 'transparent',
                                        border: 'none', cursor: 'pointer', color: viewMode === mode ? '#1e293b' : '#9ca3af',
                                        boxShadow: viewMode === mode ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    {mode === 'grid' ? <Grid3x3 size={15} /> : <List size={15} />}
                                </button>
                            ))}
                        </div>

                        {/* Refresh */}
                        <button
                            onClick={() => queryClient.invalidateQueries({ queryKey: ['drive-nodes'] })}
                            style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0.25rem' }}
                            title={t('loading')}
                        >
                            <RefreshCw size={15} className={isLoading ? 'pi-spin' : ''} />
                        </button>
                    </div>

                    {/* List header in list mode */}
                    {viewMode === 'list' && sortedNodes.length > 0 && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            padding: '0.375rem 1rem',
                            borderBottom: '1px solid rgba(226,232,240,0.6)',
                        }}>
                            <div style={{ width: '2rem', flexShrink: 0 }} />
                            <span style={{ flex: 1, fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('fileName')}</span>
                            <span style={{ width: '6rem', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>{t('fileSize')}</span>
                            <span style={{ width: '8rem', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>{t('lastModified')}</span>
                            <div style={{ width: '2rem', flexShrink: 0 }} />
                        </div>
                    )}

                    {/* Content */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: viewMode === 'grid' ? '1rem' : '0.5rem 0.75rem' }}>
                        {isLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <i className="pi pi-spin pi-spinner" style={{ fontSize: '1.5rem', color: '#f59e0b' }} />
                                    <p style={{ marginTop: '0.75rem', color: '#94a3b8', fontSize: '0.875rem' }}>{t('loading')}</p>
                                </div>
                            </div>
                        ) : sortedNodes.length === 0 ? (
                            <EmptyState
                                icon={activeView === 'trash' ? Trash2 : activeView === 'shared' ? Users : Folder}
                                title={t(activeView === 'trash' ? 'trashEmpty' : activeView === 'shared' ? 'sharedEmpty' : searchQuery ? 'searchEmpty' : 'driveEmpty')}
                                desc={t(activeView === 'trash' ? 'trashEmptyDesc' : activeView === 'shared' ? 'sharedEmptyDesc' : searchQuery ? 'searchEmptyDesc' : 'driveEmptyDesc')}
                                action={
                                    activeView === 'my-drive' && !searchQuery ? (
                                        <Button
                                            label={t('uploadFile')}
                                            icon={<Upload size={14} style={{ marginRight: '0.375rem' }} />}
                                            size="small"
                                            onClick={() => fileInputRef.current?.click()}
                                            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', border: 'none' }}
                                        />
                                    ) : undefined
                                }
                            />
                        ) : viewMode === 'grid' ? (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(8.5rem, 1fr))',
                                gap: '0.625rem',
                            }}>
                                {sortedNodes.map((node) => (
                                    <NodeCard
                                        key={node.id}
                                        node={node}
                                        viewMode="grid"
                                        isSelected={selectedNode?.id === node.id}
                                        onSelect={setSelectedNode}
                                        onOpen={openNode}
                                        onMenuOpen={openContextMenu}
                                        folderLabel={t('fileType')}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                                {sortedNodes.map((node) => (
                                    <NodeCard
                                        key={node.id}
                                        node={node}
                                        viewMode="list"
                                        isSelected={selectedNode?.id === node.id}
                                        onSelect={setSelectedNode}
                                        onOpen={openNode}
                                        onMenuOpen={openContextMenu}
                                        folderLabel={t('fileType')}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Status bar */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '0.5rem 1.25rem',
                        borderTop: '1px solid rgba(226,232,240,0.6)',
                        fontSize: '0.75rem', color: '#94a3b8',
                    }}>
                        <span>
                            {sortedNodes.length} {sortedNodes.length === 1 ? t('item') : t('items')}
                            {selectedNode && ` · ${t('selected')}: ${selectedNode.name}`}
                        </span>
                        {selectedNode && (
                            <span>{selectedNode.isFolder ? t('fileType') : formatBytes(selectedNode.sizeBytes ?? 0)}</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Context Menu */}
            <Menu model={buildMenuItems(menuTarget)} popup ref={menuRef} />

            {/* ── New Folder Dialog ──────────────────────────────────── */}
            <Dialog
                header={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.625rem', background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FolderPlus size={18} color="#f59e0b" />
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b' }}>{t('newFolder')}</span>
                    </div>
                }
                visible={showNewFolder}
                onHide={() => { setShowNewFolder(false); setNewFolderName(''); }}
                style={{ width: '22rem', borderRadius: '1rem' }}
                footer={
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <Button label={t('cancel')} outlined severity="secondary" size="small" onClick={() => setShowNewFolder(false)} />
                        <Button
                            label={t('createFolder')}
                            size="small"
                            disabled={!newFolderName.trim() || createFolderMutation.isPending}
                            loading={createFolderMutation.isPending}
                            onClick={() => newFolderName.trim() && createFolderMutation.mutate(newFolderName.trim())}
                            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', border: 'none' }}
                        />
                    </div>
                }
            >
                <div style={{ padding: '0.5rem 0' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>
                        {t('folderName')}
                    </label>
                    <InputText
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        placeholder={t('folderName')}
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && newFolderName.trim() && createFolderMutation.mutate(newFolderName.trim())}
                        style={{ width: '100%' }}
                    />
                </div>
            </Dialog>

            {/* ── Rename Dialog ──────────────────────────────────────── */}
            <Dialog
                header={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.625rem', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <File size={18} color="#3b82f6" />
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b' }}>{t('renameFile')}</span>
                    </div>
                }
                visible={!!renameTarget}
                onHide={() => { setRenameTarget(null); setRenameValue(''); }}
                style={{ width: '22rem', borderRadius: '1rem' }}
                footer={
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <Button label={t('cancel')} outlined severity="secondary" size="small" onClick={() => setRenameTarget(null)} />
                        <Button
                            label={t('save')}
                            size="small"
                            disabled={!renameValue.trim() || renameMutation.isPending}
                            loading={renameMutation.isPending}
                            onClick={() => renameTarget && renameValue.trim() && renameMutation.mutate({ nodeId: renameTarget.id, name: renameValue.trim() })}
                            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', border: 'none' }}
                        />
                    </div>
                }
            >
                <div style={{ padding: '0.5rem 0' }}>
                    <InputText
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && renameTarget && renameValue.trim() && renameMutation.mutate({ nodeId: renameTarget.id, name: renameValue.trim() })}
                        style={{ width: '100%' }}
                    />
                </div>
            </Dialog>

            {/* Drop zone overlay */}
            <DriveDropZone
                enabled={activeView !== 'trash'}
                onFiles={handleUploadFiles}
                dropLabel={t('uploadDrop')}
                orLabel={t('uploadOr')}
            />
        </AdminLayout>
    );
}

// ─── Drag-and-drop overlay ────────────────────────────────────────────────────

function DriveDropZone({ enabled, onFiles, dropLabel, orLabel }: {
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
                position: 'fixed', inset: 0, zIndex: isDragging ? 50 : -1,
                pointerEvents: isDragging ? 'all' : 'none',
                background: isDragging ? 'rgba(245,158,11,0.06)' : 'transparent',
                backdropFilter: isDragging ? 'blur(2px)' : 'none',
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
        >
            {isDragging && (
                <div style={{
                    padding: '3rem 4rem', borderRadius: '1.5rem',
                    border: '2px dashed #f59e0b', background: 'rgba(255,255,255,0.95)',
                    textAlign: 'center', boxShadow: '0 16px 64px rgba(0,0,0,0.12)',
                }}>
                    <Upload size={48} color="#f59e0b" strokeWidth={1.5} style={{ marginBottom: '1rem' }} />
                    <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>{dropLabel}</p>
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: '#94a3b8' }}>{orLabel}</p>
                </div>
            )}
        </div>
    );
}
