import { can, requireStaff } from "@/lib/auth";
import { dateIST } from "@/lib/format";
import { ActionForm } from "@/components/action-form";
import { Card, Empty, Field, inputBase, inputClass, PageTitle, Table } from "@/components/ui";
import { addCredential, changeCredential, deleteCredential } from "./actions";
import { PasswordCell } from "./reveal";

type Cred = {
  id: string; label: string; username: string | null; has_password: boolean; notes: string | null; updated_at: string;
  customers: { full_name: string; mobile: string | null } | null; services: { name_en: string } | null;
  creator: { full_name: string | null } | null;
};

export default async function Credentials({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { supabase, profile } = await requireStaff();
  const q = ((await searchParams).q ?? "").trim();

  let query = supabase
    .from("credentials")
    .select("id, label, username, has_password:password, notes, updated_at, customers(full_name, mobile), services(name_en), creator:profiles!credentials_created_by_fkey(full_name)")
    .order("updated_at", { ascending: false })
    .limit(300);
  if (q) query = query.or(`label.ilike.%${q.replace(/[%,()]/g, "")}%,username.ilike.%${q.replace(/[%,()]/g, "")}%`);

  const [{ data: rows }, { data: customers }, { data: services }] = await Promise.all([
    query.returns<(Omit<Cred, "has_password"> & { has_password: string | null })[]>(),
    supabase.from("customers").select("id, full_name, mobile").order("full_name").limit(500).returns<{ id: string; full_name: string; mobile: string | null }[]>(),
    supabase.from("services").select("id, name_en").eq("is_active", true).order("name_en").returns<{ id: string; name_en: string }[]>(),
  ]);
  // Only whether a password exists reaches the page; the value itself is fetched on Show.
  const creds: Cred[] = (rows ?? []).map((r) => ({ ...r, has_password: !!r.has_password }));

  return (
    <>
      <PageTitle title="Credentials" />
      <p className="-mt-3 mb-5 text-sm text-slate-600">
        Portal logins saved for customers. {can(profile, "owner", "manager") ? "You can see every saved login." : "You see the logins you saved; the owner and manager see all."}
      </p>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-3 xl:col-span-2">
          <form className="flex gap-2">
            <input name="q" defaultValue={q} placeholder="Search portal or username" className={`${inputBase} flex-1`} />
            <button className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800">Search</button>
          </form>
          {creds.length === 0 ? (
            <Empty>No saved logins{q ? " match your search" : " yet"}.</Empty>
          ) : (
            <Table head={["Portal / Login For", "Customer", "Username", "Password", "Saved By", ""]}>
              {creds.map((c) => (
                <tr key={c.id} className="align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium">{c.label}</div>
                    {c.services && <div className="text-xs text-slate-500">{c.services.name_en}</div>}
                    {c.notes && <div className="text-xs text-slate-500">{c.notes}</div>}
                  </td>
                  <td className="px-4 py-3">
                    {c.customers ? (
                      <>
                        {c.customers.full_name}
                        {c.customers.mobile && <div className="text-xs text-slate-500">{c.customers.mobile}</div>}
                      </>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3"><code className="text-xs">{c.username || "—"}</code></td>
                  <td className="px-4 py-3 whitespace-nowrap"><PasswordCell id={c.id} hasPassword={c.has_password} /></td>
                  <td className="px-4 py-3 text-xs">
                    {c.creator?.full_name ?? "—"}
                    <div className="text-slate-500">{dateIST(c.updated_at)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <details>
                      <summary className="cursor-pointer text-sm text-blue-700">Change</summary>
                      <div className="mt-2 w-56 space-y-2">
                        <ActionForm action={changeCredential} submitLabel="Update" variant="secondary">
                          <input type="hidden" name="id" value={c.id} />
                          <input name="username" placeholder="New username" autoComplete="off" className={inputClass} />
                          <input name="password" type="password" placeholder="New password" autoComplete="new-password" className={inputClass} />
                        </ActionForm>
                        <ActionForm action={deleteCredential} submitLabel="Delete login" variant="danger">
                          <input type="hidden" name="id" value={c.id} />
                        </ActionForm>
                      </div>
                    </details>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </div>

        <Card title="Save A Login">
          <ActionForm action={addCredential} submitLabel="Save login">
            <Field label="Portal / Login For">
              <input name="label" required maxLength={120} placeholder="e.g. GST portal, Aadhaar UCL" className={inputClass} />
            </Field>
            <Field label="Customer">
              <select name="customer_id" className={inputClass} defaultValue="">
                <option value="">Office login (no customer)</option>
                {(customers ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.full_name}{c.mobile ? ` · ${c.mobile}` : ""}</option>
                ))}
              </select>
            </Field>
            <Field label="Service">
              <select name="service_id" className={inputClass} defaultValue="">
                <option value="">—</option>
                {(services ?? []).map((s) => <option key={s.id} value={s.id}>{s.name_en}</option>)}
              </select>
            </Field>
            <Field label="Username / Login ID">
              <input name="username" autoComplete="off" className={inputClass} />
            </Field>
            <Field label="Password">
              <input name="password" type="password" autoComplete="new-password" className={inputClass} />
            </Field>
            <Field label="Note">
              <input name="notes" className={inputClass} />
            </Field>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
