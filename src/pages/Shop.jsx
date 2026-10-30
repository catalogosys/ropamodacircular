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
    const { data, error } = await supabase.from('products').select('*').eq('available', true).order('created_at', { ascending: false });
    if (data && !error) setProducts(data);
    setLoading(false);
  }

  const addToCart = (product) => {
    if (!cart.find((item) => item.id === product.id)) setCart([...cart, product]);
  };

  const removeFromCart = (id) => setCart(cart.filter((item) => item.id !== id));
  const cartTotal = cart.reduce((sum, item) => sum + Number(item.price), 0);

  const handleWhatsAppOrder = () => {
    if (cart.length === 0 || !settings) return;
    let message = `*✨ Nuevo Pedido - ${settings.brand_name} ✨*\n\n`;
    cart.forEach((item, index) => { message += `${index + 1}. ${item.title} (Talla: ${item.size}) - $${item.price.toLocaleString()}\n`; });
    message += `\n*Total: $${cartTotal.toLocaleString()}*\n\n¡Hola! Me gustaría realizar este pedido.`;
    window.open(`https://wa.me/${settings.whatsapp_number}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const filteredProducts = filter === 'All' ? products : products.filter(p => p.category === filter);
  const categories = ['All', ...new Set(products.map(p => p.category))];

  return (
    <div className="relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-serif font-bold text-gray-900 tracking-tight">Nueva Colección</h1>
          <p className="text-gray-500 mt-2 font-light">Moda circular exclusiva y seleccionada.</p>
        </div>
        <button onClick={() => setIsCartOpen(true)} className="bg-gray-900 text-white px-6 py-3 rounded-full text-sm font-semibold flex items-center gap-2 hover:bg-gold-500 transition-colors shadow-lg shadow-gray-200">
          <ShoppingCart size={18} /> Ver Bolsa (${cartTotal.toLocaleString()})
        </button>
      </div>

      <div className="flex gap-3 mb-10 overflow-x-auto pb-4 scrollbar-hide">
        {categories.map(cat => (
          <button key={cat} onClick={() => setFilter(cat)} className={`px-5 py-2 rounded-full border text-sm font-medium transition whitespace-nowrap ${
              filter === cat ? 'bg-gold-500 text-white border-gold-500 shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:border-gold-500 hover:text-gold-600'
            }`}>
            {cat === 'All' ? 'Todas las prendas' : cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400 font-light text-lg animate-pulse">Cargando colección...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 text-gray-500 font-light bg-white rounded-2xl border border-dashed border-gray-300">Aún no hay prendas disponibles.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredProducts.map((product) => (
            <div key={product.id} className="group bg-white rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col h-full">
              <div className="h-80 w-full overflow-hidden relative bg-gray-50">
                <img src={product.image_url} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-xs font-semibold px-3 py-1.5 rounded-full uppercase tracking-wider text-gray-800 shadow-sm">
                  {product.condition}
                </div>
              </div>
              <div className="p-5 flex flex-col flex-grow">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-gray-900 text-lg leading-tight line-clamp-2">{product.title}</h3>
                </div>
                {product.description && <p className="text-sm text-gray-500 mt-2 line-clamp-2 mb-4">{product.description}</p>}
                
                <div className="mt-auto pt-4 flex justify-between items-end border-t border-gray-50">
                  <div>
                    <span className="text-xs text-gray-400 font-medium uppercase tracking-wider block mb-1">Talla {product.size}</span>
                    <span className="text-xl font-bold text-gray-900">${Number(product.price).toLocaleString()}</span>
                  </div>
                  <button onClick={() => addToCart(product)} className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-gold-500 hover:scale-110 transition-all shadow-md" title="Añadir a la bolsa">
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsCartOpen(false)} />
          <div className="relative w-full max-w-md bg-white h-full p-6 flex flex-col shadow-2xl animate-in slide-in-from-right border-l border-gray-100">
            <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4">
              <h2 className="text-2xl font-serif font-bold text-gray-900">Tu Bolsa</h2>
              <button onClick={() => setIsCartOpen(false)} className="text-gray-400 hover:text-gray-800 transition bg-gray-100 p-2 rounded-full"><X size={20} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {cart.length === 0 ? (
                <div className="text-center mt-20"><ShoppingBag size={48} className="mx-auto text-gray-200 mb-4" /><p className="text-gray-500 font-light">Tu bolsa está vacía.</p></div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="flex gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100 items-center hover:bg-gray-100 transition">
                    <img src={item.image_url} alt={item.title} className="w-20 h-20 object-cover rounded-lg shadow-sm" />
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-gray-900 leading-tight">{item.title}</h4>
                      <p className="text-xs text-gray-500 mt-1">Talla: <span className="font-medium">{item.size}</span></p>
                      <p className="text-sm mt-2 font-bold text-gold-600">${Number(item.price).toLocaleString()}</p>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-gray-400 hover:text-red-500 transition p-2 bg-white rounded-full shadow-sm"><X size={16} /></button>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 bg-white">
              <div className="flex justify-between text-xl mb-6 items-center">
                <span className="font-medium text-gray-600">Total a pagar</span>
                <span className="font-bold text-gray-900">${cartTotal.toLocaleString()}</span>
              </div>
              <button onClick={handleWhatsAppOrder} disabled={cart.length === 0} className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold hover:bg-gold-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-lg">
                <ShoppingCart size={20} /> Enviar Pedido por WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
