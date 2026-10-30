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
  const [isCartOpen, setIsCartOpen] = useState(false); 

  useEffect(() => {
    async function loadSettings() {
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .single();
        
      if (data && !error) {
        setSettings(data);
      }
    }
    loadSettings();
  }, []);

  return (
    <AppContext.Provider value={{ settings, cart, setCart, setSettings, isCartOpen, setIsCartOpen }}>
      <Router>
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-gold-500 selection:text-white">
          
          {/* MENÚ DE NAVEGACIÓN (Diseño de 3 columnas para centrado perfecto) */}
          <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 px-4 md:px-6 py-2 flex justify-between items-center shadow-sm">
            
            {/* 1. Columna Izquierda: Nombre de la Empresa */}
            <div className="flex-1 flex justify-start">
              <Link 
                to="/" 
                className="text-lg md:text-xl font-serif font-bold tracking-wide hover:text-gold-600 transition-colors line-clamp-1"
              >
                {settings?.brand_name || 'L&P Moda Circular'}
              </Link>
            </div>

            {/* 2. Columna Centro Absoluto: Solo el Logo */}
            <div className="flex-1 flex justify-center items-center">
              <Link to="/" className="transition-transform hover:scale-105">
                {settings?.logo_url && (
                  <img 
                    src={settings.logo_url} 
                    alt="Logo" 
                    className="h-24 w-auto object-contain drop-shadow-sm" 
                  />
                )}
              </Link>
            </div>

            {/* 3. Columna Derecha: Botones de Pedido y Admin */}
            <div className="flex flex-1 justify-end items-center gap-4 md:gap-8">
              
              <button 
                onClick={() => setIsCartOpen(true)} 
                className="text-gray-600 hover:text-gold-600 transition flex items-center gap-2 font-medium cursor-pointer bg-transparent border-none p-0"
              >
                <ShoppingBag size={20} /> 
                <span className="text-sm hidden sm:inline">Pedido ({cart.length})</span>
                <span className="text-sm sm:hidden">({cart.length})</span>
              </button>
              
              <Link 
                to="/admin" 
                className="text-gray-600 hover:text-gold-600 transition flex items-center gap-2 font-medium"
              >
                <Lock size={20} /> 
                <span className="text-sm hidden md:inline">Admin</span>
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
