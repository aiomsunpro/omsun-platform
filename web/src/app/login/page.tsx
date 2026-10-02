import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { Field, inputClass } from "@/components/ui";
import { signIn } from "./actions";
import { AuthShell } from "@/components/auth-shell";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <AuthShell title="Staff login">
      {error === "not-staff" && (
        <p className="mb-4 rounded-md bg-yellow-50 p-3 text-sm text-yellow-900">
          Your account does not have staff access yet. Ask the owner to give you a role.
        </p>
      )}
      <ActionForm action={signIn} submitLabel="Sign in">
        <Field label="Email">
          <input name="email" type="email" required autoComplete="email" className={inputClass} />
        </Field>
        <Field label="Password">
          <input name="password" type="password" required autoComplete="current-password" className={inputClass} />
        </Field>
      </ActionForm>
      <p className="mt-3 text-sm">
        <Link href="/forgot-password" className="font-medium text-blue-700 underline">Forgot password?</Link>
      </p>
      <p className="mt-6 text-sm text-gray-600">
        New staff member? <Link href="/signup" className="font-medium text-blue-700 underline">Create an account</Link>
      </p>
    </AuthShell>
  );
}
