export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-2 text-gray-600">
        Sync Model GP - Model 設定管理平台
      </p>
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Versions</h2>
          <p className="mt-1 text-sm text-gray-500">管理版本設定</p>
        </div>
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Environments</h2>
          <p className="mt-1 text-sm text-gray-500">管理環境設定</p>
        </div>
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Editions</h2>
          <p className="mt-1 text-sm text-gray-500">管理版本方案</p>
        </div>
      </div>
    </div>
  );
}
