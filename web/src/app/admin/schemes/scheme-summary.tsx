import { rupees } from "@/lib/format";
import { CATEGORIES, ruleGroups, ruleSentence, schemeChanges, type ProfileField, type SchemeData } from "@/lib/yojana";
import { Card } from "@/components/ui";

const categoryLabel = new Map(CATEGORIES);

// Read-only view of a whole scheme, as retailers will get it.
export function SchemeSummary({ data, fields }: { data: SchemeData; fields: Map<string, ProfileField> }) {
  const groups = ruleGroups(data.rules);
  const exclusions = data.rules.filter((r) => r.is_exclusion);
  return (
    <div className="space-y-6">
      <Card title="Scheme">
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Item label="Name">{data.name_en} · {data.name_mr}</Item>
          <Item label="Code">{data.code}</Item>
          <Item label="Level">{data.level === "central" ? "Central" : `State (${data.state})`}</Item>
          <Item label="Category">{categoryLabel.get(data.category) ?? data.category}</Item>
          <Item label="Benefit">{data.benefit_en || "—"}{data.benefit_mr ? ` · ${data.benefit_mr}` : ""}</Item>
          <Item label="Benefit a year">{data.benefit_yearly ? rupees(data.benefit_yearly) : "—"}</Item>
          <Item label="Status"><span className="capitalize">{data.status}</span>{data.deadline ? `, until ${data.deadline}` : ""}</Item>
          <Item label="Last checked against GR">{data.last_verified_on || "Not yet"}</Item>
          <Item label="Official link">{data.apply_url ? <a href={data.apply_url} className="text-blue-700 underline" target="_blank" rel="noreferrer">{data.apply_url}</a> : "—"}</Item>
          <Item label="Source">{data.source_url ? <a href={data.source_url} className="text-blue-700 underline" target="_blank" rel="noreferrer">{data.source_url}</a> : "—"}</Item>
        </dl>
      </Card>
      <Card title="Who qualifies">
        {groups.length === 0 && <p className="text-sm text-gray-500">No rules: everyone qualifies.</p>}
        {groups.map(([g, rules], i) => (
          <div key={g} className="mb-3">
            <div className="text-xs font-semibold uppercase text-blue-900">{i === 0 ? "All of these" : "Or all of these"}</div>
            <ul className="ml-4 list-disc text-sm">
              {rules.map((r, j) => (
                <li key={j}>{ruleSentence(r, fields)}{r.manual_check ? " (checked by hand)" : ""}</li>
              ))}
            </ul>
          </div>
        ))}
        {exclusions.length > 0 && (
          <div>
            <div className="text-xs font-semibold uppercase text-red-900">Not for</div>
            <ul className="ml-4 list-disc text-sm">
              {exclusions.map((r, j) => (
                <li key={j}>{ruleSentence(r, fields)}</li>
              ))}
            </ul>
          </div>
        )}
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Documents">
          <ul className="ml-4 list-disc text-sm">
            {data.documents.map((x, i) => (
              <li key={i}>
                {x.name_en} · {x.name_mr}
                {x.is_mandatory === false && <span className="text-gray-500"> (optional)</span>}
                {x.help_service_code && <span className="text-green-700"> · we can get it ({x.help_service_code})</span>}
              </li>
            ))}
            {data.documents.length === 0 && <li className="list-none text-gray-500">None listed.</li>}
          </ul>
        </Card>
        <Card title="How to apply">
          <ol className="ml-4 list-decimal text-sm">
            {data.steps.map((x, i) => (
              <li key={i}>
                {x.what_en}
                {x.where_en && <span className="text-gray-500"> · {x.where_en}</span>}
                {x.typical_days ? <span className="text-gray-500"> · about {x.typical_days} days</span> : null}
              </li>
            ))}
            {data.steps.length === 0 && <li className="list-none text-gray-500">No steps yet.</li>}
          </ol>
          <p className="mt-3 text-sm text-gray-600">
            Paid service: {data.service_codes.length ? data.service_codes.join(", ") : "not linked yet"}
          </p>
        </Card>
      </div>
    </div>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  );
}

// What a draft changes compared with the live version.
export function ChangeList({ before, after, fields }: { before: SchemeData | null; after: SchemeData; fields: Map<string, ProfileField> }) {
  const changes = schemeChanges(before, after, fields);
  if (changes.length === 0) return <p className="text-sm text-gray-500">No changes from the live version.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="text-left text-xs uppercase text-gray-500">
          <tr>
            <th className="py-2 pr-4">What</th>
            <th className="py-2 pr-4">{before ? "Live now" : "Before"}</th>
            <th className="py-2">After approval</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 align-top">
          {changes.map((c) => (
            <tr key={c.label}>
              <td className="py-2 pr-4 font-medium">{c.label}</td>
              <td className={`whitespace-pre-line py-2 pr-4 ${c.before === "—" ? "text-gray-400" : "text-red-800 line-through decoration-red-300"}`}>
                {c.before}
              </td>
              <td className="whitespace-pre-line py-2 text-green-800">{c.after}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
