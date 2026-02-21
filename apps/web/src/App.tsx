import { Routes, Route, Navigate } from "react-router-dom";
import { BuyerLayout } from "./layouts/BuyerLayout";
import { BusinessLayout } from "./layouts/BusinessLayout";
import { MarketplaceMap } from "./pages/buyer/MarketplaceMap";
import { MarketListingDetail } from "./pages/buyer/MarketListingDetail";
import { BusinessLogin } from "./pages/business/BusinessLogin";
import { BusinessListingsMongo } from "./pages/business/BusinessListingsMongo";
import { BusinessListingOrders } from "./pages/business/BusinessListingOrders";

export default function App() {
  return (
    <Routes>
      <Route element={<BuyerLayout />}>
        <Route path="/" element={<MarketplaceMap />} />
        <Route path="/map" element={<MarketplaceMap />} />
        <Route path="/listing/m/:id" element={<MarketListingDetail />} />
        <Route path="/orders" element={<Navigate to="/map" replace />} />
        <Route path="/listing/:id" element={<Navigate to="/map" replace />} />
      </Route>
      <Route path="/business" element={<BusinessLayout />}>
        <Route index element={<BusinessListingsMongo />} />
        <Route path="login" element={<BusinessLogin />} />
        <Route path="m/listings" element={<BusinessListingsMongo />} />
        <Route path="m/listings/:id/orders" element={<BusinessListingOrders />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
