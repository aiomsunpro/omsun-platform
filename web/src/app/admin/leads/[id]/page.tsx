import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { dateIST } from "@/lib/format";
import { todayIST } from "@/lib/dates";
import { ACTIVITY_LABEL, OUTCOME_LABEL, STAGE_LABEL, type Lead } from "@/lib/leads";
import { ActionForm } from "@/components/action-form";
import { StageBadge } from "@/components/leads-board";
import { Card, Empty, Field, inputClass, PageTitle } from "@/components/ui";
import { logActivity, updateLead } from "../actions";

type Activity = {
  id: number;
  activity_type: keyof typeof ACTIVITY_LABEL;
  outcome: keyof typeof OUTCOME_LABEL | null;
  notes: string | null;
  created_at: string;
  author: { full_name: string | null; email: string | null } | null;
};

export default async function LeadPage({ params }: PageProps<"/admin/leads/[id]">) {
  const { supabase, profile } = await requireStaff(["owner", "manager", "sales_executive", "service_executive"]);
  const { id } = await params;
  const { data: lead } = await supabase
    .from("leads")
    .select("*, assignee:profiles!leads_assigned_to_fkey(full_name, email), services(id, name_en)")
    .eq("id", id)
    .maybeSingle<Lead & { assignee: { full_name: string | null; email: string | null } | null; services: { id: string; name_en: string } | null }>();
  if (!lead) notFound();

  const leadsPerson = profile.role === "owner" || profile.role === "manager";
  const [{ data: activities }, { data: staff }] = await Promise.all([
    supabase
      .from("lead_activities")
      .select("id, activity_type, outcome, notes, created_at, author:profiles!lead_activities_created_by_fkey(full_name, email)")
      .eq("lead_id", id)
      .order("created_at", { ascending: false })
      .returns<Activity[]>(),
    leadsPerson
      ? supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("role", ["owner", "manager", "sales_executive", "service_executive"])
          .eq("is_active", true)
          .order("full_name")
      : Promise.resolve({ data: null }),
  ]);

  const isEnquiry = lead.lead_type === "enquiry";
  const back = isEnquiry ? "/admin/enquiries" : "/admin/leads";
  const today = todayIST();
  const walkIn = new URLSearchParams({ name: lead.full_name, mobile: lead.mobile });
  if (lead.village) walkIn.set("village", lead.village);
  if (lead.services) walkIn.set("service", lead.services.id);
  const canWalkIn = ["owner", "manager", "service_executive"].includes(profile.role);

  return (
    <>
      <Link href={back} className="text-sm text-blue-700 hover:underline">
        ← {isEnquiry ? "Enquiries" : "Lead Management"}
      </Link>
      <PageTitle title={lead.full_name}>
        <div className="flex flex-wrap gap-2">
          <a href={`tel:${lead.mobile}`} className="rounded-md bg-white px-3 py-2 text-sm font-medium text-blue-800 ring-1 ring-blue-200 hover:bg-blue-50">
            Call {lead.mobile}
          </a>
          <a
            href={`https://wa.me/91${lead.mobile}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-500"
          >
            WhatsApp
          </a>
          {isEnquiry && canWalkIn && (
            <Link href={`/admin/requests/new?${walkIn}`} className="rounded-md bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800">
              Start service request
            </Link>
          )}
        </div>
      </PageTitle>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Details">
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <Item label="Type">{isEnquiry ? "Customer enquiry" : "Retailer lead"}</Item>
              <Item label="Stage">
                <StageBadge stage={lead.stage} />
              </Item>
              <Item label="Place">{[lead.village, lead.taluka, lead.district].filter(Boolean).join(", ") || "—"}</Item>
              <Item label={isEnquiry ? "Service" : "Business"}>
                {(isEnquiry ? lead.services?.name_en ?? lead.interest : lead.business_type) || "—"}
              </Item>
              <Item label="Source">{lead.source ?? "—"}</Item>
              <Item label="Assigned to">{lead.assignee?.full_name || lead.assignee?.email || "—"}</Item>
              <Item label="Last contact">{lead.last_contact_at ? dateIST(lead.last_contact_at) : "Not yet"}</Item>
              <Item label="Next follow-up">{lead.next_follow_up_on ? dateIST(lead.next_follow_up_on) : "—"}</Item>
              <Item label="Added">{dateIST(lead.created_at)}</Item>
            </dl>
            {lead.notes && <p className="mt-4 whitespace-pre-line rounded-md bg-slate-50 p-3 text-sm">{lead.notes}</p>}
          </Card>

          <Card title="Activity">
            {activities && activities.length > 0 ? (
              <ol className="space-y-3">
                {activities.map((a) => (
                  <li key={a.id} className="border-l-2 border-blue-200 pl-3 text-sm">
                    <p className="font-medium text-blue-950">
                      {ACTIVITY_LABEL[a.activity_type]}
                      {a.outcome && <span className="font-normal text-slate-600"> · {OUTCOME_LABEL[a.outcome]}</span>}
                    </p>
                    {a.notes && <p className="text-slate-700">{a.notes}</p>}
                    <p className="text-xs text-slate-500">
                      {dateIST(a.created_at)} · {a.author?.full_name || a.author?.email || "—"}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <Empty>No calls or visits logged yet.</Empty>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Log a call or visit">
            <ActionForm action={logActivity} submitLabel="Log">
              <input type="hidden" name="lead_id" value={lead.id} />
              <Field label="Type">
                <select name="activity_type" className={inputClass} defaultValue="call">
                  {Object.entries(ACTIVITY_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Outcome">
                <select name="outcome" className={inputClass} defaultValue="">
                  <option value="">—</option>
                  {Object.entries(OUTCOME_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Notes">
                <textarea name="notes" rows={2} className={inputClass} />
              </Field>
              <Field label="Next follow-up">
                <input type="date" name="next_follow_up_on" min={today} className={inputClass} />
              </Field>
            </ActionForm>
          </Card>

          <Card title="Update lead">
            <ActionForm action={updateLead} submitLabel="Save">
              <input type="hidden" name="id" value={lead.id} />
              <Field label="Stage">
                <select name="stage" className={inputClass} defaultValue={lead.stage}>
                  {Object.entries(STAGE_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Next follow-up">
                <input type="date" name="next_follow_up_on" defaultValue={lead.next_follow_up_on ?? ""} className={inputClass} />
              </Field>
              {leadsPerson && (
                <Field label="Assigned to">
                  <select name="assigned_to" className={inputClass} defaultValue={lead.assigned_to ?? ""}>
                    <option value="">Nobody</option>
                    {staff?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name || p.email}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <Field label="Notes">
                <textarea name="notes" rows={3} defaultValue={lead.notes ?? ""} className={inputClass} />
              </Field>
            </ActionForm>
          </Card>
        </div>
      </div>
    </>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
