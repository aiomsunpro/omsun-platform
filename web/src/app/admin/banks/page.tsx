import { can, requireStaff } from "@/lib/auth";
import { rupees } from "@/lib/format";
import { ActionForm } from "@/components/action-form";
import { Card, Empty, Field, inputBase, inputClass, PageTitle, Table } from "@/components/ui";
import { addBankAccount, saveDenominationLimits, setBankActive } from "./actions";

type Bank = { id: string; bank_name: string; account_holder: string | null; account_number: string | null; ifsc: string | null; branch: string | null; notes: string | null; is_active: boolean };
type Limit = { denomination: number; max_count: number };

export default async function Banks() {
  const { supabase, profile } = await requireStaff(["owner", "manager", "accountant"]);
  const owner = can(profile, "owner");
  const [{ data: banks }, { data: limits }] = await Promise.all([
    supabase.from("bank_accounts").select("id, bank_name, account_holder, account_number, ifsc, branch, notes, is_active")
      .order("is_active", { ascending: false }).order("bank_name").returns<Bank[]>(),
    supabase.from("denomination_limits").select("denomination, max_count").order("denomination", { ascending: false }).returns<Limit[]>(),
  ]);

  return (
    <>
      <PageTitle title="Bank Accounts & Cash Limits" />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-3 xl:col-span-2">
          {(banks ?? []).length === 0 ? (
            <Empty>No bank accounts saved yet.</Empty>
          ) : (
            <Table head={["Bank", "Account Holder", "Account Number", "IFSC", "Branch", ""]}>
              {(banks ?? []).map((b) => (
                <tr key={b.id} className={b.is_active ? "" : "text-slate-400"}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{b.bank_name}</div>
                    {!b.is_active && <div className="text-xs">Closed / not used</div>}
                    {b.notes && <div className="text-xs text-slate-500">{b.notes}</div>}
                  </td>
                  <td className="px-4 py-3">{b.account_holder || "—"}</td>
                  <td className="px-4 py-3"><code>{b.account_number || "—"}</code></td>
                  <td className="px-4 py-3"><code>{b.ifsc || "—"}</code></td>
                  <td className="px-4 py-3">{b.branch || "—"}</td>
                  <td className="px-4 py-3">
                    {owner && (
                      <ActionForm action={setBankActive} submitLabel={b.is_active ? "Mark Not Used" : "Mark In Use"} variant="secondary">
                        <input type="hidden" name="id" value={b.id} />
                        <input type="hidden" name="active" value={b.is_active ? "no" : "yes"} />
                      </ActionForm>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
          )}

          <h2 className="pt-4 font-semibold text-blue-950">Cash Denomination Limits</h2>
          <p className="text-sm text-slate-600">The most notes of each value the counter should hold. Extra notes go to the bank.</p>
          {owner ? (
            <ActionForm action={saveDenominationLimits} submitLabel="Save limits">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {(limits ?? []).map((l) => (
                  <Field key={l.denomination} label={`${rupees(l.denomination)} Notes`}>
                    <input name={`limit_${l.denomination}`} type="number" min="0" step="1" defaultValue={l.max_count} className={inputClass} />
                  </Field>
                ))}
              </div>
              <div className="flex flex-wrap items-end gap-3 text-sm">
                <span className="text-slate-600">Add another value:</span>
                <input name="new_denomination" type="number" min="1" placeholder="₹ value" className={`${inputBase} w-28`} />
                <input name="new_max" type="number" min="0" placeholder="Max count" className={`${inputBase} w-28`} />
              </div>
            </ActionForm>
          ) : (
            <Table head={["Note", "Max Count", "Max Value"]}>
              {(limits ?? []).map((l) => (
                <tr key={l.denomination}>
                  <td className="px-4 py-3">{rupees(l.denomination)}</td>
                  <td className="px-4 py-3">{l.max_count}</td>
                  <td className="px-4 py-3">{rupees(l.denomination * l.max_count)}</td>
                </tr>
              ))}
            </Table>
          )}
        </div>

        {owner && (
          <Card title="Add Bank Account">
            <ActionForm action={addBankAccount} submitLabel="Save account">
              <Field label="Bank Name">
                <input name="bank_name" required maxLength={100} placeholder="e.g. State Bank of India" className={inputClass} />
              </Field>
              <Field label="Account Holder">
                <input name="account_holder" className={inputClass} />
              </Field>
              <Field label="Account Number">
                <input name="account_number" inputMode="numeric" autoComplete="off" className={inputClass} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="IFSC">
                  <input name="ifsc" maxLength={11} className={`${inputClass} uppercase`} />
                </Field>
                <Field label="Branch">
                  <input name="branch" className={inputClass} />
                </Field>
              </div>
              <Field label="Note">
                <input name="notes" placeholder="e.g. Used for AEPS settlement" className={inputClass} />
              </Field>
            </ActionForm>
          </Card>
        )}
      </div>
    </>
  );
}
