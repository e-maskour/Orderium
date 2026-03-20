function Bone({ className }: { className?: string }) {
    return (
        <div
            className={`animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800 ${className ?? ''}`}
        />
    )
}

export function SkeletonRow() {
    return (
        <tr>
            {Array.from({ length: 7 }).map((_, i) => (
                <td key={i} className="px-4 py-3">
                    <Bone className="h-4 w-full" />
                </td>
            ))}
        </tr>
    )
}

export function SkeletonCard() {
    return (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-700/40 dark:bg-slate-900/90">
            <div className="flex items-start justify-between mb-3">
                <Bone className="h-10 w-10 rounded-xl" />
            </div>
            <Bone className="h-7 w-14 mt-1" />
            <Bone className="h-3 w-24 mt-2.5" />
            <Bone className="h-2.5 w-20 mt-1.5" />
        </div>
    )
}

export function SkeletonListItem() {
    return (
        <div className="flex items-center gap-3 px-5 py-3.5">
            <Bone className="h-9 w-9 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2 min-w-0">
                <Bone className="h-3.5 w-2/5" />
                <Bone className="h-2.5 w-1/4" />
            </div>
            <Bone className="h-5 w-16 rounded-full" />
        </div>
    )
}
