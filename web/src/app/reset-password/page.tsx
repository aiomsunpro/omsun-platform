import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { AuthShell } from "@/components/auth-shell";
import { Field, inputClass } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { setNewPassword } from "../forgot-password/actions";

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return (
    <AuthShell title="Set a new password">
      {data.user ? (
        <ActionForm action={setNewPassword} submitLabel="Save password">
          <Field label="New password">
            <input name="password" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
          </Field>
          <Field label="Type it again">
            <input name="confirm" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
          </Field>
        </ActionForm>
      ) : (
        <p className="text-sm text-gray-600">
          Open this page from the link in your reset email.{" "}
          <Link href="/forgot-password" className="font-medium text-blue-700 underline">Send a new link</Link>
        </p>
      )}
    </AuthShell>
  );
}
