import Link from "next/link";
import { Search } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { dateIST } from "@/lib/format";
import { todayIST } from "@/lib/dates";
import { CLOSED_STAGES, OPEN_STAGES, SOURCES, STAGE_COLOR, STAGE_LABEL, type Lead, type LeadStage, type LeadType } from "@/lib/leads";
import { ActionForm } from "@/components/action-form";
import { Card, Empty, Field, inputClass, PageTitle, Table } from "@/components/ui";
import { createLead } from "@/app/admin/leads/actions";

type Row = Lead & {
  assignee: { full_name: string | null; email: string | null } | null;
  services: { name_en: string } | null;
};

export function StageBadge({ stage }: { stage: LeadStage }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STAGE_COLOR[stage] ?? "bg-sky-100 text-sky-800"}`}>
      {STAGE_LABEL[stage]}
    </span>
  );
}

// One screen for both kinds of lead: retailer recruitment ("Lead Management")
// and customers asking about a service ("Enquiries").
export async function LeadsBoard({
  type,
  params,
}: {
  type: LeadType;
  params: { stage?: string; q?: string; mine?: string };
}) {
  const { supabase, profile } = await requireStaff(
    type === "enquiry"
      ? ["owner", "manager", "sales_executive", "service_executive"]
      : ["owner", "manager", "sales_executive"],
  );
  const isEnquiry = type === "enquiry";
  const today = todayIST();
  const stage = params.stage ?? "open";
  const term = (params.q ?? "").trim().replace(/[%,()]/g, "");
  const leadsPerson = profile.role === "owner" || profile.role === "manager";

  let query = supabase
    .from("leads")
    .select("*, assignee:profiles!leads_assigned_to_fkey(full_name, email), services(name_en)")
    .eq("lead_type", type)
    .order("next_follow_up_on", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(300);
  if (stage === "open") query = query.not("stage", "in", `(${CLOSED_STAGES.join(",")})`);
  else if (stage === "closed") query = query.in("stage", CLOSED_STAGES);
  else if (stage in STAGE_LABEL) query = query.eq("stage", stage);
  if (params.mine) query = query.eq("assigned_to", profile.id);
  if (term) {
    const digits = term.replace(/\D/g, "");
    query = digits.length >= 4 ? query.ilike("mobile", `%${digits}%`) : query.ilike("full_name", `%${term}%`);
  }
  const { data, error } = await query.returns<Row[]>();

  const [{ data: staff }, { data: services }] = await Promise.all([
    leadsPerson
      ? supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("role", isEnquiry ? ["owner", "manager", "sales_executive", "service_executive"] : ["owner", "manager", "sales_executive"])
          .eq("is_active", true)
          .order("full_name")
      : Promise.resolve({ data: null }),
    isEnquiry
      ? supabase.from("services").select("id, name_en").eq("is_active", true).order("name_en")
      : Promise.resolve({ data: null }),
  ]);

  const base = isEnquiry ? "/admin/enquiries" : "/admin/leads";
  const tabs = [
    ["open", "Open"],
    ...OPEN_STAGES.map((s) => [s, STAGE_LABEL[s]]),
    ["converted", "Converted"],
    ["closed", "Closed"],
    ["all", "All"],
  ];
  const href = (s: string) => {
    const p = new URLSearchParams({ stage: s });
    if (params.mine) p.set("mine", "1");
    return `${base}?${p}`;
  };

  return (
    <>
      <PageTitle title={isEnquiry ? "Enquiries" : "Lead Management"}>
        <a href="#new" className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800">
          {isEnquiry ? "New enquiry" : "New lead"}
        </a>
      </PageTitle>
      <p className="-mt-3 mb-5 text-sm text-slate-600">
        {isEnquiry
          ? "Customers who asked about a service but have not started a request yet."
          : "Shops and operators who may join as OMSUN Mitra retailers."}
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map(([key, label]) => (
          <Link
            key={key}
            href={href(key)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              stage === key ? "bg-blue-900 text-white" : "bg-white text-blue-900 ring-1 ring-blue-200 hover:bg-blue-50"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <form className="mb-5 flex flex-wrap items-center gap-3">
        <input type="hidden" name="stage" value={stage} />
        <div className="flex max-w-md flex-1 items-center">
          <input
            name="q"
            defaultValue={params.q}
            placeholder="Search by name or mobile"
            className="min-w-0 flex-1 rounded-l-full border border-r-0 border-slate-300 bg-white px-4 py-2 text-sm focus:outline-none"
          />
          <button aria-label="Search" className="rounded-r-full bg-blue-900 px-4 py-2.5 text-white hover:bg-blue-800">
            <Search size={16} />
          </button>
        </div>
        {leadsPerson && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="mine" value="1" defaultChecked={!!params.mine} /> Only mine
          </label>
        )}
      </form>

      {error && <p className="mb-4 text-sm text-red-700">{error.message}</p>}
      {data && data.length === 0 ? (
        <Empty>{isEnquiry ? "No enquiries here." : "No leads here."}</Empty>
      ) : (
        <Table
          head={[
            "Name",
            "Mobile",
            "Place",
            isEnquiry ? "Service" : "Business",
            "Source",
            "Stage",
            "Next follow-up",
            "Assigned to",
          ]}
        >
          {data?.map((l) => {
            const late = l.next_follow_up_on && l.next_follow_up_on < today && !CLOSED_STAGES.includes(l.stage);
            return (
              <tr key={l.id} className="hover:bg-blue-50/40">
                <td className="px-4 py-3 font-medium">
                  <Link href={`/admin/leads/${l.id}`} className="text-blue-800 hover:underline">
                    {l.full_name}
                  </Link>
                </td>
                <td className="px-4 py-3">{l.mobile}</td>
                <td className="px-4 py-3">{[l.village, l.taluka].filter(Boolean).join(", ") || "—"}</td>
                <td className="px-4 py-3">{(isEnquiry ? l.services?.name_en ?? l.interest : l.business_type) || "—"}</td>
                <td className="px-4 py-3">{l.source ?? "—"}</td>
                <td className="px-4 py-3">
                  <StageBadge stage={l.stage} />
                </td>
                <td className={`px-4 py-3 ${late ? "font-semibold text-red-700" : ""}`}>
                  {l.next_follow_up_on ? dateIST(l.next_follow_up_on) : "—"}
                </td>
                <td className="px-4 py-3">{l.assignee?.full_name || l.assignee?.email || "—"}</td>
              </tr>
            );
          })}
        </Table>
      )}

      <div id="new" className="mt-8 max-w-3xl scroll-mt-20">
        <Card title={isEnquiry ? "New enquiry" : "New lead"}>
          <ActionForm action={createLead} submitLabel={isEnquiry ? "Save enquiry" : "Save lead"}>
            <input type="hidden" name="lead_type" value={type} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name *">
                <input name="full_name" required className={inputClass} />
              </Field>
              <Field label="Mobile (10 digits) *">
                <input name="mobile" required inputMode="numeric" className={inputClass} />
              </Field>
              <Field label="Village">
                <input name="village" className={inputClass} />
              </Field>
              <Field label="Taluka">
                <input name="taluka" defaultValue="Omerga" className={inputClass} />
              </Field>
              {isEnquiry ? (
                <Field label="Service asked about">
                  <select name="service_id" className={inputClass} defaultValue="">
                    <option value="">Not sure yet</option>
                    {services?.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name_en}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : (
                <Field label="Current business">
                  <input name="business_type" placeholder="CSC, xerox shop, mobile shop…" className={inputClass} />
                </Field>
              )}
              <Field label="Source">
                <select name="source" className={inputClass} defaultValue="">
                  <option value="">—</option>
                  {SOURCES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Next follow-up">
                <input type="date" name="next_follow_up_on" min={today} className={inputClass} />
              </Field>
              {leadsPerson && (
                <Field label="Assign to">
                  <select name="assigned_to" className={inputClass} defaultValue={profile.id}>
                    {staff?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name || p.email}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </div>
            <Field label={isEnquiry ? "What they asked" : "Notes"}>
              <textarea name="notes" rows={2} className={inputClass} />
            </Field>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
