export function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-blue-800 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-lg">
        <p className="text-sm font-bold tracking-wide text-blue-800">
          OMSUN <span className="text-yellow-500">E-Services</span>
        </p>
        <h1 className="mb-6 mt-1 text-2xl font-semibold text-blue-950">{title}</h1>
        {children}
      </div>
    </main>
  );
}
