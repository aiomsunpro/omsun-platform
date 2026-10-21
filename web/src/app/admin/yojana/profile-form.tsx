"use client";

import { startTransition, useActionState, useState } from "react";
import type { ActionState } from "@/lib/types";
import { inputBase } from "@/components/ui";
import { DONT_KNOW, type Answers, type FamilyMember, type ProfileField } from "@/lib/yojana";

type Props = {
  familyId: string;
  fields: ProfileField[];
  household: Answers;
  members: Pick<FamilyMember, "id" | "full_name" | "answers">[];
  // "field" for a family question, "field:memberId" for a person's question
  wanted: string[];
  blockNames: Record<number, string>;
  save: (state: ActionState, formData: FormData) => Promise<ActionState>;
};

// The family profile: family questions once, person questions in one column
// per family member. Blocks 1 to 3 are open; the rest open when a scheme
// still needs one of their answers.
export function ProfileForm({ familyId, fields, household, members, wanted, blockNames, save }: Props) {
  const [house, setHouse] = useState<Answers>(household);
  const [people, setPeople] = useState<Record<string, Answers>>(
    Object.fromEntries(members.map((m) => [m.id, m.answers ?? {}])),
  );
  const [state, formAction, pending] = useActionState(save, undefined);
  const want = new Set(wanted);
  const blocks = [...new Set(fields.map((f) => f.block))].sort((a, b) => a - b);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData();
    data.set("family_id", familyId);
    data.set("answers", JSON.stringify({ household: house, members: people }));
    startTransition(() => formAction(data));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {blocks.map((b) => {
        const inBlock = fields.filter((f) => f.block === b);
        const hh = inBlock.filter((f) => f.scope === "household");
        const mm = inBlock.filter((f) => f.scope === "member");
        const needed = inBlock.some((f) => want.has(f.key) || members.some((m) => want.has(`${f.key}:${m.id}`)));
        return (
          <details key={b} open={b <= 3 || needed} className="rounded-xl border border-slate-100 bg-white shadow-sm">
            <summary className="cursor-pointer px-5 py-3 font-semibold text-blue-950">
              {b}. {blockNames[b] ?? "More"}
              {needed && <span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">needed</span>}
            </summary>
            <div className="overflow-x-auto px-5 pb-4">
              <table className="min-w-full text-sm">
                {mm.length > 0 && (
                  <thead>
                    <tr className="text-left text-xs text-gray-500">
                      <th className="py-2 pr-3 font-medium" />
                      {members.map((m) => (
                        <th key={m.id} className="min-w-44 py-2 pr-3 font-medium text-blue-900">{m.full_name}</th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody className="divide-y divide-gray-50">
                  {hh.map((f) => (
                    <tr key={f.key} className={want.has(f.key) ? "bg-yellow-50" : ""}>
                      <td className="py-2 pr-3 align-top">
                        <div className="font-medium">{f.label_en}</div>
                        <div className="text-xs text-gray-500">{f.label_mr} · whole family</div>
                      </td>
                      <td className="py-2 pr-3" colSpan={Math.max(1, members.length)}>
                        <AnswerInput field={f} value={house[f.key]} onChange={(v) => setHouse((h) => put(h, f.key, v))} />
                      </td>
                    </tr>
                  ))}
                  {mm.map((f) => (
                    <tr key={f.key}>
                      <td className="py-2 pr-3 align-top">
                        <div className="font-medium">{f.label_en}</div>
                        <div className="text-xs text-gray-500">{f.label_mr}</div>
                      </td>
                      {members.map((m) => (
                        <td key={m.id} className={`py-2 pr-3 align-top ${want.has(`${f.key}:${m.id}`) ? "bg-yellow-50" : ""}`}>
                          <AnswerInput
                            field={f}
                            value={people[m.id]?.[f.key]}
                            onChange={(v) => setPeople((p) => ({ ...p, [m.id]: put(p[m.id] ?? {}, f.key, v) }))}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        );
      })}
      <div className="sticky bottom-0 flex items-center gap-3 border-t border-slate-200 bg-white/95 py-3">
        <button type="submit" disabled={pending}
          className="rounded-md bg-blue-700 px-5 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50">
          {pending ? "Checking…" : "Save and check schemes"}
        </button>
        {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
        {state?.ok && <p className="text-sm text-green-700">{state.ok}</p>}
      </div>
    </form>
  );
}

function put(a: Answers, key: string, v: unknown): Answers {
  const next = { ...a };
  if (v === undefined) delete next[key];
  else next[key] = v;
  return next;
}

// "" in a select means not asked yet (left out of the answers).
function AnswerInput({ field, value, onChange }: { field: ProfileField; value: unknown; onChange: (v: unknown) => void }) {
  const dk = value === DONT_KNOW;
  if (field.kind === "choice" || field.kind === "band" || field.kind === "yes_no") {
    const opts = field.kind === "yes_no" ? [{ value: "yes", en: "Yes" }, { value: "no", en: "No" }] : field.options;
    const current = field.kind === "yes_no" && typeof value === "boolean" ? (value ? "yes" : "no") : String(value ?? "");
    return (
      <select
        value={current}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "") onChange(undefined);
          else if (field.kind === "yes_no" && v !== DONT_KNOW) onChange(v === "yes");
          else onChange(v);
        }}
        className={`${inputBase} w-full ${current === "" ? "text-gray-400" : ""}`}
      >
        <option value="">Not asked</option>
        {opts.map((o) => (
          <option key={o.value} value={o.value}>{o.en}</option>
        ))}
        <option value={DONT_KNOW}>Don&apos;t know</option>
      </select>
    );
  }
  if (field.kind === "multi") {
    const picked = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {field.options.map((o) => (
          <label key={o.value} className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={picked.includes(o.value)}
              onChange={(e) => onChange(e.target.checked ? [...picked, o.value] : picked.filter((p) => p !== o.value))}
            />
            {o.en}
          </label>
        ))}
        <label className="flex items-center gap-1 text-gray-600">
          <input type="checkbox" checked={Array.isArray(value) && picked.length === 0} onChange={(e) => onChange(e.target.checked ? [] : undefined)} />
          None
        </label>
        <label className="flex items-center gap-1 text-gray-600">
          <input type="checkbox" checked={dk} onChange={(e) => onChange(e.target.checked ? DONT_KNOW : undefined)} />
          Don&apos;t know
        </label>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <input
        type={field.kind === "date" ? "date" : "number"}
        min={field.kind === "number" ? 0 : undefined}
        value={dk || value === undefined || value === null ? "" : String(value)}
        disabled={dk}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === "" ? undefined : field.kind === "number" ? Number(v) : v);
        }}
        className={`${inputBase} w-28`}
      />
      <label className="flex items-center gap-1 text-xs text-gray-600">
        <input type="checkbox" checked={dk} onChange={(e) => onChange(e.target.checked ? DONT_KNOW : undefined)} />
        Don&apos;t know
      </label>
    </div>
  );
}
