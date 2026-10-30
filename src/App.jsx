import React, { useState, useEffect, createContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ShoppingBag, Lock } from 'lucide-react';
import { supabase } from './lib/supabase';
import Shop from './pages/Shop';
import Admin from './pages/Admin';

export const AppContext = createContext();

export default function App() {
  const [settings, setSettings] = useState(null);
  const [cart, setCart] = useState([]);

  useEffect(() => {
    async function loadSettings() {
      const { data, error } = await supabase.from('store_settings').select('*').single();
      if (data && !error) setSettings(data);
    }
    loadSettings();
  }, []);

  return (
    <AppContext.Provider value={{ settings, cart, setCart, setSettings }}>
      <Router>
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-gold-500 selection:text-white">
          <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm">
            <Link to="/" className="text-xl font-medium tracking-wide flex items-center gap-3 hover:text-gold-600 transition-colors">
              {settings?.logo_url && (
                <img src={settings.logo_url} alt="Logo" className="w-10 h-10 rounded-full object-cover border border-gray-100 shadow-sm" />
              )}
              {settings?.brand_name || 'CARGANDO...'}
            </Link>
            <div className="flex gap-6">
              <Link to="/" className="text-gray-600 hover:text-gold-600 transition flex items-center gap-2 font-medium">
                <ShoppingBag size={20} /> 
                <span className="text-sm">Bolsa ({cart.length})</span>
              </Link>
              <Link to="/admin" className="text-gray-600 hover:text-gold-600 transition flex items-center gap-2 font-medium">
                <Lock size={20} /> 
                <span className="text-sm">Admin</span>
              </Link>
            </div>
          </nav>
          <main className="max-w-7xl mx-auto p-6 md:p-10">
            <Routes>
              <Route path="/" element={<Shop />} />
              <Route path="/admin" element={<Admin />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AppContext.Provider>
  );
}
