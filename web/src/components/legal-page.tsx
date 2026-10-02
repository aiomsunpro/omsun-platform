import Image from "next/image";
import Link from "next/link";

// Plain page for the public policy pages (privacy, account deletion).
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-blue-800 px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" className="rounded-md bg-white px-3 py-1.5">
            <Image src="/omsun-logo.png" alt="OMSUN E-Seva Kendra" width={822} height={323} className="h-8 w-auto" />
          </Link>
          <Link href="/" className="text-sm text-blue-100 hover:text-white">मुख्य पान / Home</Link>
        </div>
      </header>
      <article className="mx-auto max-w-3xl px-4 py-8 text-gray-800 [&_h2]:mb-2 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-blue-950 [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-3 [&_ul]:mb-3">
        <h1 className="mb-6 text-2xl font-bold text-blue-950">{title}</h1>
        {children}
      </article>
    </main>
  );
}
