import { Routes, Route, Navigate } from "react-router-dom";
import { BuyerLayout } from "./layouts/BuyerLayout";
import { BusinessLayout } from "./layouts/BusinessLayout";
import { Marketplace } from "./pages/buyer/Marketplace";
import { MarketplaceMap } from "./pages/buyer/MarketplaceMap";
import { ListingDetail } from "./pages/buyer/ListingDetail";
import { MarketListingDetail } from "./pages/buyer/MarketListingDetail";
import { Orders } from "./pages/buyer/Orders";
import { Dashboard } from "./pages/business/Dashboard";
import { Listings } from "./pages/business/Listings";
import { NewListing } from "./pages/business/NewListing";
import { Requests } from "./pages/business/Requests";
import { ListingEdit } from "./pages/business/ListingEdit";
import { BusinessLogin } from "./pages/business/BusinessLogin";
import { BusinessListingsMongo } from "./pages/business/BusinessListingsMongo";
import { BusinessListingOrders } from "./pages/business/BusinessListingOrders";

export default function App() {
  return (
    <Routes>
      <Route element={<BuyerLayout />}>
        <Route path="/" element={<Marketplace />} />
        <Route path="/map" element={<MarketplaceMap />} />
        <Route path="/listing/:id" element={<ListingDetail />} />
        <Route path="/listing/m/:id" element={<MarketListingDetail />} />
        <Route path="/orders" element={<Orders />} />
      </Route>
      <Route path="/business" element={<BusinessLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="login" element={<BusinessLogin />} />
        <Route path="m/listings" element={<BusinessListingsMongo />} />
        <Route path="m/listings/:id/orders" element={<BusinessListingOrders />} />
        <Route path="listings" element={<Listings />} />
        <Route path="listings/new" element={<NewListing />} />
        <Route path="listings/:id" element={<ListingEdit />} />
        <Route path="requests" element={<Requests />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
