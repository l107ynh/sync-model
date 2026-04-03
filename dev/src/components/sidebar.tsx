import Link from "next/link";

const navItems = [
  { name: "Dashboard", href: "/" },
  { name: "Settings", href: "/settings" },
  { name: "History", href: "/history" },
];

export function Sidebar() {
  return (
    <aside className="flex w-64 flex-col border-r bg-white">
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-lg font-bold text-gray-900">Sync Model GP</h1>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="block rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          >
            {item.name}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
