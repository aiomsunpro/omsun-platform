import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { Field, inputClass } from "@/components/ui";
import { signUp } from "../login/actions";
import { AuthShell } from "@/components/auth-shell";

export default function SignupPage() {
  return (
    <AuthShell title="Create staff account">
      <ActionForm action={signUp} submitLabel="Create account">
        <Field label="Full name">
          <input name="full_name" required className={inputClass} />
        </Field>
        <Field label="Email">
          <input name="email" type="email" required autoComplete="email" className={inputClass} />
        </Field>
        <Field label="Password (8+ characters)">
          <input name="password" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
        </Field>
      </ActionForm>
      <p className="mt-6 text-sm text-gray-600">
        Already have an account? <Link href="/login" className="font-medium text-blue-700 underline">Sign in</Link>
      </p>
    </AuthShell>
  );
}
