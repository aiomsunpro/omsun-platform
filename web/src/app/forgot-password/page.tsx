import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { AuthShell } from "@/components/auth-shell";
import { Field, inputClass } from "@/components/ui";
import { requestPasswordReset } from "./actions";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <AuthShell title="Forgot password">
      {error === "link" && (
        <p className="mb-4 rounded-md bg-yellow-50 p-3 text-sm text-yellow-900">
          That reset link has expired or was already used. Ask for a new one below.
        </p>
      )}
      <p className="mb-4 text-sm text-gray-600">Enter the email you sign in with. We will email you a link to set a new password.</p>
      <ActionForm action={requestPasswordReset} submitLabel="Send reset link">
        <Field label="Email">
          <input name="email" type="email" required autoComplete="email" className={inputClass} />
        </Field>
      </ActionForm>
      <p className="mt-6 text-sm text-gray-600">
        Remembered it? <Link href="/login" className="font-medium text-blue-700 underline">Back to login</Link>
      </p>
    </AuthShell>
  );
}
