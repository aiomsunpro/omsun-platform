import Link from "next/link";
import { can, requireStaff } from "@/lib/auth";
import { dateIST } from "@/lib/format";
import type { Family } from "@/lib/yojana";
import { ActionForm } from "@/components/action-form";
import { Card, Empty, Field, inputClass, PageTitle, Table } from "@/components/ui";
import { createFamily } from "./actions";

type Row = Family & {
  retailers: { business_name: string } | null;
  family_members: { count: number }[];
};

export default async function YojanaCheckPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const { supabase, profile } = await requireStaff();
  let query = supabase
    .from("families")
    .select("*, retailers(business_name), family_members(count)")
    .order("updated_at", { ascending: false })
    .limit(50);
  const term = q.trim();
  if (term) {
    const digits = term.replace(/\D/g, "");
    query = digits.length >= 4 ? query.ilike("mobile", `%${digits}%`) : query.ilike("family_name", `%${term}%`);
  }
  const { data: families } = await query.returns<Row[]>();
  const screener = can(profile, "owner", "manager", "service_executive");

  return (
    <>
      <PageTitle title="Yojana Check">
        <form className="flex gap-2">
          <input name="q" defaultValue={q} placeholder="Family name or mobile" className={`${inputClass} w-56`} />
          <button className="rounded-md border border-blue-200 bg-white px-3 py-2 text-sm text-blue-800 hover:bg-blue-50">Search</button>
        </form>
      </PageTitle>
      <p className="mb-4 text-sm text-gray-600">
        Ask a family the questions once and see every scheme they qualify for. Families screened by OMSUN Mitra
        retailers show here too.
      </p>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {families && families.length === 0 ? (
            <Empty>{term ? "No family matches." : "No family screened yet."}</Empty>
          ) : (
            <Table head={["Family", "Mobile", "People", "Screened by", "Updated"]}>
              {families?.map((f) => (
                <tr key={f.id} className="hover:bg-blue-50/50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/yojana/${f.id}`} className="font-medium text-blue-700 underline">{f.family_name}</Link>
                    <div className="text-xs text-gray-500">{[f.village, f.taluka].filter(Boolean).join(", ")}</div>
                  </td>
                  <td className="px-4 py-3">{f.mobile ?? "—"}</td>
                  <td className="px-4 py-3">{f.family_members[0]?.count ?? 0}</td>
                  <td className="px-4 py-3">{f.retailers?.business_name ?? "OMSUN office"}</td>
                  <td className="px-4 py-3">{dateIST(f.updated_at, true)}</td>
                </tr>
              ))}
            </Table>
          )}
        </div>

        {screener && (
          <Card title="New family">
            <ActionForm action={createFamily} submitLabel="Start Yojana check">
              <Field label="Name of the person you are talking to *">
                <input name="head_name" required className={inputClass} />
              </Field>
              <Field label="Family name">
                <input name="family_name" placeholder="Patil family" className={inputClass} />
              </Field>
              <Field label="Mobile">
                <input name="mobile" inputMode="numeric" className={inputClass} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Village / town">
                  <input name="village" className={inputClass} />
                </Field>
                <Field label="Taluka">
                  <input name="taluka" defaultValue="Omerga" className={inputClass} />
                </Field>
              </div>
              <Field label="District">
                <input name="district" defaultValue="Dharashiv" className={inputClass} />
              </Field>
              <label className="flex items-start gap-2 rounded-md bg-blue-50 p-3 text-sm">
                <input type="checkbox" name="consent" className="mt-1" />
                <span>
                  The customer agrees that OMSUN keeps these answers to find schemes for the family and will not share
                  them without permission.
                  <span className="block text-gray-600">
                    ग्राहकाची संमती: योजना शोधण्यासाठी ही माहिती OMSUN कडे ठेवली जाईल व परवानगीशिवाय कोणालाही दिली जाणार नाही.
                  </span>
                </span>
              </label>
            </ActionForm>
          </Card>
        )}
      </div>
    </>
  );
}
