import Image from "next/image";

export function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-blue-800 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-lg">
        <Image src="/omsun-logo.png" alt="OMSUN E-Seva Kendra" width={822} height={323} priority className="mx-auto h-16 w-auto" />
        <h1 className="mb-6 mt-5 text-center text-2xl font-semibold text-blue-950">{title}</h1>
        {children}
      </div>
    </main>
  );
}
