"use client";

import { startTransition, useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { ActionState } from "@/lib/types";
import { Card, Field, inputBase, inputClass } from "@/components/ui";
import {
  CATEGORIES,
  OP_LABEL,
  OPS_FOR_KIND,
  defaultValue,
  type ProfileField,
  type RuleOp,
  type SchemeData,
  type SchemeDocument,
  type SchemeRule,
  type SchemeStep,
} from "@/lib/yojana";

type Props = {
  versionId: string;
  initial: SchemeData;
  note: string;
  source: string | null;
  fields: ProfileField[];
  services: { code: string; name_en: string }[];
  save: (state: ActionState, formData: FormData) => Promise<ActionState>;
};

const small = `${inputBase} w-full`;

// Edits every part of a scheme draft in one place. The whole scheme is sent
// to the server as one JSON value, the same shape the database stores.
export function SchemeEditor({ versionId, initial, note, source, fields, services, save }: Props) {
  const [d, setD] = useState<SchemeData>(initial);
  const [state, formAction, pending] = useActionState(save, undefined);
  const byKey = new Map(fields.map((f) => [f.key, f]));
  const set = <K extends keyof SchemeData>(k: K, v: SchemeData[K]) => setD((x) => ({ ...x, [k]: v }));

  const groups = [...new Set(d.rules.filter((r) => !r.is_exclusion).map((r) => r.rule_group ?? 1))].sort((a, b) => a - b);
  const setRule = (i: number, r: SchemeRule) => set("rules", d.rules.map((x, j) => (j === i ? r : x)));
  const addRule = (group: number, exclusion = false) => {
    const f = fields[0];
    const op = OPS_FOR_KIND[f.kind][0];
    set("rules", [
      ...d.rules,
      { field: f.key, op, value: defaultValue(f, op), ...(exclusion ? { is_exclusion: true } : { rule_group: group }) },
    ]);
  };

  const submit = (intent: "save" | "submit") => (e: React.MouseEvent<HTMLButtonElement>) => {
    const form = e.currentTarget.form;
    if (!form) return;
    e.preventDefault();
    const data = new FormData(form);
    data.set("intent", intent);
    data.set("data", JSON.stringify(d));
    startTransition(() => formAction(data));
  };

  return (
    <form className="space-y-6">
      <input type="hidden" name="id" value={versionId} />

      <Card title="Scheme">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Code *">
            <input value={d.code} onChange={(e) => set("code", e.target.value.toUpperCase())} className={inputClass} />
          </Field>
          <Field label="Level">
            <select
              value={d.level}
              onChange={(e) => {
                const level = e.target.value as SchemeData["level"];
                setD((x) => ({ ...x, level, state: level === "central" ? null : x.state || "MH" }));
              }}
              className={inputClass}
            >
              <option value="state">State</option>
              <option value="central">Central</option>
            </select>
          </Field>
          <Field label="State">
            <input
              value={d.state ?? ""}
              disabled={d.level === "central"}
              onChange={(e) => set("state", e.target.value.toUpperCase())}
              className={inputClass}
            />
          </Field>
          <Field label="Name (English) *">
            <input value={d.name_en} onChange={(e) => set("name_en", e.target.value)} className={inputClass} />
          </Field>
          <Field label="नाव (मराठी) *">
            <input value={d.name_mr} onChange={(e) => set("name_mr", e.target.value)} className={inputClass} />
          </Field>
          <Field label="नाम (हिंदी)">
            <input value={d.name_hi ?? ""} onChange={(e) => set("name_hi", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Department">
            <input value={d.department ?? ""} onChange={(e) => set("department", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Category">
            <select value={d.category} onChange={(e) => set("category", e.target.value)} className={inputClass}>
              {CATEGORIES.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              value={d.status}
              onChange={(e) => set("status", e.target.value as SchemeData["status"])}
              className={inputClass}
            >
              <option value="open">Open</option>
              <option value="seasonal">Seasonal (application window)</option>
              <option value="closed">Closed</option>
            </select>
          </Field>
          <Field label="Benefit (English)">
            <input value={d.benefit_en ?? ""} onChange={(e) => set("benefit_en", e.target.value)} className={inputClass} />
          </Field>
          <Field label="लाभ (मराठी)">
            <input value={d.benefit_mr ?? ""} onChange={(e) => set("benefit_mr", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Benefit a year ₹ (for ranking)">
            <input
              type="number"
              min="0"
              value={d.benefit_yearly ?? ""}
              onChange={(e) => set("benefit_yearly", e.target.value === "" ? null : Number(e.target.value))}
              className={inputClass}
            />
          </Field>
          <Field label="Benefit type">
            <select value={d.benefit_type ?? ""} onChange={(e) => set("benefit_type", e.target.value || undefined)} className={inputClass}>
              <option value="">—</option>
              <option value="cash">Cash</option>
              <option value="subsidy">Subsidy</option>
              <option value="loan">Loan</option>
              <option value="insurance">Insurance</option>
              <option value="service">Service</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="How to apply">
            <select value={d.apply_mode ?? ""} onChange={(e) => set("apply_mode", e.target.value || undefined)} className={inputClass}>
              <option value="">—</option>
              <option value="online">Online</option>
              <option value="offline">Office</option>
              <option value="csc">CSC</option>
              <option value="mixed">Online or office</option>
            </select>
          </Field>
          <Field label="Deadline">
            <input type="date" value={d.deadline ?? ""} onChange={(e) => set("deadline", e.target.value || null)} className={inputClass} />
          </Field>
          <Field label="Official link">
            <input value={d.apply_url ?? ""} onChange={(e) => set("apply_url", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Source link (GR / guideline)">
            <input value={d.source_url ?? ""} onChange={(e) => set("source_url", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Last checked against GR">
            <input
              type="date"
              value={d.last_verified_on ?? ""}
              onChange={(e) => set("last_verified_on", e.target.value || null)}
              className={inputClass}
            />
          </Field>
        </div>
      </Card>

      <Card title="Who qualifies">
        <p className="mb-4 text-sm text-gray-600">
          Every rule in a group must be true. If a scheme has several groups, any one group is enough. Answers left
          as &ldquo;Don&apos;t know&rdquo; make the scheme &ldquo;Check one more thing&rdquo;, never a no.
        </p>
        {groups.map((g, gi) => (
          <div key={g} className="mb-4 rounded-lg border border-blue-100 bg-blue-50/40 p-3">
            <div className="mb-2 text-sm font-semibold text-blue-950">
              {gi === 0 ? "Group 1" : `Or group ${gi + 1}`} <span className="font-normal text-gray-500">(all must be true)</span>
            </div>
            {d.rules.map((r, i) =>
              !r.is_exclusion && (r.rule_group ?? 1) === g ? (
                <RuleRow key={i} rule={r} fields={fields} byKey={byKey} onChange={(x) => setRule(i, x)}
                  onRemove={() => set("rules", d.rules.filter((_, j) => j !== i))} />
              ) : null,
            )}
            <button type="button" onClick={() => addRule(g)} className="mt-1 inline-flex items-center gap-1 text-sm text-blue-700">
              <Plus size={14} /> Add a rule to this group
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => addRule(groups.length ? Math.max(...groups) + 1 : 1)}
          className="inline-flex items-center gap-1 rounded-md border border-blue-200 px-3 py-1.5 text-sm text-blue-800 hover:bg-blue-50"
        >
          <Plus size={14} /> {groups.length ? "Add an “or” group" : "Add the first rule"}
        </button>

        <div className="mt-6 rounded-lg border border-red-100 bg-red-50/40 p-3">
          <div className="mb-2 text-sm font-semibold text-red-900">
            Not for <span className="font-normal text-gray-500">(any one of these rules out the scheme)</span>
          </div>
          {d.rules.map((r, i) =>
            r.is_exclusion ? (
              <RuleRow key={i} rule={r} fields={fields} byKey={byKey} onChange={(x) => setRule(i, x)}
                onRemove={() => set("rules", d.rules.filter((_, j) => j !== i))} />
            ) : null,
          )}
          <button type="button" onClick={() => addRule(0, true)} className="mt-1 inline-flex items-center gap-1 text-sm text-red-800">
            <Plus size={14} /> Add an exclusion
          </button>
        </div>
      </Card>

      <Card title="Documents">
        <Rows<SchemeDocument>
          rows={d.documents}
          onChange={(rows) => set("documents", rows)}
          blank={{ name_en: "", name_mr: "", is_mandatory: true }}
          addLabel="Add a document"
          render={(x, up) => (
            <div className="grid flex-1 gap-2 sm:grid-cols-5">
              <input placeholder="Name (English)" value={x.name_en} onChange={(e) => up({ ...x, name_en: e.target.value })} className={small} />
              <input placeholder="नाव (मराठी)" value={x.name_mr} onChange={(e) => up({ ...x, name_mr: e.target.value })} className={small} />
              <input placeholder="Issued by" value={x.issued_by ?? ""} onChange={(e) => up({ ...x, issued_by: e.target.value })} className={small} />
              <select value={x.help_service_code ?? ""} onChange={(e) => up({ ...x, help_service_code: e.target.value || undefined })} className={small}>
                <option value="">We can&apos;t get it</option>
                {services.map((s) => (
                  <option key={s.code} value={s.code}>We get it: {s.name_en}</option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={x.is_mandatory !== false} onChange={(e) => up({ ...x, is_mandatory: e.target.checked })} /> Required
              </label>
            </div>
          )}
        />
      </Card>

      <Card title="How to apply">
        <Rows<SchemeStep>
          rows={d.steps}
          onChange={(rows) => set("steps", rows.map((s, i) => ({ ...s, step_no: i + 1 })))}
          blank={{ what_en: "", what_mr: "" }}
          addLabel="Add a step"
          render={(x, up) => (
            <div className="grid flex-1 gap-2 sm:grid-cols-5">
              <input placeholder="What happens (English)" value={x.what_en} onChange={(e) => up({ ...x, what_en: e.target.value })} className={`${small} sm:col-span-2`} />
              <input placeholder="काय करायचे (मराठी)" value={x.what_mr} onChange={(e) => up({ ...x, what_mr: e.target.value })} className={`${small} sm:col-span-2`} />
              <input placeholder="Where (portal / office)" value={x.where_en ?? ""} onChange={(e) => up({ ...x, where_en: e.target.value })} className={small} />
              <input placeholder="कुठे" value={x.where_mr ?? ""} onChange={(e) => up({ ...x, where_mr: e.target.value })} className={small} />
              <input type="number" min="0" placeholder="Typical days" value={x.typical_days ?? ""}
                onChange={(e) => up({ ...x, typical_days: e.target.value === "" ? null : Number(e.target.value) })} className={small} />
            </div>
          )}
        />
      </Card>

      <Card title="Paid OMSUN service for applying">
        <p className="mb-3 text-sm text-gray-600">
          The price comes from Service Management, so every retailer charges the same head-office price.
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {services.map((s) => (
            <label key={s.code} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={d.service_codes.includes(s.code)}
                onChange={(e) =>
                  set("service_codes", e.target.checked ? [...d.service_codes, s.code] : d.service_codes.filter((c) => c !== s.code))
                }
              />
              {s.name_en} <span className="text-xs text-gray-500">{s.code}</span>
            </label>
          ))}
        </div>
      </Card>

      <Card title="About this change">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="What changed and why *">
            <input name="change_note" defaultValue={note} required minLength={3} className={inputClass} />
          </Field>
          <Field label="Source (GR number, notification, field report)">
            <input name="source" defaultValue={source ?? ""} className={inputClass} />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="submit" onClick={submit("save")} disabled={pending}
            className="rounded-md border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-800 hover:bg-blue-50 disabled:opacity-50">
            {pending ? "Saving…" : "Save draft"}
          </button>
          <button type="submit" onClick={submit("submit")} disabled={pending}
            className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50">
            Send to owner for approval
          </button>
          {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
          {state?.ok && <p className="text-sm text-green-700">{state.ok}</p>}
        </div>
      </Card>
    </form>
  );
}

function RuleRow({
  rule,
  fields,
  byKey,
  onChange,
  onRemove,
}: {
  rule: SchemeRule;
  fields: ProfileField[];
  byKey: Map<string, ProfileField>;
  onChange: (r: SchemeRule) => void;
  onRemove: () => void;
}) {
  const f = byKey.get(rule.field);
  const ops = f ? OPS_FOR_KIND[f.kind] : [];
  return (
    <div className="mb-2 rounded-md border border-gray-200 bg-white p-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={rule.field}
          onChange={(e) => {
            const nf = byKey.get(e.target.value);
            const op = nf ? OPS_FOR_KIND[nf.kind][0] : rule.op;
            onChange({ ...rule, field: e.target.value, op, value: defaultValue(nf, op) });
          }}
          className={`${inputBase} min-w-48`}
        >
          {!f && <option value={rule.field}>{rule.field} (unknown question)</option>}
          {fields.map((x) => (
            <option key={x.key} value={x.key}>
              {x.label_en}{x.scope === "household" ? " (family)" : ""}
            </option>
          ))}
        </select>
        <select
          value={rule.op}
          onChange={(e) => {
            const op = e.target.value as RuleOp;
            onChange({ ...rule, op, value: defaultValue(f, op) });
          }}
          className={inputBase}
        >
          {ops.map((o) => (
            <option key={o} value={o}>{OP_LABEL[o]}</option>
          ))}
        </select>
        <ValueInput rule={rule} field={f} onChange={(value) => onChange({ ...rule, value })} />
        <button type="button" onClick={onRemove} title="Remove rule" className="ml-auto rounded p-1.5 text-red-700 hover:bg-red-50">
          <Trash2 size={16} />
        </button>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <input placeholder="Question to ask if unknown (English)" value={rule.question_en ?? ""}
          onChange={(e) => onChange({ ...rule, question_en: e.target.value || undefined })} className={small} />
        <input placeholder="माहीत नसल्यास विचारायचा प्रश्न" value={rule.question_mr ?? ""}
          onChange={(e) => onChange({ ...rule, question_mr: e.target.value || undefined })} className={small} />
        <label className="flex items-center gap-2 text-xs text-gray-600">
          <input type="checkbox" checked={!!rule.manual_check} onChange={(e) => onChange({ ...rule, manual_check: e.target.checked || undefined })} />
          Retailer must check this by hand
        </label>
      </div>
    </div>
  );
}

function ValueInput({ rule, field, onChange }: { rule: SchemeRule; field?: ProfileField; onChange: (v: unknown) => void }) {
  if (!field || rule.op === "exists") return null;
  if (rule.op === "between") {
    const [a, b] = Array.isArray(rule.value) ? (rule.value as number[]) : [0, 0];
    return (
      <span className="flex items-center gap-1 text-sm">
        <input type="number" value={a} onChange={(e) => onChange([Number(e.target.value), b])} className={`${inputBase} w-28`} />
        and
        <input type="number" value={b} onChange={(e) => onChange([a, Number(e.target.value)])} className={`${inputBase} w-28`} />
      </span>
    );
  }
  if (rule.op === "in" || rule.op === "not_in") {
    const picked = Array.isArray(rule.value) ? (rule.value as string[]) : [];
    return (
      <span className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
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
      </span>
    );
  }
  if (field.kind === "yes_no") {
    return (
      <select value={rule.value ? "yes" : "no"} onChange={(e) => onChange(e.target.value === "yes")} className={inputBase}>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    );
  }
  if (field.kind === "number" || field.kind === "band") {
    return (
      <input type="number" value={Number(rule.value ?? 0)} onChange={(e) => onChange(Number(e.target.value))} className={`${inputBase} w-32`} />
    );
  }
  if (field.kind === "date") {
    return <input type="date" value={String(rule.value ?? "")} onChange={(e) => onChange(e.target.value)} className={inputBase} />;
  }
  return (
    <select value={String(rule.value ?? "")} onChange={(e) => onChange(e.target.value)} className={inputBase}>
      {field.options.map((o) => (
        <option key={o.value} value={o.value}>{o.en}</option>
      ))}
    </select>
  );
}

function Rows<T>({
  rows,
  onChange,
  blank,
  addLabel,
  render,
}: {
  rows: T[];
  onChange: (rows: T[]) => void;
  blank: T;
  addLabel: string;
  render: (row: T, update: (row: T) => void) => React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="mt-2 w-5 text-right text-xs text-gray-400">{i + 1}</span>
          {render(r, (x) => onChange(rows.map((y, j) => (j === i ? x : y))))}
          <button type="button" onClick={() => onChange(rows.filter((_, j) => j !== i))} title="Remove"
            className="rounded p-1.5 text-red-700 hover:bg-red-50">
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...rows, blank])} className="inline-flex items-center gap-1 text-sm text-blue-700">
        <Plus size={14} /> {addLabel}
      </button>
    </div>
  );
}
