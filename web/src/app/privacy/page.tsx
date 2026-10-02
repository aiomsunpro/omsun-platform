import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Privacy Policy - OMSUN E-Seva Kendra" };

// Linked from the website footer and from the OMSUN Mitra app's Play Store listing.
export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p className="text-sm text-gray-500">Last updated: 2 October 2026</p>
      <p>
        This policy explains how OMSUN E-Seva Kendra (&ldquo;OMSUN&rdquo;, &ldquo;we&rdquo;) collects and uses information through
        the website omsunesewakendra.com, the OMSUN staff portal and the OMSUN Mitra mobile app for partner shops.
      </p>

      <h2>Information We Collect</h2>
      <ul>
        <li><b>Partner account details:</b> name, email, mobile number, shop name, business type and shop address.</li>
        <li><b>Customer details entered by partners:</b> the customer&rsquo;s name, mobile number and the service requested.</li>
        <li><b>Documents:</b> photos or files of documents attached to a service request, such as ID proofs, taken with the camera or chosen from the phone.</li>
        <li><b>Service and payment records:</b> requests, their status, fees, amounts paid and partner commissions.</li>
        <li><b>Website forms:</b> the name, mobile number, village and district you give when you ask for a callback or track an application.</li>
      </ul>

      <h2>How We Use It</h2>
      <ul>
        <li>To create and manage partner accounts and approve partner shops.</li>
        <li>To process the government and banking services that customers request, and to keep them updated on progress.</li>
        <li>To calculate fees and partner commissions and keep accounts.</li>
        <li>To contact you about your request or enquiry.</li>
      </ul>
      <p>We do not sell personal information, show advertising, or use third-party advertising or analytics trackers in the app.</p>

      <h2>Sharing</h2>
      <p>
        Customer details and documents are shared only with the government department, bank or portal needed to deliver the
        service the customer asked for, or when the law requires it. Data is stored with our hosting provider (Supabase) on
        secure servers, protected by login and access rules so that each partner sees only their own customers and requests.
      </p>

      <h2>App Permissions</h2>
      <ul>
        <li><b>Camera:</b> to photograph customer documents for a request. Used only when you tap to add a document.</li>
        <li><b>Photos and files:</b> to attach documents already on the phone. Used only when you choose a file.</li>
      </ul>

      <h2>Keeping and Deleting Data</h2>
      <p>
        We keep information while a partner account is active and as long as needed to complete services and meet legal and
        accounting requirements. You can ask us to delete your account and personal data at any time from the app (Profile →
        Delete My Account) or on our <Link href="/delete-account" className="text-blue-700 underline">account deletion page</Link>.
        We delete it within 30 days, except records we must keep by law, such as payment and tax records.
      </p>

      <h2>Security</h2>
      <p>All data travels over encrypted connections (HTTPS). Access inside OMSUN is limited by staff role.</p>

      <h2>Children</h2>
      <p>The OMSUN Mitra app is meant for adult shop owners and is not directed at children.</p>

      <h2>Contact</h2>
      <p>
        OMSUN E-Seva Kendra, 614, Durgasadan Apt, 3rd Floor, Near Ganjpeth Police Station, Guruwar Peth, Pune 411042.<br />
        Phone: <a href="tel:+919146997733" className="text-blue-700 underline">+91 9146997733</a> · Email:{" "}
        <a href="mailto:info@omsun.in" className="text-blue-700 underline">info@omsun.in</a>
      </p>
    </LegalPage>
  );
}
