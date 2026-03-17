function Bone({ className }: { className?: string }) {
    return (
        <div
            className={`animate-pulse rounded bg-neutral-200 dark:bg-neutral-700 ${className ?? ''}`}
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
        <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800">
            <Bone className="h-3 w-24" />
            <Bone className="mt-3 h-7 w-16" />
        </div>
    )
}
