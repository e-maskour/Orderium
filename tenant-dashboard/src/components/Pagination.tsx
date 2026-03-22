import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
    page: number
    totalPages: number
    total: number
    limit: number
    onPageChange: (page: number) => void
}

export function Pagination({ page, totalPages, total, limit, onPageChange }: Props) {
    const from = (page - 1) * limit + 1
    const to = Math.min(page * limit, total)

    return (
        <div className="flex items-center justify-between text-sm text-neutral-500 dark:text-neutral-400">
            <span>
                Showing {from}–{to} of {total}
            </span>
            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={page <= 1}
                    className="rounded p-1 hover:bg-neutral-100 disabled:opacity-40 dark:hover:bg-neutral-700"
                    aria-label="Previous page"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    const p = i + 1
                    return (
                        <button
                            key={p}
                            onClick={() => onPageChange(p)}
                            className={`min-w-[2rem] rounded px-2 py-1 text-xs font-medium transition ${p === page
                                    ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                                    : 'hover:bg-neutral-100 dark:hover:bg-neutral-700'
                                }`}
                        >
                            {p}
                        </button>
                    )
                })}
                <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= totalPages}
                    className="rounded p-1 hover:bg-neutral-100 disabled:opacity-40 dark:hover:bg-neutral-700"
                    aria-label="Next page"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>
        </div>
    )
}
