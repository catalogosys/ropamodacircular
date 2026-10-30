import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { AppContext } from '../App';
import { Upload, LogOut, FileText, Settings, Archive, Trash2, Edit2, CheckCircle, XCircle } from 'lucide-react';

export default function Admin() {
  const { settings, setSettings } = useContext(AppContext);
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('inventory');
  
  // Estados para inventario
  const [products, setProducts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [prodForm, setProdForm] = useState({ 
    title: '', description: '', size: '', condition: 'Como nuevo', price: '', category: '', file: null, available: true 
  });
  
  // Estados de UI
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchAdminProducts();
    });
    
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchAdminProducts();
    });
  }, []);

  const fetchAdminProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (data) setProducts(data);
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

  const handleLogout = async () => await supabase.auth.signOut();

  const handleCloudinaryUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
    
    const res = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
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
      
      showMessage(editingId ? 'Prenda actualizada' : 'Prenda publicada');
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
    setProdForm({ title: '', description: '', size: '', condition: 'Como nuevo', price: '', category: '', file: null, available: true });
  };

  const handleEdit = (product) => {
    setEditingId(product.id);
    setProdForm({
      title: product.title, description: product.description || '', size: product.size, condition: product.condition,
      price: product.price, category: product.category, available: product.available, image_url: product.image_url, file: null
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
      brand_name: settings.brand_name, logo_url: settings.logo_url, whatsapp_number: settings.whatsapp_number
    }).eq('id', settings.id);
    if (!error) showMessage('Configuración actualizada');
    setUploading(false);
  };

  if (!session) {
    return (
      <div className="max-w-md mx-auto mt-20 bg-neutral-900 p-8 rounded-xl border border-neutral-800 shadow-xl">
        <h2 className="text-2xl font-light mb-6 text-center text-white">Acceso Administrativo</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="email" placeholder="Correo" className="w-full bg-neutral-950 border border-neutral-800 p-3 rounded text-sm outline-none" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="Contraseña" className="w-full bg-neutral-950 border border-neutral-800 p-3 rounded text-sm outline-none" value={password} onChange={e => setPassword(e.target.value)} required />
          <button type="submit" className="w-full bg-white text-black font-medium py-3 rounded hover:bg-neutral-200 transition">Ingresar</button>
        </form>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-light">Panel de Control</h1>
        <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white px-4 py-2 border border-neutral-800 rounded-md"><LogOut size={16} /> Salir</button>
      </div>

      <div className="flex gap-6 border-b border-neutral-800 mb-8 overflow-x-auto">
        {[
          { id: 'inventory', label: editingId ? 'Editando Prenda' : 'Nueva Prenda', icon: Upload },
          { id: 'list', label: 'Mis Prendas', icon: Archive },
          { id: 'settings', label: 'Configuración', icon: Settings },
        ].map(tab => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id); if(tab.id !== 'inventory') resetForm(); }} className={`flex items-center gap-2 pb-3 text-sm font-medium transition-colors ${activeTab === tab.id ? 'text-white border-b-2 border-white' : 'text-neutral-500 hover:text-neutral-300'}`}>
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {message.text && (
        <div className={`mb-6 p-4 border rounded text-sm font-medium ${message.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
          {message.text}
        </div>
      )}

      {activeTab === 'inventory' && (
        <form onSubmit={handleSaveProduct} className="max-w-3xl bg-neutral-900 p-8 rounded-xl border border-neutral-800 grid grid-cols-1 md:grid-cols-2 gap-6">
          {editingId && (
            <div className="md:col-span-2 flex justify-between items-center bg-neutral-950 p-4 rounded-lg border border-neutral-800">
               <span className="text-sm text-neutral-400">Estás editando: <strong className="text-white">{prodForm.title}</strong></span>
               <button type="button" onClick={resetForm} className="text-xs bg-neutral-800 px-3 py-1 rounded hover:bg-neutral-700 transition">Cancelar Edición</button>
            </div>
          )}

          <div className="space-y-1 md:col-span-2">
            <label className="text-xs text-neutral-400">Título de la Prenda</label>
            <input type="text" className="w-full bg-neutral-950 border border-neutral-800 p-3 rounded text-sm outline-none focus:border-white" value={prodForm.title} onChange={e => setProdForm({...prodForm, title: e.target.value})} required />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-xs text-neutral-400">Descripción (Opcional)</label>
            <textarea rows="3" className="w-full bg-neutral-950 border border-neutral-800 p-3 rounded text-sm outline-none resize-none focus:border-white" value={prodForm.description} onChange={e => setProdForm({...prodForm, description: e.target.value})} />
          </div>
          
          <div className="space-y-1"><label className="text-xs text-neutral-400">Categoría</label><input type="text" className="w-full bg-neutral-950 border border-neutral-800 p-3 rounded text-sm outline-none focus:border-white" value={prodForm.category} onChange={e => setProdForm({...prodForm, category: e.target.value})} required /></div>
          <div className="space-y-1"><label className="text-xs text-neutral-400">Talla</label><input type="text" className="w-full bg-neutral-950 border border-neutral-800 p-3 rounded text-sm outline-none focus:border-white" value={prodForm.size} onChange={e => setProdForm({...prodForm, size: e.target.value})} required /></div>
          
          <div className="space-y-1">
            <label className="text-xs text-neutral-400">Estado</label>
            <select className="w-full bg-neutral-950 border border-neutral-800 p-3 rounded text-sm outline-none focus:border-white" value={prodForm.condition} onChange={e => setProdForm({...prodForm, condition: e.target.value})}>
              <option>Como nuevo</option><option>Buen estado</option><option>Vintage / Con detalles</option><option>Nuevo con etiquetas</option>
            </select>
          </div>
          <div className="space-y-1"><label className="text-xs text-neutral-400">Precio</label><input type="number" className="w-full bg-neutral-950 border border-neutral-800 p-3 rounded text-sm outline-none focus:border-white" value={prodForm.price} onChange={e => setProdForm({...prodForm, price: e.target.value})} required /></div>

          <div className="space-y-1 md:col-span-2 flex items-center gap-3 mt-2">
             <input type="checkbox" id="available" checked={prodForm.available} onChange={e => setProdForm({...prodForm, available: e.target.checked})} className="w-4 h-4 accent-white" />
             <label htmlFor="available" className="text-sm text-neutral-300 cursor-pointer">Producto disponible para la venta (Desmárcalo para pausarlo)</label>
          </div>

          <div className="md:col-span-2 relative bg-neutral-950 border-2 border-neutral-800 border-dashed rounded-lg p-10 flex flex-col items-center justify-center hover:border-neutral-500 transition cursor-pointer mt-2">
            <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" accept="image/*" onChange={e => setProdForm({...prodForm, file: e.target.files[0]})} />
            <Upload size={32} className="text-neutral-600 mb-3" />
            <span className="text-sm text-neutral-300 text-center">{prodForm.file ? prodForm.file.name : (editingId ? 'Sube una nueva foto solo si deseas reemplazar la actual' : 'Haz clic o arrastra la foto principal aquí')}</span>
          </div>

          <button type="submit" disabled={uploading} className="md:col-span-2 bg-white text-black font-semibold py-4 rounded-lg hover:bg-neutral-200 transition disabled:opacity-50 mt-4">
            {uploading ? 'Guardando...' : (editingId ? 'Guardar Cambios' : 'Publicar Prenda')}
          </button>
        </form>
      )}

      {activeTab === 'list' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-950 text-neutral-400">
                <tr>
                  <th className="p-4">Producto</th><th className="p-4">Categoría</th><th className="p-4">Precio</th><th className="p-4 text-center">Disponible</th><th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {products.length === 0 ? (
                  <tr><td colSpan="5" className="p-8 text-center text-neutral-500">No hay prendas publicadas.</td></tr>
                ) : products.map(p => (
                  <tr key={p.id} className="hover:bg-neutral-800/50">
                    <td className="p-4 flex items-center gap-3">
                      <img src={p.image_url} alt="mini" className="w-12 h-12 rounded object-cover" />
                      <div>
                        <p className="font-medium text-white">{p.title}</p>
                        <p className="text-xs text-neutral-500">Talla: {p.size} | {p.condition}</p>
                      </div>
                    </td>
                    <td className="p-4 text-neutral-300">{p.category}</td>
                    <td className="p-4 text-neutral-300">${p.price.toLocaleString()}</td>
                    <td className="p-4 text-center">
                      <button onClick={() => handleToggleAvailability(p.id, p.available)} title={p.available ? 'Pausar' : 'Activar'}>
                        {p.available ? <CheckCircle size={20} className="text-emerald-500 mx-auto" /> : <XCircle size={20} className="text-neutral-600 mx-auto" />}
                      </button>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button onClick={() => handleEdit(p)} className="p-2 bg-neutral-950 rounded hover:text-blue-400 transition" title="Editar"><Edit2 size={16} /></button>
                      <button onClick={() => handleDeleteProduct(p.id)} className="p-2 bg-neutral-950 rounded hover:text-red-400 transition" title="Eliminar"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'settings' && settings && (
        <form onSubmit={handleSettingsUpdate} className="max-w-2xl bg-neutral-900 p-8 rounded-xl border border-neutral-800 space-y-6">
          <div className="text-xl font-light border-b border-neutral-800 pb-4 mb-2">Configuración de la Tienda</div>
          
          <div className="space-y-2">
            <label className="text-sm text-neutral-300 font-medium">Nombre de la Marca</label>
            <input type="text" className="w-full bg-neutral-950 border border-neutral-800 p-3 rounded-lg text-sm focus:border-white outline-none" value={settings.brand_name} onChange={e => setSettings({...settings, brand_name: e.target.value})} required />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm text-neutral-300 font-medium">URL del Logo (Opcional)</label>
            <input type="text" placeholder="https://ejemplo.com/logo.png" className="w-full bg-neutral-950 border border-neutral-800 p-3 rounded-lg text-sm focus:border-white outline-none" value={settings.logo_url || ''} onChange={e => setSettings({...settings, logo_url: e.target.value})} />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm text-neutral-300 font-medium">Número de WhatsApp</label>
            <input type="text" placeholder="Ej. 573001234567" className="w-full bg-neutral-950 border border-neutral-800 p-3 rounded-lg text-sm focus:border-white outline-none" value={settings.whatsapp_number} onChange={e => setSettings({...settings, whatsapp_number: e.target.value})} required />
          </div>
          
          <button type="submit" disabled={uploading} className="w-full bg-white text-black font-semibold py-4 rounded-lg hover:bg-neutral-200 transition disabled:opacity-50 mt-4">
            {uploading ? 'Guardando cambios...' : 'Guardar Configuración'}
          </button>
        </form>
      )}
    </div>
  );
}