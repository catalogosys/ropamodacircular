import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../App';
import { supabase } from '../lib/supabase';
import { ShoppingCart, X, Plus } from 'lucide-react';

export default function Shop() {
  const { settings, cart, setCart } = useContext(AppContext);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('available', true)
      .order('created_at', { ascending: false });
      
    if (data && !error) {
      setProducts(data);
    }
    setLoading(false);
  }

  const addToCart = (product) => {
    if (!cart.find((item) => item.id === product.id)) {
      setCart([...cart, product]);
    }
  };

  const removeFromCart = (id) => {
    setCart(cart.filter((item) => item.id !== id));
  };
  
  const cartTotal = cart.reduce((sum, item) => sum + Number(item.price), 0);

  const handleWhatsAppOrder = () => {
    if (cart.length === 0 || !settings) return;
    
    let message = `*Nuevo Pedido - ${settings.brand_name}*\n\n`;
    cart.forEach((item, index) => {
      message += `${index + 1}. ${item.title} (Talla: ${item.size}) - $${item.price}\n`;
    });
    message += `\n*Total: $${cartTotal}*\n\n¡Hola! Me gustaría realizar este pedido.`;
    
    const waUrl = `https://wa.me/${settings.whatsapp_number}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  const filteredProducts = filter === 'All' ? products : products.filter(p => p.category === filter);
  const categories = ['All', ...new Set(products.map(p => p.category))];

  return (
    <div className="relative">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-light">Explorar Colección</h1>
        <button 
          onClick={() => setIsCartOpen(true)} 
          className="bg-white text-black px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 hover:bg-neutral-200 transition"
        >
          <ShoppingCart size={16} /> Ver Pedido (${cartTotal.toLocaleString()})
        </button>
      </div>

      <div className="flex gap-4 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map(cat => (
          <button 
            key={cat} 
            onClick={() => setFilter(cat)} 
            className={`px-4 py-1 rounded-full border text-sm transition whitespace-nowrap ${
              filter === cat 
                ? 'bg-white text-black border-white' 
                : 'border-neutral-800 text-neutral-400 hover:border-neutral-500'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-neutral-500 font-light">Cargando colección...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 text-neutral-500 font-light">Aún no hay prendas disponibles.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div key={product.id} className="group bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden hover:border-neutral-600 transition duration-300">
              <div className="h-72 w-full overflow-hidden relative bg-neutral-800">
                <img 
                  src={product.image_url} 
                  alt={product.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500" 
                />
                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur text-xs px-2 py-1 rounded uppercase tracking-wider text-white">
                  {product.condition}
                </div>
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-neutral-100 truncate pr-2">{product.title}</h3>
                  <span className="text-sm font-light text-neutral-400">Talla {product.size}</span>
                </div>
                <div className="flex justify-between items-center mt-4">
                  <span className="text-lg tracking-wide">${Number(product.price).toLocaleString()}</span>
                  <button 
                    onClick={() => addToCart(product)} 
                    className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center hover:bg-white hover:text-black transition"
                    title="Añadir al pedido"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sidebar del Carrito */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsCartOpen(false)} 
          />
          <div className="relative w-full max-w-md bg-neutral-950 border-l border-neutral-800 h-full p-6 flex flex-col shadow-2xl animate-in slide-in-from-right">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-light">Tu Selección</h2>
              <button 
                onClick={() => setIsCartOpen(false)} 
                className="text-neutral-400 hover:text-white transition"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {cart.length === 0 ? (
                <p className="text-neutral-500 font-light text-center mt-10">No hay prendas seleccionadas.</p>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="flex gap-4 bg-neutral-900 p-3 rounded-lg border border-neutral-800 items-center">
                    <img src={item.image_url} alt={item.title} className="w-16 h-16 object-cover rounded-md bg-neutral-800" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-white">{item.title}</h4>
                      <p className="text-xs text-neutral-400">Talla: {item.size}</p>
                      <p className="text-sm mt-1 font-medium">${Number(item.price).toLocaleString()}</p>
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.id)} 
                      className="text-neutral-600 hover:text-red-400 transition p-2"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-neutral-800">
              <div className="flex justify-between text-lg mb-6">
                <span className="font-light">Total</span>
                <span className="font-medium">${cartTotal.toLocaleString()}</span>
              </div>
              <button 
                onClick={handleWhatsAppOrder} 
                disabled={cart.length === 0} 
                className="w-full bg-white text-black py-3 rounded-lg font-medium hover:bg-neutral-200 transition disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                <ShoppingCart size={18} /> Pedir por WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}