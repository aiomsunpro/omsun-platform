import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { LegalPage } from "@/components/legal-page";
import { Field, inputClass } from "@/components/ui";
import { submitDeletionRequest } from "./actions";

export const metadata: Metadata = { title: "Delete Your Account - OMSUN Mitra" };

// The "delete account" web link Google Play asks for on the OMSUN Mitra listing.
export default function DeleteAccountPage() {
  return (
    <LegalPage title="Delete Your OMSUN Mitra Account">
      <p>
        You can ask OMSUN E-Seva Kendra to delete your OMSUN Mitra partner account and the personal data linked to it.
        तुमचे OMSUN Mitra खाते आणि त्याची माहिती हटवण्यासाठी खालील फॉर्म भरा.
      </p>

      <h2>How To Ask</h2>
      <ul>
        <li>In the app: open <b>Profile</b> and tap <b>Delete My Account</b>.</li>
        <li>Or fill in the form below, call <a href="tel:+919146997733" className="text-blue-700 underline">+91 9146997733</a>, or email <a href="mailto:info@omsun.in" className="text-blue-700 underline">info@omsun.in</a>.</li>
      </ul>

      <div className="my-6 rounded-xl border border-gray-200 bg-white p-5">
        <ActionForm action={submitDeletionRequest} submitLabel="Send Deletion Request" variant="danger">
          <Field label="Full Name / पूर्ण नाव">
            <input name="full_name" required maxLength={100} className={inputClass} />
          </Field>
          <Field label="Registered Mobile Number / नोंदणीकृत मोबाईल नंबर">
            <input name="mobile" required inputMode="numeric" maxLength={15} className={inputClass} />
          </Field>
          <Field label="Email (optional)">
            <input name="email" type="email" maxLength={200} className={inputClass} />
          </Field>
          <Field label="Reason (optional)">
            <textarea name="reason" rows={2} maxLength={1000} className={inputClass} />
          </Field>
          <input name="company" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
        </ActionForm>
      </div>

      <h2>What Happens Next</h2>
      <ul>
        <li>Our office calls you on the registered mobile number to confirm it is you.</li>
        <li>Within 30 days we delete your login, shop profile, and the customer details and documents you uploaded.</li>
        <li>We keep only what the law requires, such as payment, commission and tax records, for as long as the law requires.</li>
      </ul>
      <p>See our <Link href="/privacy" className="text-blue-700 underline">Privacy Policy</Link> for details.</p>
    </LegalPage>
  );
}
