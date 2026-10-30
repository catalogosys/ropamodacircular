import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../App';
import { supabase } from '../lib/supabase';
import { ShoppingCart, X, Plus, Search, User } from 'lucide-react';

export default function Shop() {
  const { settings, cart, setCart } = useContext(AppContext);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  const [filter, setFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para el Popup de Cliente
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [customerForm, setCustomerForm] = useState({ name: '', document: '', phone: '', address: '' });

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
      
    if (data && !error) setProducts(data);
    setLoading(false);
  }

  const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) {
        alert(`Lo sentimos, solo hay ${product.stock} unidad(es) disponible(s).`);
        return;
      }
      setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      if (product.stock < 1) {
        alert('Este producto se encuentra agotado.');
        return;
      }
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const removeFromCart = (id) => {
    setCart(cart.filter((item) => item.id !== id));
  };
  
  const cartTotal = cart.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    setCheckoutLoading(true);

    try {
      // 1. Guardar datos del cliente
      await supabase.from('customers').insert([customerForm]);

      // 2. Guardar la Venta/Remisión
      const orderItems = cart.map(item => ({ 
        title: item.title, 
        size: item.size, 
        quantity: item.quantity, 
        price: item.price 
      }));
      
      await supabase.from('remissions').insert([{
        customer_name: customerForm.name,
        total: cartTotal,
        items: orderItems
      }]);

      // 3. Descontar el stock
      for (const item of cart) {
        const newStock = item.stock - item.quantity;
        await supabase.from('products').update({
          stock: newStock,
          available: newStock > 0 ? item.available : false
        }).eq('id', item.id);
      }

      // 4. Generar mensaje para WhatsApp
      let message = `*✨ Nuevo Pedido - ${settings.brand_name} ✨*\n\n`;
      message += `*👤 DATOS DEL CLIENTE*\n`;
      message += `Nombre: ${customerForm.name}\n`;
      message += `Cédula: ${customerForm.document}\n`;
      message += `Teléfono: ${customerForm.phone}\n`;
      message += `Dirección: ${customerForm.address}\n\n`;
      message += `*🛍️ DETALLE DEL PEDIDO*\n`;
      
      cart.forEach((item, index) => { 
        message += `${index + 1}. ${item.quantity}x ${item.title} (Talla: ${item.size}) - $${(item.price * item.quantity).toLocaleString()}\n`; 
      });
      
      message += `\n*Total a pagar: $${cartTotal.toLocaleString()}*\n\n¡Hola! Acabo de registrar mi pedido en la web.`;

      // 5. Limpiar todo y abrir WhatsApp
      setCart([]);
      setIsCartOpen(false);
      setShowCheckout(false);
      setCustomerForm({ name: '', document: '', phone: '', address: '' });
      fetchProducts(); 
      
      window.open(`https://wa.me/${settings.whatsapp_number}?text=${encodeURIComponent(message)}`, '_blank');
    } catch (error) {
      alert("Hubo un error al procesar el pedido. Intenta nuevamente.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesCategory = filter === 'All' || p.category === filter;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      p.title.toLowerCase().includes(searchLower) || 
      p.category.toLowerCase().includes(searchLower) || 
      p.size.toLowerCase().includes(searchLower);
    return matchesCategory && matchesSearch;
  });

  const categories = ['All', ...new Set(products.map(p => p.category))];

  return (
    <div className="relative">
      
      {/* HEADER DE TIENDA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-serif font-bold text-gray-900 tracking-tight">Nueva Colección</h1>
          <p className="text-gray-500 mt-2 font-light">Moda circular exclusiva y seleccionada.</p>
        </div>
        <button onClick={() => setIsCartOpen(true)} className="bg-gray-900 text-white px-6 py-3 rounded-full text-sm font-semibold flex items-center gap-2 hover:bg-gold-500 transition-colors shadow-lg shadow-gray-200">
          <ShoppingCart size={18} /> Ver Pedido (${cartTotal.toLocaleString()})
        </button>
      </div>

      {/* BUSCADOR Y FILTROS */}
      <div className="flex flex-col md:flex-row gap-4 mb-10 items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative w-full md:w-96 flex-shrink-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar prenda, talla o categoría..." 
            className="w-full bg-gray-50 border border-gray-200 pl-11 pr-4 py-3 rounded-xl text-sm outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-all text-gray-900" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
        <div className="flex gap-2 overflow-x-auto w-full pb-2 md:pb-0 scrollbar-hide">
          {categories.map(cat => (
            <button 
              key={cat} 
              onClick={() => setFilter(cat)} 
              className={`px-5 py-2 rounded-full border text-sm font-medium transition whitespace-nowrap ${filter === cat ? 'bg-gold-500 text-white border-gold-500 shadow-md' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gold-500 hover:text-gold-600'}`}
            >
              {cat === 'All' ? 'Todas las prendas' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* GRILLA DE PRODUCTOS */}
      {loading ? (
        <div className="text-center py-20 text-gray-400 font-light text-lg animate-pulse">Cargando colección...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-20 text-gray-500 font-light bg-white rounded-2xl border border-dashed border-gray-300">
          {searchTerm ? 'No encontramos prendas con esa búsqueda.' : 'Aún no hay prendas disponibles.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredProducts.map((product) => (
            <div key={product.id} className="group bg-white rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col h-full relative">
              
              {/* Etiqueta de Stock bajo */}
              {product.stock <= 3 && product.stock > 0 && (
                <div className="absolute top-3 right-3 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full z-10 animate-pulse">
                  ¡Solo {product.stock}!
                </div>
              )}
              
              <div className="h-80 w-full relative bg-white border-b border-gray-50 p-6 flex items-center justify-center">
                <img src={product.image_url} alt={product.title} className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-700 ease-out drop-shadow-sm" />
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-xs font-semibold px-3 py-1.5 rounded-full uppercase tracking-wider text-gray-800 shadow-sm border border-gray-100">
                  {product.condition}
                </div>
              </div>
              
              <div className="p-5 flex flex-col flex-grow">
                <h3 className="font-bold text-gray-900 text-lg leading-tight line-clamp-2">{product.title}</h3>
                {product.description && <p className="text-sm text-gray-500 mt-2 line-clamp-2 mb-4">{product.description}</p>}
                
                <div className="mt-auto pt-4 flex justify-between items-end border-t border-gray-50">
                  <div>
                    <span className="text-xs text-gray-400 font-medium uppercase tracking-wider block mb-1">Talla {product.size}</span>
                    <span className="text-xl font-bold text-gray-900">${Number(product.price).toLocaleString()}</span>
                  </div>
                  <button onClick={() => addToCart(product)} className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-gold-500 hover:scale-110 transition-all shadow-md" title="Añadir al pedido">
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SIDEBAR DEL PEDIDO */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsCartOpen(false)} />
          <div className="relative w-full max-w-md bg-white h-full p-6 flex flex-col shadow-2xl animate-in slide-in-from-right border-l border-gray-100">
            
            <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4">
              <h2 className="text-2xl font-serif font-bold text-gray-900">Tu Pedido</h2>
              <button onClick={() => setIsCartOpen(false)} className="text-gray-400 hover:text-gray-800 transition bg-gray-100 p-2 rounded-full"><X size={20} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {cart.length === 0 ? (
                <div className="text-center mt-20">
                  <ShoppingCart size={48} className="mx-auto text-gray-200 mb-4" />
                  <p className="text-gray-500 font-light">Tu pedido está vacío.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="flex gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100 items-center hover:bg-gray-100 transition">
                    <div className="w-20 h-20 bg-white rounded-lg flex items-center justify-center shadow-sm border border-gray-100 p-1">
                      <img src={item.image_url} alt={item.title} className="max-w-full max-h-full object-contain" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-gray-900 leading-tight">{item.title}</h4>
                      <p className="text-xs text-gray-500 mt-1">
                        Talla: <span className="font-medium">{item.size}</span> | Cant: <span className="font-medium text-gray-800">{item.quantity}</span>
                      </p>
                      <p className="text-sm mt-2 font-bold text-gold-600">
                        ${(Number(item.price) * item.quantity).toLocaleString()} 
                        <span className="text-xs text-gray-400 font-normal"> (${item.price.toLocaleString()} c/u)</span>
                      </p>
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
              <button 
                onClick={() => setShowCheckout(true)} 
                disabled={cart.length === 0} 
                className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold hover:bg-gold-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-lg"
              >
                Continuar con el Pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP DE DATOS DEL CLIENTE */}
      {showCheckout && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowCheckout(false)} />
          <div className="relative bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200">
            
            <button onClick={() => setShowCheckout(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-800"><X size={24} /></button>
            
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-gold-50 text-gold-600 rounded-full"><User size={24} /></div>
              <h3 className="text-2xl font-serif font-bold text-gray-900">Tus Datos</h3>
            </div>
            
            <p className="text-sm text-gray-500 mb-6 ml-14">Para confirmar tu pedido y gestionar el envío.</p>
            
            <form onSubmit={handleCheckoutSubmit} className="space-y-4">
              <input type="text" required placeholder="Nombre Completo" className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl text-sm outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-all text-gray-900" value={customerForm.name} onChange={e => setCustomerForm({...customerForm, name: e.target.value})} />
              <input type="text" required placeholder="Cédula de Ciudadanía" className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl text-sm outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-all text-gray-900" value={customerForm.document} onChange={e => setCustomerForm({...customerForm, document: e.target.value})} />
              <input type="tel" required placeholder="Teléfono / WhatsApp" className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl text-sm outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-all text-gray-900" value={customerForm.phone} onChange={e => setCustomerForm({...customerForm, phone: e.target.value})} />
              <textarea required placeholder="Dirección completa de envío" rows="2" className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl text-sm outline-none resize-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-all text-gray-900" value={customerForm.address} onChange={e => setCustomerForm({...customerForm, address: e.target.value})} />
              
              <button type="submit" disabled={checkoutLoading} className="w-full bg-gold-500 text-white font-bold py-4 rounded-xl hover:bg-gold-600 transition-colors shadow-lg mt-4 flex items-center justify-center gap-2">
                {checkoutLoading ? 'Procesando...' : 'Confirmar y Enviar a WhatsApp'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
