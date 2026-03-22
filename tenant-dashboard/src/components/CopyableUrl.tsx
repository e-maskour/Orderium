import { Copy, CheckCheck } from 'lucide-react'
import { useState } from 'react'

interface Props {
    value: string
    label?: string
    href?: string
}

export function CopyableUrl({ value, label, href }: Props) {
    const [copied, setCopied] = useState(false)

    const copy = async () => {
        await navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800/50">
            {label && (
                <span className="min-w-[70px] text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    {label}
                </span>
            )}
            {href ? (
                <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 truncate text-xs text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
                >
                    {value}
                </a>
            ) : (
                <span className="flex-1 truncate text-xs text-neutral-700 dark:text-neutral-300">
                    {value}
                </span>
            )}
            <button
                onClick={copy}
                className="shrink-0 rounded p-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                aria-label="Copy to clipboard"
            >
                {copied ? (
                    <CheckCheck className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                    <Copy className="h-3.5 w-3.5" />
                )}
            </button>
        </div>
    )
}
