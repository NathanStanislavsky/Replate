import { Link, Outlet } from "react-router-dom";
import { LayoutDashboard, Package, ListOrdered, Leaf } from "lucide-react";

export function BusinessLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-slate-800 text-white p-4 shadow-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <Link to="/business" className="flex items-center gap-2">
            <div className="bg-slate-500 p-1.5 rounded-lg">
              <Leaf size={24} className="text-white" />
            </div>
            <span className="text-xl font-bold">Replate Business</span>
          </Link>
          <nav className="flex gap-2">
            <Link
              to="/business"
              className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 flex items-center gap-2"
            >
              <LayoutDashboard size={18} /> Dashboard
            </Link>
            <Link
              to="/business/listings"
              className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 flex items-center gap-2"
            >
              <Package size={18} /> Listings
            </Link>
            <Link
              to="/business/requests"
              className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 flex items-center gap-2"
            >
              <ListOrdered size={18} /> Requests
            </Link>
            <Link
              to="/"
              className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-700"
            >
              View marketplace
            </Link>
          </nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
}
