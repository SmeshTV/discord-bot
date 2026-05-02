import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, DollarSign, Search, Plus, Edit3, Trash2, TrendingUp, ShoppingCart, Loader2, X, Save } from 'lucide-react';

const ShopTab = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [statistics, setStatistics] = useState({
    totalProducts: 0,
    activeProducts: 0,
    totalSales: 0,
    totalRevenue: 0,
  });
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: 99,
    icon: '🍄',
    category: 'mushrooms',
    is_active: true,
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    const mockProducts = [
      { id: '1', name: 'Грибы x100', price: 99, icon: '🍄', category: 'mushrooms', sales: 234, is_active: true },
      { id: '2', name: 'Грибы x500', price: 399, icon: '🍄', category: 'mushrooms', sales: 89, is_active: true },
      { id: '3', name: 'Грибы x1000', price: 699, icon: '🍄', category: 'mushrooms', sales: 45, is_active: true },
      { id: '4', name: 'Рандомная роль', price: 249, icon: '🎁', category: 'roles', sales: 67, is_active: true },
      { id: '5', name: 'VIP на 30 дней', price: 199, icon: '⭐', category: 'roles', sales: 34, is_active: true },
    ];
    
    setProducts(mockProducts);
    setStatistics({
      totalProducts: mockProducts.length,
      activeProducts: mockProducts.filter(p => p.is_active).length,
      totalSales: mockProducts.reduce((acc, p) => acc + p.sales, 0),
      totalRevenue: mockProducts.reduce((acc, p) => acc + p.sales * p.price, 0),
    });
    setLoading(false);
  };

  const handleToggleActive = (productId: string) => {
    setProducts(products.map(p => {
      if (p.id === productId) {
        const updated = { ...p, is_active: !p.is_active };
        return updated;
      }
      return p;
    }));
    
    const activeCount = products.filter(p => p.id === productId ? !p.is_active : p.is_active).length;
    setStatistics(prev => ({ ...prev, activeProducts: activeCount }));
  };

  const handleDeleteProduct = (productId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот товар?')) return;
    setProducts(products.filter(p => p.id !== productId));
    setStatistics(prev => ({ 
      totalProducts: prev.totalProducts - 1,
      activeProducts: prev.activeProducts - (products.find(p => p.id === productId)?.is_active ? 1 : 0),
      totalSales: prev.totalSales - (products.find(p => p.id === productId)?.sales || 0),
      totalRevenue: prev.totalRevenue - ((products.find(p => p.id === productId)?.sales || 0) * (products.find(p => p.id === productId)?.price || 0)),
    }));
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(search.toLowerCase());
    if (filter === 'all') return matchesSearch;
    if (filter === 'active') return matchesSearch && p.is_active;
    if (filter === 'inactive') return matchesSearch && !p.is_active;
    if (filter === 'mushrooms') return matchesSearch && p.category === 'mushrooms';
    if (filter === 'roles') return matchesSearch && p.category === 'roles';
    if (filter === 'custom') return matchesSearch && p.category === 'custom';
    return matchesSearch;
  });

  const handleAddProduct = () => {
    if (!newProduct.name.trim()) return;
    
    const newId = String(products.length + 1);
    const product = {
      id: newId,
      name: newProduct.name,
      description: newProduct.description,
      price: newProduct.price,
      icon: newProduct.icon,
      category: newProduct.category,
      is_active: newProduct.is_active,
      sales: 0,
    };
    
    setProducts([...products, product]);
    setStatistics(prev => ({
      totalProducts: prev.totalProducts + 1,
      activeProducts: prev.activeProducts + (newProduct.is_active ? 1 : 0),
      totalSales: prev.totalSales,
      totalRevenue: prev.totalRevenue,
    }));
    
    setNewProduct({ name: '', description: '', price: 99, icon: '🍄', category: 'mushrooms', is_active: true });
    setShowAddModal(false);
  };

  const handleUpdateProduct = () => {
    if (!selectedProduct) return;
    
    setProducts(products.map(p => p.id === selectedProduct.id ? selectedProduct : p));
    setShowEditModal(false);
    setSelectedProduct(null);
  };

  const categoryLabels: { [key: string]: string } = {
    mushrooms: 'Грибы',
    roles: 'Роли',
    custom: 'Кастом',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-purple-500" size={40} />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-900/30 to-gray-900 p-5 rounded-2xl border border-green-500/20">
          <DollarSign className="text-green-400 mb-3" size={24} />
          <p className="text-2xl font-bold text-green-400">{statistics.totalRevenue.toLocaleString('ru')}₽</p>
          <p className="text-gray-400 text-sm">Выручка</p>
        </div>
        <div className="bg-gradient-to-br from-purple-900/30 to-gray-900 p-5 rounded-2xl border border-purple-500/20">
          <ShoppingCart className="text-purple-400 mb-3" size={24} />
          <p className="text-2xl font-bold text-purple-400">{statistics.totalSales}</p>
          <p className="text-gray-400 text-sm">Продаж</p>
        </div>
        <div className="bg-gradient-to-br from-blue-900/30 to-gray-900 p-5 rounded-2xl border border-blue-500/20">
          <TrendingUp className="text-blue-400 mb-3" size={24} />
          <p className="text-2xl font-bold text-blue-400">+12%</p>
          <p className="text-gray-400 text-sm">Рост</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-900/30 to-gray-900 p-5 rounded-2xl border border-yellow-500/20">
          <Package className="text-yellow-400 mb-3" size={24} />
          <p className="text-2xl font-bold text-yellow-400">{statistics.activeProducts}</p>
          <p className="text-gray-400 text-sm">Активных товаров</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Поиск товара..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { id: 'all', label: 'Все' },
            { id: 'mushrooms', label: 'Грибы' },
            { id: 'roles', label: 'Роли' },
            { id: 'custom', label: 'Кастом' },
            { id: 'active', label: 'Активные' },
            { id: 'inactive', label: 'Неактивные' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-2 rounded-xl transition-colors ${
                filter === f.id 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-xl transition-colors"
        >
          <Plus size={18} />
          Добавить
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((product, i) => (
          <motion.div 
            key={product.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className={`bg-gradient-to-br from-gray-800 to-gray-900 p-5 rounded-2xl border border-gray-700/50 hover:border-purple-500/30 transition-all group ${!product.is_active ? 'opacity-50' : ''}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-2xl">
                  {product.icon || '📦'}
                </div>
                <div>
                  <h3 className="font-bold">{product.name}</h3>
                  <p className="text-gray-400 text-sm">{categoryLabels[product.category] || product.category}</p>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => { setSelectedProduct({ ...product }); setShowEditModal(true); }}
                  className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white"
                >
                  <Edit3 size={16} />
                </button>
                <button 
                  onClick={() => handleDeleteProduct(product.id)}
                  className="p-2 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl font-bold text-green-400">{product.price}₽</span>
              <button
                onClick={() => handleToggleActive(product.id)}
                className={`px-3 py-1 rounded-full text-xs ${product.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}
              >
                {product.is_active ? 'Активен' : 'Неактивен'}
              </button>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-400">
              <span>{product.sales || 0} продаж</span>
              <TrendingUp size={14} className="text-green-400" />
            </div>
          </motion.div>
        ))}

        {filteredProducts.length === 0 && (
          <div className="col-span-2 text-center py-12 text-gray-500">
            <Package size={48} className="mx-auto mb-4 opacity-50" />
            <p>То��ар�� не найдены</p>
          </div>
        )}
      </div>

      {showAddModal && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700 p-6 max-w-md w-full"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Добавить товар</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm">Название</label>
                <input
                  type="text"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  placeholder="Грибы x100..."
                  className="w-full bg-gray-700 border border-gray-600 rounded-xl py-2 px-3 text-white mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm">Цена</label>
                  <input
                    type="number"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: parseInt(e.target.value) || 0 })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-xl py-2 px-3 text-white mt-1"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm">Катего��ия</label>
                  <select
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-xl py-2 px-3 text-white mt-1"
                  >
                    <option value="mushrooms">Грибы</option>
                    <option value="roles">Роли</option>
                    <option value="custom">Кастом</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-gray-400 text-sm">Иконка (эмодзи)</label>
                <input
                  type="text"
                  value={newProduct.icon}
                  onChange={(e) => setNewProduct({ ...newProduct, icon: e.target.value })}
                  placeholder="🍄"
                  className="w-full bg-gray-700 border border-gray-600 rounded-xl py-2 px-3 text-white mt-1"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-xl">
                <span>Активен</span>
                <button
                  onClick={() => setNewProduct({ ...newProduct, is_active: !newProduct.is_active })}
                  className={`w-12 h-6 rounded-full transition-colors ${newProduct.is_active ? 'bg-green-500' : 'bg-gray-600'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${newProduct.is_active ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleAddProduct}
                disabled={!newProduct.name.trim()}
                className="flex-1 py-3 bg-green-600 hover:bg-green-700 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                Добавить
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {showEditModal && selectedProduct && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700 p-6 max-w-md w-full"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Редактировать товар</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm">Название</label>
                <input
                  type="text"
                  value={selectedProduct.name}
                  onChange={(e) => setSelectedProduct({ ...selectedProduct, name: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-xl py-2 px-3 text-white mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm">Цена</label>
                  <input
                    type="number"
                    value={selectedProduct.price}
                    onChange={(e) => setSelectedProduct({ ...selectedProduct, price: parseInt(e.target.value) || 0 })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-xl py-2 px-3 text-white mt-1"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm">Категория</label>
                  <select
                    value={selectedProduct.category}
                    onChange={(e) => setSelectedProduct({ ...selectedProduct, category: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-xl py-2 px-3 text-white mt-1"
                  >
                    <option value="mushrooms">Грибы</option>
                    <option value="roles">Роли</option>
                    <option value="custom">Кастом</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-xl">
                <span>Активен</span>
                <button
                  onClick={() => setSelectedProduct({ ...selectedProduct, is_active: !selectedProduct.is_active })}
                  className={`w-12 h-6 rounded-full transition-colors ${selectedProduct.is_active ? 'bg-green-500' : 'bg-gray-600'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${selectedProduct.is_active ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleUpdateProduct}
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Save size={20} />
                Сохранить
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default ShopTab;