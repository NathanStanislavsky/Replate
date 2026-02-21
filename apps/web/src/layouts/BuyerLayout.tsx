import { Link, Outlet } from "react-router-dom";
import { ShoppingBag, Leaf, ListOrdered } from "lucide-react";

export function BuyerLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-emerald-900 text-white p-4 shadow-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-emerald-400 p-1.5 rounded-lg">
              <Leaf size={24} className="text-emerald-950" />
            </div>
            <span className="text-xl font-bold">Replate</span>
          </Link>
          <nav className="flex gap-2">
            <Link
              to="/"
              className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-800 flex items-center gap-2"
            >
              <ShoppingBag size={18} /> Marketplace
            </Link>
            <Link
              to="/orders"
              className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-800 flex items-center gap-2"
            >
              <ListOrdered size={18} /> My orders
            </Link>
            <Link
              to="/business"
              className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-800"
            >
              For businesses
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
