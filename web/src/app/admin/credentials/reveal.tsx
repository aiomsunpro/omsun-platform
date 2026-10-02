"use client";

import { Copy, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { revealPassword } from "./actions";

// The password stays on the server until Show is clicked, and hides again after 30 seconds.
export function PasswordCell({ id, hasPassword }: { id: string; hasPassword: boolean }) {
  const [value, setValue] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  if (!hasPassword) return <span className="text-slate-400">—</span>;

  async function show() {
    const pw = await revealPassword(id);
    setValue(pw ?? "");
    setTimeout(() => setValue(null), 30_000);
  }

  return (
    <span className="inline-flex items-center gap-2">
      <code className="rounded bg-slate-100 px-2 py-0.5 text-xs">{value ?? "••••••••"}</code>
      {value === null ? (
        <button type="button" onClick={show} title="Show password" className="text-blue-700 hover:text-blue-900">
          <Eye className="h-4 w-4" />
        </button>
      ) : (
        <>
          <button type="button" onClick={() => setValue(null)} title="Hide password" className="text-blue-700 hover:text-blue-900">
            <EyeOff className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Copy password"
            className="text-blue-700 hover:text-blue-900"
            onClick={async () => {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            <Copy className="h-4 w-4" />
          </button>
          {copied && <span className="text-xs text-green-700">Copied</span>}
        </>
      )}
    </span>
  );
}
