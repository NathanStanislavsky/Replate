import { useState } from 'react';
import { 
  MapPin, ShoppingBag, CreditCard, CheckCircle2, 
  Truck, ShieldCheck, Clock, Navigation, 
  X, AlertCircle, Leaf
} from 'lucide-react';

// --- TYPES ---
type Restaurant = {
  id: number;
  name: string;
  item: string;
  tags: string[];
  ebtPrice: number | null;
  standardPrice: number;
  retailValue: number;
  dist: string;
  available: number;
};

// --- MOCK DATA ---
const MOCK_RESTAURANTS: Restaurant[] = [
  { id: 1, name: "Boston Beanery", item: "Bakery Surprise Bag", tags: ["Vegetarian", "SNAP Eligible"], ebtPrice: 1.50, standardPrice: 4.99, retailValue: 15.00, dist: "0.4 mi", available: 3 },
  { id: 2, name: "Comm Ave Produce", item: "Fresh Veggie Bundle", tags: ["Vegan", "SNAP Eligible", "Raw"], ebtPrice: 2.00, standardPrice: 6.50, retailValue: 20.00, dist: "0.8 mi", available: 5 },
  { id: 3, name: "Fenway Hot Meals", item: "Prepared Dinner Box", tags: ["Hot Meal", "Not SNAP Eligible"], ebtPrice: null, standardPrice: 5.99, retailValue: 18.00, dist: "1.2 mi", available: 2 },
  { id: 4, name: "Allston Diner", item: "Breakfast Surplus", tags: ["SNAP Eligible"], ebtPrice: 1.00, standardPrice: 3.99, retailValue: 12.00, dist: "1.5 mi", available: 1 },
];

const MOCK_ROUTE = {
  driver: "Sarah J.",
  vehicleCapacity: "40 lbs",
  totalLoad: "32 lbs",
  estimatedTime: "45 mins",
  stops: [
    { id: 's1', type: 'pickup', name: "Boston Beanery", address: "123 Comm Ave", load: "+12 lbs (Bakery)", time: "5:00 PM", status: "completed" },
    { id: 's2', type: 'pickup', name: "Allston Fresh", address: "88 Harvard Ave", load: "+20 lbs (Produce)", time: "5:15 PM", status: "pending" },
    { id: 's3', type: 'dropoff', name: "Pine Street Inn Shelter", address: "444 Harrison Ave", load: "-32 lbs (Delivery)", time: "5:45 PM", status: "pending" }
  ]
};

export default function App() {
  const [activeTab, setActiveTab] = useState('market'); // 'market' or 'dispatch'
  const [selectedBag, setSelectedBag] = useState<Restaurant | null>(null);
  const [checkoutStep, setCheckoutStep] = useState('details'); // details, payment, success
  const [paymentMethod, setPaymentMethod] = useState('standard'); // standard, ebt

  const resetCheckout = () => {
    setSelectedBag(null);
    setCheckoutStep('details');
    setPaymentMethod('standard');
  };

  // --- COMPONENTS ---

  const Header = () => (
    <header className="bg-emerald-900 text-white p-4 shadow-md sticky top-0 z-10">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-400 p-1.5 rounded-lg">
            <Leaf size={24} className="text-emerald-950" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Replate</h1>
        </div>
        <nav className="flex gap-2 bg-emerald-800/50 p-1 rounded-xl w-full sm:w-auto">
          <button 
            onClick={() => setActiveTab('market')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'market' ? 'bg-white text-emerald-900 shadow' : 'text-emerald-50 hover:bg-emerald-800'}`}
          >
            Marketplace
          </button>
          <button 
            onClick={() => setActiveTab('dispatch')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'dispatch' ? 'bg-white text-emerald-900 shadow' : 'text-emerald-50 hover:bg-emerald-800'}`}
          >
            Driver Dispatch
          </button>
        </nav>
      </div>
    </header>
  );

  const CheckoutModal = () => {
    if (!selectedBag) return null;

    const isSnapEligible = selectedBag.tags.includes("SNAP Eligible");
    const tax = paymentMethod === 'ebt' ? 0.00 : 0.42;
    const price = paymentMethod === 'ebt' && isSnapEligible && selectedBag.ebtPrice !== null 
      ? selectedBag.ebtPrice 
      : selectedBag.standardPrice;
    const total = (price + tax).toFixed(2);

    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
          
          {/* Header */}
          <div className="bg-emerald-50 p-4 flex justify-between items-center border-b border-emerald-100 shrink-0">
            <h2 className="text-lg font-bold text-emerald-900">
              {checkoutStep === 'success' ? 'Order Confirmed' : 'Reserve Bag'}
            </h2>
            <button onClick={resetCheckout} className="p-1 hover:bg-emerald-200 rounded-full transition-colors text-emerald-700">
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto">
            {checkoutStep === 'details' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold">{selectedBag.name}</h3>
                  <p className="text-gray-600">{selectedBag.item}</p>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Payment Method</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setPaymentMethod('standard')}
                      className={`p-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-all ${paymentMethod === 'standard' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                      <CreditCard size={16} /> Standard
                    </button>
                    <button 
                      disabled={!isSnapEligible}
                      onClick={() => setPaymentMethod('ebt')}
                      className={`p-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-all ${!isSnapEligible ? 'opacity-50 cursor-not-allowed bg-gray-100' : paymentMethod === 'ebt' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                      <ShieldCheck size={16} /> EBT / SNAP
                    </button>
                  </div>
                  {!isSnapEligible && (
                    <p className="text-xs text-amber-600 flex items-center gap-1 mt-2">
                      <AlertCircle size={12} /> This item is hot/prepared and not SNAP eligible.
                    </p>
                  )}
                </div>

                <div className="space-y-2 text-sm border-t pt-4">
                  <div className="flex justify-between text-gray-600">
                    <span>Bag Price</span>
                    <span>${price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Estimated Tax {paymentMethod === 'ebt' && '(Waived)'}</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Total</span>
                    <span>${total}</span>
                  </div>
                </div>

                <button 
                  onClick={() => setCheckoutStep('payment')}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold transition-colors"
                >
                  Continue to Payment
                </button>
              </div>
            )}

            {checkoutStep === 'payment' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <div className="bg-blue-50 text-blue-800 p-4 rounded-xl flex gap-3 border border-blue-100">
                  <ShieldCheck className="shrink-0" />
                  <p className="text-sm">
                    {paymentMethod === 'ebt' 
                      ? "Secure Forage EBT API active. Your benefits PIN will be verified." 
                      : "Standard secure checkout."}
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {paymentMethod === 'ebt' ? 'EBT Card Number' : 'Card Number'}
                    </label>
                    <input type="text" placeholder="0000 0000 0000 0000" className="w-full border-gray-300 border rounded-lg p-3 outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  {paymentMethod === 'ebt' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">EBT PIN</label>
                      <input type="password" placeholder="****" className="w-full border-gray-300 border rounded-lg p-3 outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setCheckoutStep('details')} className="px-4 py-3 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors">
                    Back
                  </button>
                  <button 
                    onClick={() => setCheckoutStep('success')}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold transition-colors"
                  >
                    Pay ${total}
                  </button>
                </div>
              </div>
            )}

            {checkoutStep === 'success' && (
              <div className="text-center space-y-4 py-6 animate-in zoom-in-95">
                <div className="mx-auto bg-emerald-100 text-emerald-600 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Bag Reserved!</h3>
                <p className="text-gray-600">
                  Your pickup is ready at <strong>{selectedBag.name}</strong> between 5:00 PM and 6:00 PM today.
                </p>
                <div className="bg-gray-50 p-4 rounded-xl mt-6 inline-block w-full text-left border border-gray-200">
                  <p className="text-sm text-gray-500 mb-1">Order ID</p>
                  <p className="font-mono font-medium">#REP-{Math.floor(Math.random() * 10000)}</p>
                </div>
                <button 
                  onClick={resetCheckout}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold mt-4 transition-colors"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const MarketplaceView = () => (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Available Surplus Near You</h2>
        <p className="text-gray-600">Save food, save money, and help the planet.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_RESTAURANTS.map(bag => (
          <div key={bag.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group flex flex-col">
            <div className="h-32 bg-emerald-100 flex items-center justify-center p-4 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent z-0" />
              <ShoppingBag size={48} className="text-emerald-300/50 group-hover:scale-110 transition-transform duration-500" />
              <div className="absolute bottom-3 left-3 z-10">
                <span className="bg-white/90 backdrop-blur-sm text-emerald-900 text-xs font-bold px-2 py-1 rounded-md shadow-sm">
                  {bag.available} Left
                </span>
              </div>
            </div>
            
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg leading-tight">{bag.name}</h3>
                <span className="flex items-center text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full whitespace-nowrap">
                  <MapPin size={12} className="mr-1" /> {bag.dist}
                </span>
              </div>
              
              <p className="text-gray-600 text-sm mb-4">{bag.item}</p>
              
              <div className="flex flex-wrap gap-1 mb-4 mt-auto">
                {bag.tags.map(tag => (
                  <span key={tag} className={`text-xs px-2 py-1 rounded-md font-medium ${tag === 'SNAP Eligible' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-gray-100 text-gray-600'}`}>
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                <div>
                  <div className="text-xl font-bold text-emerald-700">${bag.standardPrice.toFixed(2)}</div>
                  <div className="text-xs text-gray-400 line-through">Value ${bag.retailValue.toFixed(2)}</div>
                </div>
                <button 
                  onClick={() => setSelectedBag(bag)}
                  className="bg-gray-900 hover:bg-emerald-600 text-white px-5 py-2 rounded-xl font-medium transition-colors"
                >
                  Reserve
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const DispatchView = () => (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Logistics Dashboard</h2>
          <p className="text-gray-600">Routing 50% of surplus to local shelters.</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2">
          <Truck size={16} /> 1 Active Milk Run
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Route Details */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Navigation className="text-emerald-600" size={20} /> Route Optimization
            </h3>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Assigned Driver:</span>
                <span className="font-medium">{MOCK_ROUTE.driver}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Current Load:</span>
                <span className="font-medium text-blue-600">{MOCK_ROUTE.totalLoad} / {MOCK_ROUTE.vehicleCapacity}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Est. Time:</span>
                <span className="font-medium">{MOCK_ROUTE.estimatedTime}</span>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-100 rounded-full h-2 mt-2 overflow-hidden">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '80%' }}></div>
              </div>
            </div>

            <button className="w-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold py-2.5 rounded-xl transition-colors border border-emerald-200">
              Message Driver
            </button>
          </div>
        </div>

        {/* Right Col: Timeline */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
           <h3 className="font-bold text-lg mb-6">Manifest & Timeline</h3>
           
           <div className="relative border-l-2 border-gray-100 ml-3 space-y-8">
             {MOCK_ROUTE.stops.map((stop) => (
               <div key={stop.id} className="relative pl-6">
                 {/* Timeline dot */}
                 <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white ${stop.status === 'completed' ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                 
                 <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                   <div>
                     <div className="flex items-center gap-2">
                       <h4 className={`font-bold ${stop.status === 'completed' ? 'text-gray-900' : 'text-gray-600'}`}>
                         {stop.name}
                       </h4>
                       <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${stop.type === 'pickup' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                         {stop.type}
                       </span>
                     </div>
                     <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                       <MapPin size={12} /> {stop.address}
                     </p>
                   </div>
                   
                   <div className="text-left sm:text-right">
                     <div className={`font-mono text-sm font-medium ${stop.type === 'pickup' ? 'text-blue-600' : 'text-purple-600'}`}>
                       {stop.load}
                     </div>
                     <div className="text-xs text-gray-400 flex items-center justify-start sm:justify-end gap-1 mt-1">
                       <Clock size={12} /> {stop.time}
                     </div>
                   </div>
                 </div>
               </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-20">
      <Header />
      <main>
        {activeTab === 'market' ? <MarketplaceView /> : <DispatchView />}
      </main>
      <CheckoutModal />
    </div>
  );
}