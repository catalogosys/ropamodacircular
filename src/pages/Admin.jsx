import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { AppContext } from '../App';
import { 
  Upload, LogOut, Settings, Archive, Trash2, Edit2, 
  CheckCircle, XCircle, PlusCircle, Users, TrendingUp, Download 
} from 'lucide-react';

export default function Admin() {
  const { settings, setSettings } = useContext(AppContext);
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('inventory');
  
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [sales, setSales] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [prodForm, setProdForm] = useState({ 
    title: '', 
    description: '', 
    size: '', 
    condition: 'Como nuevo', 
    price: '', 
    category: '', 
    stock: 1, 
    file: null, 
    available: true 
  });
  
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) { 
        fetchAdminProducts(); 
        fetchCustomers(); 
        fetchSales(); 
      }
    });
    
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) { 
        fetchAdminProducts(); 
        fetchCustomers(); 
        fetchSales(); 
      }
    });
  }, []);

  const fetchAdminProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (data) setProducts(data);
  };

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
    if (data) setCustomers(data);
  };

  const fetchSales = async () => {
    const { data } = await supabase.from('remissions').select('*').order('created_at', { ascending: false });
    if (data) setSales(data);
  };

  const handleDownloadCSV = (type) => {
    let headers = [];
    let data = [];
    let filename = '';

    if (type === 'customers') {
      headers = ['Fecha de Registro', 'Nombre', 'Cédula', 'Teléfono', 'Dirección'];
      data = customers.map(c => [
        new Date(c.created_at).toLocaleDateString(), 
        c.name, 
        c.document, 
        c.phone, 
        c.address
      ]);
      filename = 'clientes.csv';
    } else if (type === 'sales') {
      headers = ['Fecha de Venta', 'Cliente', 'Productos Vendidos', 'Total (Ingreso)'];
      data = sales.map(s => [
        new Date(s.created_at).toLocaleDateString(), 
        s.customer_name, 
        s.items.map(i => `${i.quantity}x ${i.title} (Talla ${i.size})`).join(' + '), 
        s.total
      ]);
      filename = 'ventas_y_ganancias.csv';
    }

    const escape = (text) => `"${String(text).replace(/"/g, '""')}"`;
    const csvContent = "\uFEFF" + [headers.map(escape), ...data.map(row => row.map(escape))].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) showMessage(error.message, 'error');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleCloudinaryUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
    
    const res = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, { 
      method: 'POST', 
      body: formData 
    });
    
    if (!res.ok) throw new Error('Error al subir la imagen');
    const data = await res.json();
    return data.secure_url;
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!editingId && !prodForm.file) { 
      showMessage('Debes seleccionar una imagen para un producto nuevo', 'error'); 
      return; 
    }
    
    setUploading(true);
    try {
      let imageUrl = prodForm.image_url;
      if (prodForm.file) {
        imageUrl = await handleCloudinaryUpload(prodForm.file);
      }
      
      const productData = { 
        title: prodForm.title, 
        description: prodForm.description, 
        size: prodForm.size, 
        condition: prodForm.condition, 
        price: Number(prodForm.price), 
        category: prodForm.category, 
        stock: Number(prodForm.stock), 
        available: prodForm.available, 
        image_url: imageUrl 
      };
      
      let error;
      if (editingId) { 
        const res = await supabase.from('products').update(productData).eq('id', editingId); 
        error = res.error; 
      } else { 
        const res = await supabase.from('products').insert([productData]); 
        error = res.error; 
      }
      
      if (error) throw error;
      
      showMessage(editingId ? 'Prenda actualizada con éxito' : 'Prenda publicada con éxito');
      resetForm(); 
      fetchAdminProducts(); 
      setActiveTab('list');
    } catch (error) { 
      showMessage(error.message, 'error'); 
    } finally { 
      setUploading(false); 
    }
  };

  const resetForm = () => { 
    setEditingId(null); 
    setProdForm({ 
      title: '', description: '', size: '', condition: 'Como nuevo', 
      price: '', category: '', stock: 1, file: null, available: true 
    }); 
  };

  const handleEdit = (product) => {
    setEditingId(product.id);
    setProdForm({ 
      title: product.title, 
      description: product.description || '', 
      size: product.size, 
      condition: product.condition, 
      price: product.price, 
      category: product.category, 
      stock: product.stock || 1, 
      available: product.available, 
      image_url: product.image_url, 
      file: null 
    });
    setActiveTab('inventory');
  };

  const handleToggleAvailability = async (id, currentStatus) => { 
    const { error } = await supabase.from('products').update({ available: !currentStatus }).eq('id', id); 
    if (!error) fetchAdminProducts(); 
  };

  const handleDeleteProduct = async (id) => { 
    if (!window.confirm('¿Seguro que deseas eliminar esta prenda permanentemente?')) return; 
    const { error } = await supabase.from('products').delete().eq('id', id); 
    if (!error) { 
      showMessage('Prenda eliminada'); 
      fetchAdminProducts(); 
    } 
  };
  
  const handleSettingsUpdate = async (e) => { 
    e.preventDefault(); 
    setUploading(true); 
    const { error } = await supabase.from('store_settings').update({ 
      brand_name: settings.brand_name, 
      logo_url: settings.logo_url, 
      whatsapp_number: settings.whatsapp_number 
    }).eq('id', settings.id); 
    
    if (!error) showMessage('Configuración actualizada exitosamente'); 
    setUploading(false); 
  };

  if (!session) {
    return (
      <div className="max-w-md mx-auto mt-20 bg-white p-10 rounded-3xl border border-gray-100 shadow-2xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-serif font-bold text-gray-900 mb-2">Bienvenido</h2>
          <p className="text-gray-500 font-light">Acceso exclusivo para administración</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
              Correo Electrónico
            </label>
            <input 
              type="email" 
              placeholder="tu@correo.com" 
              className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl text-sm outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-all" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
              Contraseña
            </label>
            <input 
              type="password" 
              placeholder="••••••••" 
              className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl text-sm outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-all" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
          </div>
          <button 
            type="submit" 
            className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl hover:bg-gold-500 transition-colors shadow-lg mt-4"
          >
            Ingresar al Panel
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="pb-20">
      
      {/* HEADER ADMIN */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900">
            Panel de Administración
          </h1>
          <p className="text-gray-500 mt-1 font-light">
            Gestiona tu catálogo, clientes y ventas.
          </p>
        </div>
        <button 
          onClick={handleLogout} 
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-red-500 px-5 py-2.5 bg-white border border-gray-200 rounded-full shadow-sm hover:shadow-md transition-all"
        >
          <LogOut size={16} /> Cerrar Sesión
        </button>
      </div>

      {/* TABS DE NAVEGACION */}
      <div className="flex gap-4 border-b border-gray-200 mb-10 overflow-x-auto pb-2 scrollbar-hide">
        {[
          { id: 'list', label: 'Mi Catálogo', icon: Archive },
          { id: 'inventory', label: editingId ? 'Editando Prenda' : 'Publicar Nueva', icon: PlusCircle },
          { id: 'sales', label: 'Mis Ventas', icon: TrendingUp },
          { id: 'customers', label: 'Clientes', icon: Users },
          { id: 'settings', label: 'Ajustes', icon: Settings },
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => { 
              setActiveTab(tab.id); 
              if(tab.id !== 'inventory') resetForm(); 
            }} 
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-t-xl transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-white text-gold-600 border-t border-l border-r border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]' 
                : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <tab.icon size={18} /> {tab.label}
          </button>
        ))}
      </div>

      {/* MENSAJES DE ALERTA */}
      {message.text && (
        <div className={`mb-8 p-4 rounded-xl text-sm font-bold flex items-center gap-3 border shadow-sm animate-in fade-in ${
          message.type === 'error' ? 'bg-red-50 border-red-100 text-red-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'
        }`}>
          {message.type === 'error' ? <XCircle size={20} /> : <CheckCircle size={20} />} 
          {message.text}
        </div>
      )}

      {/* CATALOGO */}
      {activeTab === 'list' && (
        <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider text-xs">
                <tr>
                  <th className="p-5">Producto</th>
                  <th className="p-5">Categoría</th>
                  <th className="p-5">Precio y Stock</th>
                  <th className="p-5 text-center">Estado</th>
                  <th className="p-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-10 text-center text-gray-400 font-medium">
                      Aún no hay prendas en el catálogo.
                    </td>
                  </tr>
                ) : products.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-5 flex items-center gap-4">
                      <img 
                        src={p.image_url} 
                        alt="mini" 
                        className="w-14 h-14 rounded-lg object-contain shadow-sm border border-gray-100 bg-white" 
                      />
                      <div>
                        <p className="font-bold text-gray-900 text-base">{p.title}</p>
                        <p className="text-xs text-gray-500 mt-1 font-medium bg-gray-100 px-2 py-0.5 rounded-full inline-block">
                          Talla {p.size}
                        </p>
                      </div>
                    </td>
                    <td className="p-5 text-gray-600 font-medium">{p.category}</td>
                    <td className="p-5 text-gray-900 font-bold">
                      ${p.price.toLocaleString()}
                      <span className={`block text-xs font-normal mt-1 ${p.stock === 0 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                        Stock: {p.stock} unid.
                      </span>
                    </td>
                    <td className="p-5 text-center">
                      <button 
                        onClick={() => handleToggleAvailability(p.id, p.available)} 
                        title={p.available ? 'Pausar venta' : 'Activar venta'} 
                        className="hover:scale-110 transition-transform"
                      >
                        {p.available 
                          ? <CheckCircle size={24} className="text-emerald-500 mx-auto drop-shadow-sm" /> 
                          : <XCircle size={24} className="text-gray-300 mx-auto" />
                        }
                      </button>
                    </td>
                    <td className="p-5 text-right space-x-3">
                      <button 
                        onClick={() => handleEdit(p)} 
                        className="p-2.5 bg-gray-50 border border-gray-200 text-gray-600 rounded-full hover:text-gold-600 hover:border-gold-600 transition-colors shadow-sm" 
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteProduct(p.id)} 
                        className="p-2.5 bg-gray-50 border border-gray-200 text-gray-600 rounded-full hover:text-red-500 hover:border-red-500 transition-colors shadow-sm" 
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FORMULARIO INVENTARIO */}
      {activeTab === 'inventory' && (
        <form onSubmit={handleSaveProduct} className="max-w-4xl bg-white p-8 md:p-10 rounded-3xl border border-gray-100 shadow-xl grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {editingId && (
            <div className="md:col-span-2 flex justify-between items-center bg-gray-50 p-5 rounded-xl border border-gray-200">
               <div>
                 <span className="text-xs text-gray-500 uppercase font-bold tracking-wider block">Modo Edición</span>
                 <strong className="text-gray-900 text-lg">{prodForm.title}</strong>
               </div>
               <button 
                 type="button" 
                 onClick={resetForm} 
                 className="text-sm font-medium text-gray-600 bg-white border border-gray-200 px-4 py-2 rounded-full hover:bg-gray-100 transition shadow-sm"
               >
                 Cancelar Edición
               </button>
            </div>
          )}

          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Título de la Prenda</label>
            <input 
              type="text" 
              className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl text-sm outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 text-gray-900" 
              value={prodForm.title} 
              onChange={e => setProdForm({...prodForm, title: e.target.value})} 
              required 
            />
          </div>
          
          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Descripción (Opcional)</label>
            <textarea 
              rows="3" 
              className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl text-sm outline-none resize-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 text-gray-900" 
              value={prodForm.description} 
              onChange={e => setProdForm({...prodForm, description: e.target.value})} 
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Categoría</label>
            <input 
              type="text" 
              className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl text-sm outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 text-gray-900" 
              value={prodForm.category} 
              onChange={e => setProdForm({...prodForm, category: e.target.value})} 
              required 
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Talla</label>
            <input 
              type="text" 
              className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl text-sm outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 text-gray-900" 
              value={prodForm.size} 
              onChange={e => setProdForm({...prodForm, size: e.target.value})} 
              required 
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Estado</label>
            <select 
              className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl text-sm outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 text-gray-900" 
              value={prodForm.condition} 
              onChange={e => setProdForm({...prodForm, condition: e.target.value})}
            >
              <option>Como nuevo</option>
              <option>Buen estado</option>
              <option>Vintage / Con detalles</option>
              <option>Nuevo con etiquetas</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Precio</label>
            <input 
              type="number" 
              className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl text-sm outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 text-gray-900" 
              value={prodForm.price} 
              onChange={e => setProdForm({...prodForm, price: e.target.value})} 
              required 
            />
          </div>
          
          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Cantidad Disponible (Stock)</label>
            <input 
              type="number" 
              min="1" 
              className="w-full md:w-1/2 bg-gray-50 border border-gray-200 p-4 rounded-xl text-sm outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 text-gray-900" 
              value={prodForm.stock} 
              onChange={e => setProdForm({...prodForm, stock: Number(e.target.value)})} 
              required 
            />
          </div>

          <div className="md:col-span-2 relative bg-gray-50 border-2 border-gray-200 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center hover:border-gold-500 transition-colors cursor-pointer mt-2 group">
            <input 
              type="file" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
              accept="image/*" 
              onChange={e => setProdForm({...prodForm, file: e.target.files[0]})} 
            />
            <Upload size={40} className="text-gray-300 mb-4 group-hover:text-gold-500 transition-colors" />
            <span className="text-base font-medium text-gray-600 text-center">
              {prodForm.file 
                ? prodForm.file.name 
                : (editingId ? 'Sube nueva foto para reemplazar' : 'Sube la foto aquí')
              }
            </span>
          </div>
          
          <button 
            type="submit" 
            disabled={uploading} 
            className="md:col-span-2 bg-gray-900 text-white font-bold py-5 rounded-xl hover:bg-gold-500 transition-colors disabled:opacity-50 mt-4 shadow-xl"
          >
            {uploading ? 'Guardando...' : (editingId ? 'Guardar Cambios' : 'Publicar Prenda')}
          </button>
        </form>
      )}

      {/* VENTAS */}
      {activeTab === 'sales' && (
        <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-xl">
          <div className="p-6 bg-gray-50 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Historial de Ventas</h2>
              <p className="text-sm text-gray-500">Supervisa tus ganancias totales.</p>
            </div>
            <div className="flex gap-4">
              <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-full text-sm font-bold shadow-sm border border-emerald-100">
                Ingresos: ${sales.reduce((acc, s) => acc + s.total, 0).toLocaleString()}
              </div>
              <button 
                onClick={() => handleDownloadCSV('sales')} 
                className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm font-bold shadow-sm hover:text-emerald-600 hover:border-emerald-300 transition-colors"
              >
                <Download size={16} /> Excel / CSV
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-white border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider text-xs">
                <tr>
                  <th className="p-5">Fecha</th>
                  <th className="p-5">Cliente</th>
                  <th className="p-5">Productos (Cant. y Detalle)</th>
                  <th className="p-5">Total Venta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-10 text-center text-gray-400 font-medium">
                      Aún no hay ventas registradas.
                    </td>
                  </tr>
                ) : sales.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-5 text-gray-500 font-medium">
                      {new Date(s.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-5 font-bold text-gray-900">{s.customer_name}</td>
                    <td className="p-5 text-gray-600">
                      <ul className="list-disc list-inside">
                        {s.items.map((item, idx) => (
                          <li key={idx}>{item.quantity}x {item.title} (Talla {item.size})</li>
                        ))}
                      </ul>
                    </td>
                    <td className="p-5 text-emerald-600 font-bold text-base">
                      ${s.total.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CLIENTES */}
      {activeTab === 'customers' && (
        <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-xl">
          <div className="p-6 bg-gray-50 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Directorio de Clientes</h2>
              <p className="text-sm text-gray-500">Personas que han realizado pedidos.</p>
            </div>
            <button 
              onClick={() => handleDownloadCSV('customers')} 
              className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm font-bold shadow-sm hover:text-gold-600 hover:border-gold-300 transition-colors"
            >
              <Download size={16} /> Excel / CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-white border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider text-xs">
                <tr>
                  <th className="p-5">Fecha</th>
                  <th className="p-5">Nombre y Cédula</th>
                  <th className="p-5">Contacto</th>
                  <th className="p-5">Dirección de Envío</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-10 text-center text-gray-400 font-medium">
                      Aún no tienes clientes registrados.
                    </td>
                  </tr>
                ) : customers.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-5 text-gray-500 text-xs font-medium">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-5">
                      <p className="font-bold text-gray-900 text-base">{c.name}</p>
                      <p className="text-xs text-gray-500 mt-1">C.C. {c.document}</p>
                    </td>
                    <td className="p-5">
                      <a 
                        href={`https://wa.me/${c.phone.replace(/\D/g,'')}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-gold-600 font-bold hover:underline"
                      >
                        {c.phone}
                      </a>
                    </td>
                    <td className="p-5 text-gray-600">
                      <div className="max-w-xs truncate" title={c.address}>{c.address}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AJUSTES */}
      {activeTab === 'settings' && settings && (
        <form onSubmit={handleSettingsUpdate} className="max-w-2xl bg-white p-8 md:p-10 rounded-3xl border border-gray-100 shadow-xl space-y-6">
          <div className="mb-6">
            <h2 className="text-xl font-serif font-bold text-gray-900">Ajustes Generales</h2>
            <p className="text-sm text-gray-500 mt-1">Configura la identidad de tu marca.</p>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
              Nombre de la Marca
            </label>
            <input 
              type="text" 
              className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl text-sm outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 text-gray-900 font-medium" 
              value={settings.brand_name} 
              onChange={e => setSettings({...settings, brand_name: e.target.value})} 
              required 
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
              URL del Logo (Opcional)
            </label>
            <input 
              type="text" 
              placeholder="https://ejemplo.com/logo.png" 
              className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl text-sm outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 text-gray-900 font-medium" 
              value={settings.logo_url || ''} 
              onChange={e => setSettings({...settings, logo_url: e.target.value})} 
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
              Número de WhatsApp de Ventas
            </label>
            <input 
              type="text" 
              placeholder="Ej. 573001234567" 
              className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl text-sm outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 text-gray-900 font-medium" 
              value={settings.whatsapp_number} 
              onChange={e => setSettings({...settings, whatsapp_number: e.target.value})} 
              required 
            />
            <p className="text-xs text-gray-500 mt-2">
              Incluye el código de país sin el símbolo "+".
            </p>
          </div>
          
          <button 
            type="submit" 
            disabled={uploading} 
            className="w-full bg-gray-900 text-white font-bold py-5 rounded-xl hover:bg-gold-500 transition-colors disabled:opacity-50 mt-8 shadow-xl"
          >
            {uploading ? 'Guardando cambios...' : 'Guardar Configuración'}
          </button>
        </form>
      )}
    </div>
  );
}
