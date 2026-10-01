import { can, requireStaff } from "@/lib/auth";
import { dateIST } from "@/lib/format";
import type { Retailer } from "@/lib/types";
import { ActionForm } from "@/components/action-form";
import { Card, Empty, Field, inputClass, PageTitle, Table } from "@/components/ui";
import { addRetailer, setJoiningFeePaid, setRetailerStatus } from "./actions";

const STATUS_STYLE: Record<Retailer["status"], string> = {
  pending: "bg-yellow-100 text-yellow-900",
  approved: "bg-green-100 text-green-800",
  suspended: "bg-orange-100 text-orange-900",
  rejected: "bg-gray-200 text-gray-700",
};

export default async function RetailersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { supabase, profile } = await requireStaff(["owner", "manager", "accountant", "sales_executive"]);
  const { status = "all" } = await searchParams;
  let q = supabase.from("retailers").select("*").order("created_at", { ascending: false });
  if (status !== "all") q = q.eq("status", status);
  const { data: retailers } = await q.returns<Retailer[]>();
  const approver = can(profile, "owner", "manager");

  return (
    <>
      <PageTitle title="Retailers (OMSUN E Sewa Kendra)" />
      <form className="mb-4 flex gap-3">
        <select name="status" defaultValue={status} className={`${inputClass} w-auto`}>
          <option value="all">All</option>
          <option value="pending">Awaiting approval</option>
          <option value="approved">Approved</option>
          <option value="suspended">Suspended</option>
          <option value="rejected">Rejected</option>
        </select>
        <button className="rounded-md border border-blue-200 bg-white px-4 py-2 text-sm text-blue-800 hover:bg-blue-50">Filter</button>
      </form>

      {retailers && retailers.length === 0 ? (
        <Empty>No retailers here.</Empty>
      ) : (
        <Table head={["Shop", "Owner", "Place", "App login", "Joining fee", "Status", ...(approver ? ["Actions"] : [])]}>
          {retailers?.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-3">
                <span className="font-medium">{r.business_name}</span>
                <div className="text-xs text-gray-500">{r.business_type}</div>
              </td>
              <td className="px-4 py-3">
                {r.owner_name}
                <div className="text-xs text-gray-500">{r.mobile}</div>
              </td>
              <td className="px-4 py-3">{[r.village, r.taluka, r.district].filter(Boolean).join(", ")}</td>
              <td className="px-4 py-3">{r.profile_id ? "Signed up" : <span className="text-gray-400">Not yet</span>}</td>
              <td className="px-4 py-3">
                {r.joining_fee_paid ? "Paid" : "Not paid"}
                {approver && (
                  <ActionForm action={setJoiningFeePaid} submitLabel={r.joining_fee_paid ? "Mark unpaid" : "Mark paid"} variant="secondary" className="mt-1">
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="paid" value={String(!r.joining_fee_paid)} />
                  </ActionForm>
                )}
              </td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[r.status]}`}>{r.status}</span>
                {r.joined_on && <div className="mt-1 text-xs text-gray-500">since {dateIST(r.joined_on)}</div>}
              </td>
              {approver && (
                <td className="space-y-1 px-4 py-3">
                  {r.status !== "approved" && (
                    <ActionForm action={setRetailerStatus} submitLabel="Approve" className="">
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="status" value="approved" />
                    </ActionForm>
                  )}
                  {r.status === "approved" && (
                    <ActionForm action={setRetailerStatus} submitLabel="Suspend" variant="danger" className="">
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="status" value="suspended" />
                    </ActionForm>
                  )}
                  {r.status === "pending" && (
                    <ActionForm action={setRetailerStatus} submitLabel="Reject" variant="danger" className="">
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="status" value="rejected" />
                    </ActionForm>
                  )}
                </td>
              )}
            </tr>
          ))}
        </Table>
      )}

      {can(profile, "owner", "manager", "sales_executive") && (
        <div className="mt-8 max-w-2xl">
          <Card title="Add a retailer">
            <ActionForm action={addRetailer} submitLabel="Add retailer">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Shop name *"><input name="business_name" required className={inputClass} /></Field>
                <Field label="Owner name *"><input name="owner_name" required className={inputClass} /></Field>
                <Field label="Mobile (10 digits) *"><input name="mobile" required inputMode="numeric" className={inputClass} /></Field>
                <Field label="Business type"><input name="business_type" placeholder="Kirana, pan shop, dairy…" className={inputClass} /></Field>
                <Field label="Village"><input name="village" className={inputClass} /></Field>
                <Field label="Taluka"><input name="taluka" defaultValue="Omerga" className={inputClass} /></Field>
                <Field label="District"><input name="district" defaultValue="Dharashiv" className={inputClass} /></Field>
              </div>
              <p className="text-xs text-gray-500">New retailers start as awaiting approval. Only the owner or manager can approve.</p>
            </ActionForm>
          </Card>
        </div>
      )}
    </>
  );
}
