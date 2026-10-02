"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

const MESSAGES: Record<string, string> = {
  invalid_name: "Please enter your full name. / कृपया तुमचे पूर्ण नाव टाका.",
  invalid_mobile: "Please enter your 10 digit mobile number. / कृपया 10 अंकी मोबाईल नंबर टाका.",
  too_long: "Please keep it shorter. / कृपया थोडक्यात लिहा.",
  too_many_enquiries: "Too many requests right now. Please try again later or call us.",
};

/** Website form: saves an account deletion request in the admin app's Enquiries. */
export async function submitDeletionRequest(_: ActionState, form: FormData): Promise<ActionState> {
  if (String(form.get("company") ?? "") !== "") return { ok: "Request received." };
  const text = (k: string) => String(form.get(k) ?? "");
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_account_deletion", {
    p_full_name: text("full_name"),
    p_mobile: text("mobile"),
    p_email: text("email"),
    p_reason: text("reason"),
  });
  if (!error) return { ok: "Request received. Our office will call you to confirm. / विनंती मिळाली, आमचे कार्यालय तुम्हाला कॉल करेल." };
  const known = Object.keys(MESSAGES).find((k) => error.message.includes(k));
  return { error: known ? MESSAGES[known] : "Could not send the request. Please try again or call us." };
}
