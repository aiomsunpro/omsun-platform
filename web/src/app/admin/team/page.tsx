import { requireStaff } from "@/lib/auth";
import { dateIST, ROLE_LABEL } from "@/lib/format";
import type { AppRole } from "@/lib/types";
import { ActionForm } from "@/components/action-form";
import { inputBase, PageTitle, Table } from "@/components/ui";
import { updateMember } from "./actions";

type Member = {
  id: string;
  full_name: string | null;
  email: string | null;
  mobile: string | null;
  role: AppRole;
  is_active: boolean;
  created_at: string;
};

const ROLES: AppRole[] = ["owner", "manager", "accountant", "sales_executive", "service_executive", "retailer"];
const MANAGER_CAN: AppRole[] = ["retailer", "sales_executive", "service_executive"];

export default async function TeamPage() {
  const { supabase, profile } = await requireStaff(["owner", "manager"]);
  // Staff plus anyone who signed up with email (staff accounts waiting for a role).
  const { data: members } = await supabase
    .from("profiles")
    .select("id, full_name, email, mobile, role, is_active, created_at")
    .or("role.neq.retailer,email.not.is.null")
    .order("created_at", { ascending: false })
    .returns<Member[]>();

  return (
    <>
      <PageTitle title="Team" />
      <p className="mb-4 text-sm text-gray-600">
        New staff create an account at <b>/signup</b>, then appear here as “Retailer” until you give them a role.
        {profile.role === "manager" && " Managers can only manage sales and service executives."}
      </p>
      <Table head={["Name", "Contact", "Joined", "Role and access"]}>
        {members?.map((m) => {
          const editable =
            m.id !== profile.id && (profile.role === "owner" || MANAGER_CAN.includes(m.role));
          const roles = profile.role === "owner" ? ROLES : MANAGER_CAN;
          return (
            <tr key={m.id}>
              <td className="px-4 py-3 font-medium">{m.full_name || "—"}</td>
              <td className="px-4 py-3">
                {m.email}
                <div className="text-xs text-gray-500">{m.mobile}</div>
              </td>
              <td className="px-4 py-3">{dateIST(m.created_at)}</td>
              <td className="px-4 py-3">
                {editable ? (
                  <ActionForm action={updateMember} submitLabel="Save" variant="secondary" className="flex flex-wrap items-center gap-3">
                    <input type="hidden" name="id" value={m.id} />
                    <select name="role" defaultValue={m.role} className={`${inputBase} w-auto`}>
                      {roles.map((r) => (
                        <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                      ))}
                    </select>
                    <label className="flex items-center gap-1 text-sm">
                      <input type="checkbox" name="is_active" defaultChecked={m.is_active} /> Active
                    </label>
                  </ActionForm>
                ) : (
                  <span>
                    {ROLE_LABEL[m.role]}
                    {!m.is_active && <span className="ml-2 text-xs text-red-700">inactive</span>}
                  </span>
                )}
              </td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}
