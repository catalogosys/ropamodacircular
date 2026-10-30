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
      if (data && !error) {
        setSettings(data);
      }
    }
    loadSettings();
  }, []);

  return (
    <AppContext.Provider value={{ settings, cart, setCart, setSettings }}>
      <Router>
        <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans selection:bg-neutral-700">
          <nav className="sticky top-0 z-50 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800 px-6 py-4 flex justify-between items-center">
            <Link to="/" className="text-xl font-light tracking-widest flex items-center gap-3 hover:text-white transition">
              {settings?.logo_url && (
                <img 
                  src={settings.logo_url} 
                  alt="Logo" 
                  className="w-8 h-8 rounded-full object-cover" 
                />
              )}
              {settings?.brand_name || 'CARGANDO...'}
            </Link>
            <div className="flex gap-4">
              <Link to="/" className="hover:text-white transition flex items-center gap-2">
                <ShoppingBag size={18} /> 
                <span className="text-sm">Catálogo ({cart.length})</span>
              </Link>
              <Link to="/admin" className="hover:text-white transition flex items-center gap-2">
                <Lock size={18} /> 
                <span className="text-sm">Admin</span>
              </Link>
            </div>
          </nav>
          <main className="max-w-7xl mx-auto p-6">
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