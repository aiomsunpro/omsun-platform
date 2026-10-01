import Image from "next/image";
import Link from "next/link";

// Placeholder home page. The full public website is a later stage.
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-blue-800 px-6 text-center text-white">
      <div className="rounded-2xl bg-white px-6 py-4 shadow-lg">
        <Image src="/omsun-logo.png" alt="OMSUN E-Seva Kendra" width={822} height={323} priority className="h-24 w-auto" />
      </div>
      <h1 className="text-4xl font-bold">
        OMSUN <span className="text-yellow-300">E-Services</span>
      </h1>
      <p className="text-lg text-blue-100">All Digital Services Under One Roof · Omerga, Maharashtra</p>
      <p className="text-blue-100">सर्व डिजिटल सेवा एकाच छताखाली</p>
      <Link href="/login" className="rounded-md bg-yellow-400 px-5 py-2.5 font-semibold text-blue-950 hover:bg-yellow-300">
        Staff Login
      </Link>
    </main>
  );
}
