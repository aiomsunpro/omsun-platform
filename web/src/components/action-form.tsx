"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import type { ActionState } from "@/lib/types";

type Props = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel: string;
  children?: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "danger";
};

const BUTTON = {
  primary: "bg-blue-700 text-white hover:bg-blue-800",
  secondary: "bg-white text-blue-800 border border-blue-200 hover:bg-blue-50",
  danger: "bg-white text-red-700 border border-red-200 hover:bg-red-50",
};

// A form bound to a Server Action that shows the action's error or success message.
// What the user typed is kept when the action fails and cleared when it succeeds.
export function ActionForm({ action, submitLabel, children, className, variant = "primary" }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      className={className ?? "space-y-3"}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => formAction(data));
      }}
    >
      {children}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className={`rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 ${BUTTON[variant]}`}
        >
          {pending ? "Saving…" : submitLabel}
        </button>
        {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
        {state?.ok && <p className="text-sm text-green-700">{state.ok}</p>}
      </div>
    </form>
  );
}
