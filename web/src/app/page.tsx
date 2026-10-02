import type { Metadata } from "next";
import Home from "@/components/site/home";

const TITLE = "OMSUN E सेवा केंद्र - ग्रामीण डिजिटल सेवा फ्रँचायझी";
const DESCRIPTION =
  "OMSUN E सेवा केंद्र - बँकिंग, CSC, सेतू, आपले सरकार, RTO, तहसील व सरकारी योजना सेवा. आपल्या गावात फ्रँचायझी सुरू करा.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  authors: [{ name: "OMSUN E Sewa Kendra" }],
  openGraph: { title: TITLE, description: DESCRIPTION, type: "website", images: ["/site/hero.jpg"] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/site/hero.jpg"] },
};

// Public website, moved here from the old Lovable project.
export default function Page() {
  return <Home />;
}
