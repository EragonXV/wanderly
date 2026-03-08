export default function DashboardLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-pulse">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <div className="h-8 w-48 rounded bg-slate-200" />
          <div className="mt-2 h-4 w-72 rounded bg-slate-100" />
        </div>
        <div className="h-10 w-40 rounded-xl bg-slate-200" />
      </div>

      <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="h-14 rounded-xl bg-slate-100" />
          <div className="h-14 rounded-xl bg-slate-100" />
          <div className="h-14 rounded-xl bg-slate-100" />
          <div className="h-14 rounded-xl bg-slate-100" />
          <div className="h-14 rounded-xl bg-slate-100" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="h-48 bg-slate-200" />
            <div className="space-y-3 p-5">
              <div className="h-5 w-3/4 rounded bg-slate-200" />
              <div className="h-4 w-2/3 rounded bg-slate-100" />
              <div className="h-4 w-5/6 rounded bg-slate-100" />
              <div className="h-10 rounded-xl bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
