import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Upload, 
  Edit3, 
  X, 
  UtensilsCrossed,
  ChefHat,
  Search,
  Check,
  MessageCircle,
  Printer,
  ChevronRight,
  ChevronDown,
  ShoppingBag,
  Cloud,
  CheckCircle
} from 'lucide-react';
import { Product, Order, OrderItem, Settings } from './types';
import { cloudSync, DEFAULT_SETTINGS, DEFAULT_PRODUCTS, DEFAULT_ORDERS } from './firebase';

export default function App() {
  // Abas: Início | Comandas | Nova Comanda | Configurações
  const [activeTab, setActiveTab] = useState<'home' | 'orders' | 'new-order' | 'settings'>('home');
  
  // Dados sincronizados
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS);
  const [orders, setOrders] = useState<Order[]>(DEFAULT_ORDERS);

  // Estado para Criar Nova Comanda (Aba Nova Comanda)
  const [newOrderTable, setNewOrderTable] = useState('Mesa 01');
  const [newOrderCustomer, setNewOrderCustomer] = useState('');
  const [newOrderCart, setNewOrderCart] = useState<OrderItem[]>([]);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('Todos');
  const [searchMenuQuery, setSearchMenuQuery] = useState('');

  // Modal para Lançar Itens em Comanda JÁ ABERTA
  const [orderToEditItems, setOrderToEditItems] = useState<Order | null>(null);
  const [selectedProdForExisting, setSelectedProdForExisting] = useState<Product | null>(null);
  const [existingOrderQty, setExistingOrderQty] = useState(1);
  const [existingOrderNotes, setExistingOrderNotes] = useState('');

  // Modal / Edição de Produto (Configurações)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodCategory, setProdCategory] = useState('Pratos Principais');
  const [prodDescription, setProdDescription] = useState('');
  const [prodImageUrl, setProdImageUrl] = useState('');
  const [isUploadingProdImage, setIsUploadingProdImage] = useState(false);

  // Configurações da Empresa
  const [companyNameInput, setCompanyNameInput] = useState('');
  const [companyLogoInput, setCompanyLogoInput] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [settingsSaveSuccess, setSettingsSaveSuccess] = useState(false);

  // Configurações Firebase na Nuvem
  const [firebaseJsonInput, setFirebaseJsonInput] = useState('');
  const [isCloudConnected, setIsCloudConnected] = useState(cloudSync.isConnected);
  const [cloudConnectSuccess, setCloudConnectSuccess] = useState(false);

  const fileInputLogoRef = useRef<HTMLInputElement>(null);
  const fileInputProdRef = useRef<HTMLInputElement>(null);
  const cartSummaryRef = useRef<HTMLDivElement>(null);

  // 1. SINCRONIZAÇÃO EM TEMPO REAL (FIREBASE / LOCAL)
  useEffect(() => {
    // Escuta em tempo real comandas
    const unsubOrders = cloudSync.subscribeOrders((updatedOrders) => {
      setOrders(updatedOrders);
    });

    // Escuta pratos
    const unsubProducts = cloudSync.subscribeProducts((updatedProducts) => {
      setProducts(updatedProducts);
    });

    // Escuta configurações
    const unsubSettings = cloudSync.subscribeSettings((updatedSettings) => {
      setSettings(updatedSettings);
    });

    // Se houver config salva de Firebase, preenche
    const savedConf = cloudSync.getSavedConfig();
    if (savedConf) {
      setFirebaseJsonInput(JSON.stringify(savedConf, null, 2));
    }

    setIsCloudConnected(cloudSync.isConnected);

    return () => {
      unsubOrders();
      unsubProducts();
      unsubSettings();
    };
  }, []);

  useEffect(() => {
    if (settings.restaurantName) setCompanyNameInput(settings.restaurantName);
    if (settings.logoUrl) setCompanyLogoInput(settings.logoUrl);
  }, [settings]);

  // Cálculos do Painel Inicial
  const activeOrders = orders.filter(o => o.status !== 'Finalizada');
  const closedOrders = orders.filter(o => o.status === 'Finalizada');
  // Faturamento do dia considera ESTRITAMENTE as comandas fechadas/finalizadas
  const closedRevenue = closedOrders.reduce((acc, order) => acc + (order.total || 0), 0);
  const pendingRevenue = activeOrders.reduce((acc, order) => acc + (order.total || 0), 0);

  // Upload Helper (Converte em Base64 Data URL)
  const handleFileUpload = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.readAsDataURL(file);
    });
  };

  // --- NOVA COMANDA: Manipulação do Carrinho ---
  const handleAddToCart = (product: Product) => {
    const existingIndex = newOrderCart.findIndex(item => item.id === product.id);
    if (existingIndex >= 0) {
      const updated = [...newOrderCart];
      updated[existingIndex].qty += 1;
      setNewOrderCart(updated);
    } else {
      setNewOrderCart([...newOrderCart, {
        id: product.id,
        name: product.name,
        price: product.price,
        qty: 1,
        notes: ''
      }]);
    }
  };

  const handleUpdateCartQty = (productId: string, delta: number) => {
    const updated = newOrderCart.map(item => {
      if (item.id === productId) {
        return { ...item, qty: item.qty + delta };
      }
      return item;
    }).filter(item => item.qty > 0);
    setNewOrderCart(updated);
  };

  const handleUpdateCartNotes = (productId: string, notes: string) => {
    const updated = newOrderCart.map(item => {
      if (item.id === productId) return { ...item, notes };
      return item;
    });
    setNewOrderCart(updated);
  };

  const handleConfirmCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderTable.trim()) {
      alert('Por favor informe a Mesa ou Identificação da comanda.');
      return;
    }
    if (newOrderCart.length === 0) {
      alert('Adicione pelo menos 1 item do cardápio à comanda.');
      return;
    }

    // Extrai o número da mesa em sequência (ex: Mesa 01 -> *001, Mesa 2 -> *002)
    const match = newOrderTable.match(/\d+/);
    let orderNum = 1;
    if (match) {
      orderNum = parseInt(match[0], 10);
    } else {
      orderNum = orders.length + 1;
    }
    const orderCode = `*${String(orderNum).padStart(3, '0')}`;

    const total = newOrderCart.reduce((acc, item) => acc + (item.price * item.qty), 0);
    const newOrder: Order = {
      id: 'cmd-' + Date.now(),
      orderCode,
      table: newOrderTable.trim(),
      customer: newOrderCustomer.trim(),
      status: 'Aberta',
      items: [...newOrderCart],
      total,
      createdAt: new Date().toISOString()
    };

    await cloudSync.saveOrder(newOrder);
    setNewOrderCart([]);
    setNewOrderCustomer('');
    // Atualiza a sugestão para a próxima mesa em sequência
    const nextNum = String(orderNum + 1).padStart(2, '0');
    setNewOrderTable(`Mesa ${nextNum}`);
    setActiveTab('orders'); // Redireciona para lista de comandas
  };

  // --- AÇÕES NAS COMANDAS EXISTENTES ---
  const handleUpdateOrderStatus = async (order: Order, newStatus: Order['status']) => {
    const updated = { ...order, status: newStatus };
    await cloudSync.saveOrder(updated);
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Deseja realmente excluir esta comanda?')) return;
    await cloudSync.deleteOrder(orderId);
  };

  // Lançar ou Incrementar Item em Comanda Aberta (Agrupa itens idênticos no mesmo lugar)
  const handleAddItemToExistingOrder = async () => {
    if (!orderToEditItems || !selectedProdForExisting) return;

    // Verificar se o item já existe na comanda (pelo ID ou pelo Nome)
    const existingIndex = orderToEditItems.items.findIndex(
      it => it.id === selectedProdForExisting.id || it.name.trim().toLowerCase() === selectedProdForExisting.name.trim().toLowerCase()
    );

    const updatedItems = [...orderToEditItems.items];

    if (existingIndex >= 0) {
      // Já existe! Soma na quantidade que já está lá em cima (não cria linha duplicada)
      const item = updatedItems[existingIndex];
      const newQty = item.qty + existingOrderQty;
      const combinedNotes = existingOrderNotes.trim()
        ? (item.notes ? `${item.notes} | ${existingOrderNotes.trim()}` : existingOrderNotes.trim())
        : item.notes;

      updatedItems[existingIndex] = {
        ...item,
        qty: newQty,
        notes: combinedNotes
      };
    } else {
      // Não existia ainda: adiciona novo item
      const newItem: OrderItem = {
        id: selectedProdForExisting.id,
        name: selectedProdForExisting.name,
        price: selectedProdForExisting.price,
        qty: existingOrderQty,
        notes: existingOrderNotes.trim()
      };
      updatedItems.push(newItem);
    }

    const updatedTotal = updatedItems.reduce((acc, item) => acc + (item.price * item.qty), 0);
    const updatedOrder: Order = {
      ...orderToEditItems,
      items: updatedItems,
      total: updatedTotal
    };

    await cloudSync.saveOrder(updatedOrder);
    setOrderToEditItems(updatedOrder);
    setSelectedProdForExisting(null);
    setExistingOrderQty(1);
    setExistingOrderNotes('');
  };

  // Alterar quantidade direta de um item já lançado na comanda (+1 / -1)
  const handleUpdateExistingOrderItemQty = async (order: Order, itemIdx: number, delta: number) => {
    const updatedItems = [...order.items];
    const item = updatedItems[itemIdx];
    if (!item) return;

    const newQty = item.qty + delta;
    if (newQty <= 0) {
      // Remover se quantidade zerar
      updatedItems.splice(itemIdx, 1);
    } else {
      updatedItems[itemIdx] = { ...item, qty: newQty };
    }

    const updatedTotal = updatedItems.reduce((acc, it) => acc + (it.price * it.qty), 0);
    const updatedOrder: Order = { ...order, items: updatedItems, total: updatedTotal };

    await cloudSync.saveOrder(updatedOrder);
    if (orderToEditItems?.id === order.id) setOrderToEditItems(updatedOrder);
  };

  const handleRemoveItemFromExistingOrder = async (order: Order, itemIdx: number) => {
    const updatedItems = [...order.items];
    updatedItems.splice(itemIdx, 1);
    const updatedTotal = updatedItems.reduce((acc, item) => acc + (item.price * item.qty), 0);
    const updatedOrder: Order = { ...order, items: updatedItems, total: updatedTotal };

    await cloudSync.saveOrder(updatedOrder);
    if (orderToEditItems?.id === order.id) setOrderToEditItems(updatedOrder);
  };

  // WhatsApp e Impressão
  const handleShareWhatsApp = (order: Order) => {
    let msg = `*${settings.restaurantName}*\n`;
    msg += `🧾 *Comanda ${order.orderCode} - ${order.table}*\n`;
    if (order.customer) msg += `👤 Cliente: ${order.customer}\n`;
    msg += `--------------------------------\n`;
    order.items.forEach(it => {
      msg += `• ${it.qty}x ${it.name} - R$ ${(it.price * it.qty).toFixed(2).replace('.', ',')}\n`;
      if (it.notes) msg += `   ↳ Obs: ${it.notes}\n`;
    });
    msg += `--------------------------------\n`;
    msg += `*TOTAL: R$ ${order.total.toFixed(2).replace('.', ',')}*\n`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handlePrintReceipt = (order: Order) => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Comanda ${order.orderCode}</title>
          <style>
            body { font-family: monospace; padding: 20px; max-width: 320px; margin: 0 auto; }
            .center { text-align: center; }
            .line { border-bottom: 1px dashed #000; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; margin: 4px 0; }
          </style>
        </head>
        <body onload="window.print()">
          <div class="center">
            <h3>${settings.restaurantName}</h3>
            <p>Comanda ${order.orderCode} - ${order.table}</p>
            ${order.customer ? `<p>Cliente: ${order.customer}</p>` : ''}
            <p>${new Date(order.createdAt).toLocaleString('pt-BR')}</p>
          </div>
          <div class="line"></div>
          ${order.items.map(it => `
            <div class="row">
              <span>${it.qty}x ${it.name}</span>
              <span>R$ ${(it.price * it.qty).toFixed(2).replace('.', ',')}</span>
            </div>
            ${it.notes ? `<small style="font-style:italic">↳ ${it.notes}</small>` : ''}
          `).join('')}
          <div class="line"></div>
          <div class="row" style="font-weight: bold; font-size: 16px;">
            <span>TOTAL:</span>
            <span>R$ ${order.total.toFixed(2).replace('.', ',')}</span>
          </div>
        </body>
      </html>
    `);
    win.document.close();
  };

  // --- CONFIGURAÇÕES: PRODUTOS E IDENTIDADE ---
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim() || !prodPrice) return;

    const newProd: Product = {
      id: editingProductId || 'prod-' + Date.now(),
      name: prodName.trim(),
      price: parseFloat(prodPrice.replace(',', '.')) || 0,
      category: prodCategory.trim() || 'Pratos Principais',
      description: prodDescription.trim(),
      image: prodImageUrl.trim()
    };

    await cloudSync.saveProduct(newProd);
    setIsProductModalOpen(false);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Excluir este prato do cardápio?')) return;
    await cloudSync.deleteProduct(id);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Settings = {
      restaurantName: companyNameInput.trim() || 'Delícias da Rita',
      logoUrl: companyLogoInput.trim() || '/logo-rita.png'
    };
    await cloudSync.saveSettings(payload);
    setSettings(payload);
    setSettingsSaveSuccess(true);
    setTimeout(() => setSettingsSaveSuccess(false), 3000);
  };

  const handleSaveFirebaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const config = JSON.parse(firebaseJsonInput);
      const ok = cloudSync.saveConfig(config);
      setIsCloudConnected(ok);
      setCloudConnectSuccess(true);
      setTimeout(() => setCloudConnectSuccess(false), 3000);
      alert(ok ? 'Nuvem Firebase conectada com sucesso! Sincronização 24h ativada.' : 'Erro ao inicializar Firebase. Verifique o JSON.');
    } catch {
      alert('Formato JSON inválido. Certifique-se de colar o código completo entre chaves { }');
    }
  };

  // Categorias do Cardápio
  const categories = ['Todos', ...Array.from(new Set(products.map(p => p.category)))];
  const filteredProducts = products.filter(p => {
    const matchCat = activeCategoryFilter === 'Todos' || p.category === activeCategoryFilter;
    const matchSearch = p.name.toLowerCase().includes(searchMenuQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchMenuQuery.toLowerCase()));
    return matchCat && matchSearch;
  });

  return (
    <div className="min-h-screen bg-[#111215] text-[#edeef0] flex flex-col font-sans selection:bg-[#e28c38] selection:text-black">
      
      {/* ========================================================
          CABEÇALHO SUPERIOR (Fiel à Imagem de Referência)
         ======================================================== */}
      <header className="bg-[#121418] border-b border-[#2d251e] sticky top-0 z-50 px-4 sm:px-8 py-2.5 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo Redonda Pequena no Topo Esquerdo */}
          <div 
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-full overflow-hidden border border-[#e28c38]/60 shadow-sm bg-black flex-shrink-0 transition-transform group-hover:scale-105">
              <img 
                src={settings.logoUrl || '/logo-rita.png'} 
                alt="Logo Delícias da Rita" 
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
              />
            </div>
            <span className="hidden sm:inline font-bold text-sm tracking-wide text-[#e7d7be] group-hover:text-[#e28c38] transition-colors">
              {settings.restaurantName}
            </span>
          </div>

          {/* Menu de Navegação Horizontal */}
          <nav className="flex items-center gap-5 sm:gap-8 text-xs sm:text-sm font-medium">
            <button
              onClick={() => setActiveTab('home')}
              className={`pb-1 transition-all ${
                activeTab === 'home'
                  ? 'text-[#e28c38] font-bold border-b-2 border-[#e28c38]'
                  : 'text-[#d4c3ab] hover:text-white'
              }`}
            >
              Início
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`pb-1 transition-all flex items-center gap-1.5 ${
                activeTab === 'orders'
                  ? 'text-[#e28c38] font-bold border-b-2 border-[#e28c38]'
                  : 'text-[#d4c3ab] hover:text-white'
              }`}
            >
              <span>Comandas</span>
              {activeOrders.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-[#e28c38] animate-pulse"></span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('new-order')}
              className={`pb-1 transition-all ${
                activeTab === 'new-order'
                  ? 'text-[#e28c38] font-bold border-b-2 border-[#e28c38]'
                  : 'text-[#d4c3ab] hover:text-white'
              }`}
            >
              Nova Comanda
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`pb-1 transition-all ${
                activeTab === 'settings'
                  ? 'text-[#e28c38] font-bold border-b-2 border-[#e28c38]'
                  : 'text-[#d4c3ab] hover:text-white'
              }`}
            >
              Configurações
            </button>
          </nav>

        </div>
      </header>

      {/* ========================================================
          ABA 1: INÍCIO (Layout Exato da Foto Enviada)
         ======================================================== */}
      {activeTab === 'home' && (
        <section className="flex-1 flex flex-col">
          
          {/* BANNER PRINCIPAL COM FUNDO DE COMIDA E BUFFET */}
          <div className="relative w-full overflow-hidden bg-[#18191e] border-b border-[#25201a]">
            
            {/* Imagem de Fundo (Mesas e Buffet de Almoço) */}
            <div className="relative w-full h-[360px] sm:h-[460px] md:h-[500px]">
              <img 
                src="/bg-hero.jpg" 
                alt="Buffet Delícias da Rita" 
                decoding="async"
                className="w-full h-full object-cover object-center filter brightness-[0.78]"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/delicias-da-rita.jpg';
                }}
              />
              
              {/* Gradientes e Iluminação Cinematográfica */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#111215] via-transparent to-black/30"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/20"></div>

              {/* MEDALHÃO / LOGO GRANDE CIRCULAR (Posicionado à Esquerda) */}
              <div className="absolute left-4 sm:left-10 md:left-16 top-6 sm:top-10 z-10">
                <div className="w-44 h-44 sm:w-64 sm:h-64 md:w-80 md:h-80 rounded-full overflow-hidden border-[4px] sm:border-[6px] border-[#d97c27] shadow-[0_15px_40px_rgba(0,0,0,0.85)] bg-[#fcf8f0] transform hover:scale-[1.02] transition-transform">
                  <img 
                    src={settings.logoUrl || '/logo-rita.png'} 
                    alt="Logo Delícias da Rita" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/delicias-da-rita.jpg';
                    }}
                  />
                </div>
              </div>
            </div>

            {/* SEÇÃO DOS DOIS CARDS (Fiel à foto: Comandas e Criar Nova Comanda) */}
            <div className="max-w-4xl mx-auto px-4 -mt-14 sm:-mt-20 relative z-20 pb-12">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                
                {/* CARD 1: COMANDAS (Abertas, Fechadas, Total Gerado) */}
                <div 
                  onClick={() => setActiveTab('orders')}
                  className="bg-[#181a20]/95 backdrop-blur-md rounded-2xl p-5 border border-[#3b3127] shadow-2xl hover:border-[#e28c38]/60 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-[#e8d8be] tracking-wide mb-2.5">
                      Comandas
                    </h3>
                    
                    {/* Linha Divisória Fina */}
                    <div className="w-full h-[1px] bg-[#3e342a] mb-3"></div>

                    {/* Marcadores de Abertas e Fechadas */}
                    <div className="space-y-1.5 text-xs sm:text-sm font-medium">
                      <div className="flex items-center gap-2 text-[#e28c38]">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#e28c38]"></span>
                        <span>Abertas: <strong className="text-white font-bold">{activeOrders.length}</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-[#d4c3ab]">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#c5a059]"></span>
                        <span>Fechadas: <strong className="text-white font-bold">{closedOrders.length}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Total Gerado em Destaque */}
                  <div className="mt-5 pt-3 border-t border-[#312921] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#a99882]">Faturamento do Dia:</span>
                      <span className="text-base sm:text-lg font-extrabold text-[#e28c38] font-mono">
                        R$ {closedRevenue.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                    {pendingRevenue > 0 && (
                      <div className="flex items-center justify-between text-[11px] text-[#7d7162]">
                        <span>A receber (mesas abertas):</span>
                        <span className="font-mono text-[#d4c3ab]">R$ {pendingRevenue.toFixed(2).replace('.', ',')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* CARD 2: CRIAR NOVA COMANDA */}
                <div 
                  onClick={() => setActiveTab('new-order')}
                  className="bg-[#181a20]/95 backdrop-blur-md rounded-2xl p-6 border border-[#3b3127] shadow-2xl hover:border-[#e28c38] hover:bg-[#1f222a] transition-all cursor-pointer group flex flex-col items-center justify-center text-center min-h-[160px]"
                >
                  <div className="w-12 h-12 rounded-full bg-[#2a241e] border border-[#e28c38]/40 flex items-center justify-center text-[#e28c38] mb-3 group-hover:scale-110 group-hover:bg-[#e28c38] group-hover:text-black transition-all">
                    <Plus className="w-7 h-7" strokeWidth={2.5} />
                  </div>
                  <span className="text-sm sm:text-base font-bold text-[#e8d8be] group-hover:text-white transition-colors">
                    Criar Nova Comanda
                  </span>
                  <span className="text-[11px] text-[#8e8070] mt-1">
                    Abrir mesa e lançar pedidos
                  </span>
                </div>

              </div>
            </div>

          </div>

          {/* Destaque das Comandas Abertas Recentes */}
          <div className="max-w-5xl mx-auto w-full px-4 py-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#d4c3ab] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#e28c38] animate-pulse"></span>
                Atendimento em Tempo Real ({activeOrders.length})
              </h2>
              <button 
                onClick={() => setActiveTab('orders')}
                className="text-xs text-[#e28c38] hover:underline flex items-center gap-1"
              >
                Ver todas <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {activeOrders.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#16181e] border border-[#26221c] text-center text-xs text-[#7e7264]">
                Nenhuma mesa aberta no momento. Clique em <strong>Criar Nova Comanda</strong> acima para iniciar.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {activeOrders.slice(0, 3).map(order => (
                  <div 
                    key={order.id}
                    onClick={() => setActiveTab('orders')}
                    className="p-4 rounded-xl bg-[#16181e] border border-[#2d251d] hover:border-[#e28c38]/50 transition-all cursor-pointer flex justify-between items-center"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{order.table}</span>
                        <span className="text-[11px] font-mono text-[#e28c38]">{order.orderCode}</span>
                      </div>
                      <p className="text-[11px] text-[#8e8070]">{order.items.length} item(ns) lançados</p>
                    </div>
                    <span className="font-mono font-bold text-[#e28c38] text-sm">
                      R$ {order.total.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </section>
      )}

      {/* ========================================================
          ABA 2: COMANDAS (Acompanhamento e Gerenciamento)
         ======================================================== */}
      {activeTab === 'orders' && (
        <section className="max-w-6xl mx-auto w-full px-4 py-8 flex-1">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-[#e8d8be] flex items-center gap-2">
                <span>Controle de Comandas & Mesas</span>
              </h2>
              <p className="text-xs text-[#8e8070]">Sincronizado ao vivo entre todos os celulares e computadores</p>
            </div>

            <button
              onClick={() => setActiveTab('new-order')}
              className="px-4 py-2 rounded-xl bg-[#e28c38] hover:bg-[#d07b28] text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nova Comanda</span>
            </button>
          </div>

          {/* Grid de Comandas */}
          {orders.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#16181e] border border-[#2d251d] text-[#8e8070]">
              <UtensilsCrossed className="w-10 h-10 mx-auto mb-2 opacity-40 text-[#e28c38]" />
              <p className="text-sm font-semibold text-[#e8d8be]">Nenhuma comanda registrada</p>
              <p className="text-xs mt-1">Clique em "Nova Comanda" para abrir a primeira mesa.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {orders.map(order => {
                const isClosed = order.status === 'Finalizada';
                const isReady = order.status === 'Pronta';

                return (
                  <div 
                    key={order.id}
                    className={`rounded-2xl p-4.5 border flex flex-col justify-between transition-all ${
                      isClosed 
                        ? 'bg-[#14151a]/60 border-[#24221f] opacity-65'
                        : isReady
                          ? 'bg-[#181a20] border-emerald-500/40 shadow-lg'
                          : 'bg-[#181a20] border-[#382f25] hover:border-[#e28c38]/50 shadow-md'
                    }`}
                  >
                    <div>
                      {/* Topo da Comanda */}
                      <div className="flex items-start justify-between pb-3 border-b border-[#2d261e]">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-extrabold text-white">{order.table}</span>
                            <span className="text-xs font-mono font-bold text-[#e28c38]">
                              {order.orderCode?.startsWith('*') 
                                ? order.orderCode 
                                : '*' + (order.orderCode?.replace(/\D/g, '') || '001').padStart(3, '0')}
                            </span>
                          </div>
                          {order.customer && (
                            <p className="text-xs text-[#a39480] mt-0.5">Cliente: <strong className="text-[#e8d8be]">{order.customer}</strong></p>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            order.status === 'Pronta'
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                              : order.status === 'Finalizada'
                                ? 'bg-[#20222a] text-[#7d7a74] border-[#31333a]'
                                : 'bg-[#2a221b] text-[#e28c38] border-[#e28c38]/40'
                          }`}>
                            {order.status}
                          </span>
                          <span className="text-[10px] text-[#716658] font-mono">
                            {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {/* Itens Lançados */}
                      <div className="my-3 space-y-2 max-h-48 overflow-y-auto pr-1">
                        {order.items.length === 0 ? (
                          <p className="text-xs text-[#6e6355] italic py-2">Nenhum item adicionado.</p>
                        ) : (
                          order.items.map((it, idx) => (
                            <div key={idx} className="flex items-start justify-between text-xs p-2 rounded-lg bg-[#121317] border border-[#25201a]">
                              <div className="flex-1 pr-2">
                                <div className="flex items-center gap-2 font-bold text-white flex-wrap">
                                  {!isClosed ? (
                                    <div className="flex items-center gap-1 bg-[#1a1c24] px-1.5 py-0.5 rounded border border-[#382f25]">
                                      <button 
                                        type="button"
                                        onClick={() => handleUpdateExistingOrderItemQty(order, idx, -1)}
                                        className="w-5 h-5 rounded flex items-center justify-center bg-[#252834] hover:bg-[#e28c38] hover:text-black text-[#e28c38] font-bold text-xs"
                                        title="Diminuir quantidade"
                                      >-</button>
                                      <span className="text-[#e28c38] font-mono px-1 font-extrabold">{it.qty}x</span>
                                      <button 
                                        type="button"
                                        onClick={() => handleUpdateExistingOrderItemQty(order, idx, 1)}
                                        className="w-5 h-5 rounded flex items-center justify-center bg-[#252834] hover:bg-[#e28c38] hover:text-black text-[#e28c38] font-bold text-xs"
                                        title="Aumentar quantidade (+1)"
                                      >+</button>
                                    </div>
                                  ) : (
                                    <span className="text-[#e28c38] font-bold">{it.qty}x</span>
                                  )}
                                  <span className="truncate">{it.name}</span>
                                </div>
                                {it.notes && (
                                  <p className="text-[10px] text-[#d4c3ab]/80 italic pl-1 mt-0.5">↳ Obs: {it.notes}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[#d4c3ab]">
                                  R$ {(it.price * it.qty).toFixed(2).replace('.', ',')}
                                </span>
                                {!isClosed && (
                                  <button 
                                    onClick={() => handleRemoveItemFromExistingOrder(order, idx)}
                                    className="text-rose-400 hover:text-rose-300 p-0.5"
                                    title="Remover item"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Rodapé com Total e Ações */}
                    <div className="pt-3 border-t border-[#2d261e] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#8e8070]">Total a Pagar:</span>
                        <span className="text-lg font-black text-[#e28c38] font-mono">
                          R$ {order.total.toFixed(2).replace('.', ',')}
                        </span>
                      </div>

                      {!isClosed ? (
                        <div className="space-y-2">
                          <button
                            onClick={() => {
                              setOrderToEditItems(order);
                              setSelectedProdForExisting(null);
                            }}
                            className="w-full py-2 px-3 rounded-xl bg-[#2a221b] hover:bg-[#382d23] text-[#e28c38] font-bold text-xs flex items-center justify-center gap-1.5 border border-[#e28c38]/30 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Lançar Mais Itens</span>
                          </button>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {order.status === 'Aberta' ? (
                              <button
                                onClick={() => handleUpdateOrderStatus(order, 'Pronta')}
                                className="py-1.5 px-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 font-semibold border border-emerald-500/30 flex items-center justify-center gap-1"
                              >
                                <ChefHat className="w-3.5 h-3.5" /> Pronta
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUpdateOrderStatus(order, 'Aberta')}
                                className="py-1.5 px-2 rounded-xl bg-[#2a221b] text-[#e28c38] font-semibold border border-[#e28c38]/30 flex items-center justify-center gap-1"
                              >
                                <Clock className="w-3.5 h-3.5" /> Em Aberto
                              </button>
                            )}

                            <button
                              onClick={() => handleUpdateOrderStatus(order, 'Finalizada')}
                              className="py-1.5 px-2 rounded-xl bg-blue-950/60 hover:bg-blue-900 text-blue-300 font-semibold border border-blue-500/30 flex items-center justify-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Fechar Conta
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleUpdateOrderStatus(order, 'Aberta')}
                          className="w-full py-1.5 rounded-xl bg-[#22242c] hover:bg-[#2d303b] text-[#e28c38] text-xs font-semibold"
                        >
                          Reabrir Comanda
                        </button>
                      )}

                      {/* Botões de WhatsApp / Impressão / Excluir */}
                      <div className="flex items-center justify-between pt-1 text-xs">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleShareWhatsApp(order)}
                            className="text-[#34d399] hover:underline flex items-center gap-1 text-[11px]"
                            title="Enviar no WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                          </button>
                          <button
                            onClick={() => handlePrintReceipt(order)}
                            className="text-[#d4c3ab] hover:underline flex items-center gap-1 text-[11px]"
                            title="Imprimir Cupom"
                          >
                            <Printer className="w-3.5 h-3.5" /> Imprimir
                          </button>
                        </div>

                        <button
                          onClick={() => handleDeleteOrder(order.id)}
                          className="text-rose-400 hover:text-rose-300 p-1"
                          title="Excluir Comanda"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </section>
      )}

      {/* ========================================================
          ABA 3: NOVA COMANDA (Abertura de Mesa & Montagem)
         ======================================================== */}
      {activeTab === 'new-order' && (
        <section className={`max-w-6xl mx-auto w-full px-4 py-8 flex-1 ${newOrderCart.length > 0 ? 'pb-28' : ''}`}>
          
          <div className="mb-6">
            <h2 className="text-xl font-bold text-[#e8d8be] flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#e28c38]" />
              <span>Abrir Nova Comanda</span>
            </h2>
            <p className="text-xs text-[#8e8070]">Selecione a mesa, toque nos pratos do cardápio e lance o pedido</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* LADO ESQUERDO / CENTRAL: CARDÁPIO INTERATIVO */}
            <div className="lg:col-span-2 space-y-4">
              
              {/* Barra de Pesquisa de Pratos */}
              <div className="relative">
                <input
                  type="text"
                  value={searchMenuQuery}
                  onChange={(e) => setSearchMenuQuery(e.target.value)}
                  placeholder="🔍 Pesquisar prato, porção, bebida ou sobremesa..."
                  className="w-full bg-[#181a20] border border-[#2d251d] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#e28c38] placeholder-[#7d7162]"
                />
                {searchMenuQuery && (
                  <button
                    onClick={() => setSearchMenuQuery('')}
                    className="absolute right-3 top-2.5 text-[#8e8070] hover:text-white text-xs font-semibold"
                  >
                    Limpar
                  </button>
                )}
              </div>

              {/* Filtros de Categoria */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategoryFilter(cat)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                      activeCategoryFilter === cat
                        ? 'bg-[#e28c38] text-black font-bold shadow-md'
                        : 'bg-[#1b1c22] text-[#d4c3ab] hover:bg-[#252832] border border-[#2d251d]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Grid dos Pratos do Cardápio */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[620px] overflow-y-auto pr-1">
                {filteredProducts.map(prod => {
                  const cartItem = newOrderCart.find(it => it.id === prod.id);
                  const inCartQty = cartItem ? cartItem.qty : 0;

                  return (
                    <div
                      key={prod.id}
                      onClick={() => handleAddToCart(prod)}
                      className={`p-3 rounded-2xl bg-[#16181e] border transition-all cursor-pointer flex gap-3 group relative ${
                        inCartQty > 0 
                          ? 'border-[#e28c38]/70 bg-[#1a1b22] shadow-[0_0_15px_rgba(226,140,56,0.12)]' 
                          : 'border-[#2d251d] hover:border-[#e28c38]/60'
                      }`}
                    >
                      {prod.image && (
                        <div className="w-20 h-20 min-w-[80px] min-h-[80px] sm:w-24 sm:h-24 sm:min-w-[96px] sm:min-h-[96px] rounded-xl overflow-hidden bg-black flex-shrink-0">
                          <img 
                            src={prod.image} 
                            alt={prod.name} 
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                          />
                        </div>
                      )}
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          <h4 className="text-sm font-bold text-white group-hover:text-[#e28c38] transition-colors truncate">
                            {prod.name}
                          </h4>
                          <p className="text-[11px] text-[#8e8070] line-clamp-2 mt-0.5">
                            {prod.description}
                          </p>
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-[#25201a]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-bold text-[#e28c38] text-xs">
                              R$ {prod.price.toFixed(2).replace('.', ',')}
                            </span>
                            {inCartQty > 0 && (
                              <span className="text-[11px] font-mono font-black text-black bg-[#e28c38] px-1.5 py-0.5 rounded shadow-sm">
                                x {inCartQty}
                              </span>
                            )}
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all ${
                            inCartQty > 0
                              ? 'bg-[#e28c38] text-black font-extrabold shadow-sm'
                              : 'bg-[#2a221b] text-[#e28c38] group-hover:bg-[#e28c38] group-hover:text-black'
                          }`}>
                            + Adicionar
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

            {/* LADO DIREITO: RESUMO DA COMANDA SENDO MONTADA */}
            <div 
              ref={cartSummaryRef}
              id="resumo-comanda"
              className="bg-[#181a20] rounded-2xl p-5 border border-[#382f25] flex flex-col justify-between shadow-xl h-fit scroll-mt-24"
            >
              <div>
                <h3 className="text-base font-bold text-[#e8d8be] pb-3 border-b border-[#2d261e] flex items-center justify-between">
                  <span>Resumo do Pedido</span>
                  <ShoppingBag className="w-4 h-4 text-[#e28c38]" />
                </h3>

                {/* Campos de Mesa e Cliente */}
                <div className="space-y-3 my-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#a89985] mb-1">Identificação da Mesa / Balcão *</label>
                    <input
                      type="text"
                      value={newOrderTable}
                      onChange={(e) => setNewOrderTable(e.target.value)}
                      placeholder="Ex: Mesa 03 / Balcão 01"
                      required
                      className="w-full bg-[#121317] border border-[#2d261e] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#e28c38]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#a89985] mb-1">Nome do Cliente (opcional)</label>
                    <input
                      type="text"
                      value={newOrderCustomer}
                      onChange={(e) => setNewOrderCustomer(e.target.value)}
                      placeholder="Ex: Dona Maria"
                      className="w-full bg-[#121317] border border-[#2d261e] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#e28c38]"
                    />
                  </div>
                </div>

                {/* Itens Selecionados no Carrinho */}
                <div className="border-t border-[#2d261e] pt-3">
                  <div className="flex items-center justify-between text-xs text-[#8e8070] mb-2">
                    <span>Itens Selecionados:</span>
                    <span>{newOrderCart.reduce((acc, it) => acc + it.qty, 0)} unid</span>
                  </div>

                  {newOrderCart.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#6e6355] italic">
                      Nenhum prato selecionado ainda.<br />Toque nos pratos do cardápio para adicionar.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {newOrderCart.map(item => (
                        <div key={item.id} className="p-2.5 rounded-xl bg-[#121317] border border-[#25201a] space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-white truncate flex-1 pr-2">{item.name}</span>
                            <span className="font-mono font-bold text-[#e28c38]">
                              R$ {(item.price * item.qty).toFixed(2).replace('.', ',')}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs pt-1">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleUpdateCartQty(item.id, -1)}
                                className="w-5 h-5 rounded bg-[#20222a] text-[#e28c38] font-bold flex items-center justify-center text-xs"
                              >-</button>
                              <span className="font-bold text-white">{item.qty}</span>
                              <button
                                onClick={() => handleUpdateCartQty(item.id, 1)}
                                className="w-5 h-5 rounded bg-[#e28c38] text-black font-bold flex items-center justify-center text-xs"
                              >+</button>
                            </div>

                            <input
                              type="text"
                              value={item.notes || ''}
                              onChange={(e) => handleUpdateCartNotes(item.id, e.target.value)}
                              placeholder="+ Observação (ex: sem cebola)"
                              className="text-[10px] bg-transparent border-b border-[#382f25] text-[#d4c3ab] px-1 py-0.5 focus:outline-none focus:border-[#e28c38] w-36"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Total e Botão de Finalização */}
              <div className="pt-4 border-t border-[#2d261e] mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#8e8070]">Total da Comanda:</span>
                  <span className="text-xl font-black text-[#e28c38] font-mono">
                    R$ {newOrderCart.reduce((acc, it) => acc + (it.price * it.qty), 0).toFixed(2).replace('.', ',')}
                  </span>
                </div>

                <button
                  onClick={handleConfirmCreateOrder}
                  disabled={newOrderCart.length === 0}
                  className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg ${
                    newOrderCart.length > 0
                      ? 'bg-[#e28c38] hover:bg-[#d07b28] text-black active:scale-98 shadow-[0_4px_15px_rgba(226,140,56,0.3)]'
                      : 'bg-[#2a2723] text-[#6b6256] cursor-not-allowed'
                  }`}
                >
                  Finalizar Comanda
                </button>
              </div>

            </div>

          </div>

          {/* BARRA FLUTUANTE INFERIOR: RESUMO RÁPIDO & RESUMO DO PEDIDO */}
          {newOrderCart.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#16181f]/95 backdrop-blur-md border-t border-[#3e3226] p-3 px-4 shadow-[0_-10px_25px_rgba(0,0,0,0.7)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#e28c38] text-black flex items-center justify-center font-bold text-sm shadow-md">
                  {newOrderCart.reduce((acc, it) => acc + it.qty, 0)}
                </div>
                <div>
                  <span className="text-[11px] text-[#8e8070] block">Itens no resumo:</span>
                  <span className="text-sm font-extrabold text-[#e28c38] font-mono">
                    R$ {newOrderCart.reduce((acc, it) => acc + (it.price * it.qty), 0).toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('resumo-comanda') || cartSummaryRef.current;
                  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="px-4 py-2.5 rounded-xl bg-[#e28c38] hover:bg-[#d07b28] text-black font-extrabold text-xs uppercase flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <span>Resumo do Pedido</span>
                <ChevronDown className="w-4 h-4 animate-bounce" />
              </button>
            </div>
          )}

        </section>
      )}

      {/* ========================================================
          ABA 4: CONFIGURAÇÕES (Identidade e Gestão do Cardápio)
         ======================================================== */}
      {activeTab === 'settings' && (
        <section className="max-w-5xl mx-auto w-full px-4 py-8 flex-1 space-y-8">
          
          <div className="mb-2">
            <h2 className="text-xl font-bold text-[#e8d8be]">Configurações do Estabelecimento</h2>
            <p className="text-xs text-[#8e8070]">Gerencie a identidade visual e o cardápio de comidas caseiras</p>
          </div>

          {/* 1. IDENTIDADE DA EMPRESA */}
          <div className="bg-[#181a20] rounded-2xl p-6 border border-[#382f25] space-y-4 shadow-xl">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#d4c3ab] pb-2 border-b border-[#2d261e]">
              Identidade Visual
            </h3>

            <form onSubmit={handleSaveSettings} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#a89985] mb-1">Nome do Restaurante</label>
                <input
                  type="text"
                  value={companyNameInput}
                  onChange={(e) => setCompanyNameInput(e.target.value)}
                  placeholder="Ex: Delícias da Rita"
                  required
                  className="w-full bg-[#121317] border border-[#2d261e] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#e28c38]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a89985] mb-1">Logo do Restaurante</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    ref={fileInputLogoRef}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setIsUploadingLogo(true);
                      const url = await handleFileUpload(file);
                      setIsUploadingLogo(false);
                      if (url) setCompanyLogoInput(url);
                    }}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputLogoRef.current?.click()}
                    disabled={isUploadingLogo}
                    className="px-4 py-2.5 rounded-xl bg-[#22242d] hover:bg-[#2b2e3a] text-[#e28c38] font-semibold text-xs border border-[#3d3329] flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{isUploadingLogo ? 'Enviando...' : 'Fazer Upload de Logo'}</span>
                  </button>

                  {companyLogoInput && (
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-[#e28c38] bg-black">
                      <img src={companyLogoInput} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-2 flex items-center justify-between pt-2">
                {settingsSaveSuccess && (
                  <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 animate-pulse">
                    <Check className="w-4 h-4" /> Salvo com sucesso!
                  </span>
                )}
                <button
                  type="submit"
                  className="ml-auto px-5 py-2 rounded-xl bg-[#e28c38] hover:bg-[#d07b28] text-black font-bold text-xs uppercase tracking-wider"
                >
                  Salvar Identidade
                </button>
              </div>
            </form>
          </div>

          {/* 2. GESTÃO DE PRATOS E PRODUTOS */}
          <div className="bg-[#181a20] rounded-2xl p-6 border border-[#382f25] space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-[#2d261e]">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#d4c3ab]">
                Pratos do Cardápio ({products.length})
              </h3>
              <button
                onClick={() => {
                  setEditingProductId(null);
                  setProdName('');
                  setProdPrice('');
                  setProdCategory('Pratos Principais');
                  setProdDescription('');
                  setProdImageUrl('');
                  setIsProductModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-[#e28c38] hover:bg-[#d07b28] text-black font-bold text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Novo Prato</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {products.map(p => (
                <div key={p.id} className="p-3 rounded-xl bg-[#121317] border border-[#262019] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="w-12 h-12 rounded-lg object-cover bg-black flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-[#22242c] flex items-center justify-center text-[#e28c38]">
                        <UtensilsCrossed className="w-5 h-5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">{p.name}</h4>
                      <p className="text-xs font-mono font-bold text-[#e28c38]">
                        R$ {p.price.toFixed(2).replace('.', ',')}
                        <span className="text-[#8e8070] font-sans font-normal ml-2 text-[10px]">• {p.category}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingProductId(p.id);
                        setProdName(p.name);
                        setProdPrice(p.price.toString());
                        setProdCategory(p.category);
                        setProdDescription(p.description || '');
                        setProdImageUrl(p.image || '');
                        setIsProductModalOpen(true);
                      }}
                      className="p-1.5 text-[#d4c3ab] hover:text-[#e28c38]"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(p.id)}
                      className="p-1.5 text-rose-400 hover:text-rose-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. CONEXÃO EM NUVEM (FIREBASE / FUNCIONAMENTO 24H SEM PC LIGADO) */}
          <div className="bg-[#181a20] rounded-2xl p-6 border border-[#382f25] space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-[#2d261e]">
              <div className="flex items-center gap-2">
                <Cloud className="w-5 h-5 text-[#e28c38]" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#d4c3ab]">
                  Conexão com a Nuvem (Firebase / 24h sem Computador)
                </h3>
              </div>
              <div className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1.5 ${
                isCloudConnected
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                  : 'bg-[#28211b] text-[#e28c38] border-[#e28c38]/40'
              }`}>
                <span className={`w-2 h-2 rounded-full ${isCloudConnected ? 'bg-emerald-400 animate-pulse' : 'bg-[#e28c38]'}`}></span>
                <span>{isCloudConnected ? 'Nuvem Conectada (24h)' : 'Modo Navegador'}</span>
              </div>
            </div>

            <p className="text-xs text-[#a89985] leading-relaxed">
              Para que o sistema continue funcionando e sincronizando todos os celulares mesmo com o <strong>computador desligado</strong>, cole abaixo o código de configuração do seu projeto gratuito no <strong>Google Firebase Console</strong>.
            </p>

            <form onSubmit={handleSaveFirebaseConfig} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#8e8070] mb-1">JSON de Configuração do Firebase</label>
                <textarea
                  value={firebaseJsonInput}
                  onChange={(e) => setFirebaseJsonInput(e.target.value)}
                  rows={4}
                  placeholder='{ "apiKey": "AIzaSy...", "authDomain": "...", "projectId": "delicias-da-rita", ... }'
                  className="w-full bg-[#121317] border border-[#2d261e] rounded-xl p-3 font-mono text-xs text-[#e28c38] focus:outline-none focus:border-[#e28c38]"
                ></textarea>
              </div>

              <div className="flex items-center justify-between">
                {cloudConnectSuccess && (
                  <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 animate-pulse">
                    <CheckCircle className="w-4 h-4" /> Configuração salva com sucesso!
                  </span>
                )}
                <button
                  type="submit"
                  className="ml-auto px-5 py-2 rounded-xl bg-[#e28c38] hover:bg-[#d07b28] text-black font-bold text-xs uppercase tracking-wider"
                >
                  Ativar Nuvem em Tempo Real
                </button>
              </div>
            </form>
          </div>

        </section>
      )}

      {/* ========================================================
          MODAL: LANÇAR ITENS EM UMA COMANDA JÁ ABERTA
         ======================================================== */}
      {orderToEditItems && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181a20] w-full max-w-xl max-h-[90vh] rounded-2xl flex flex-col border border-[#3e342a] shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-[#2d261e] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#e8d8be]">
                  Lançar Itens na Comanda: <span className="text-[#e28c38]">{orderToEditItems.table}</span> ({orderToEditItems.orderCode})
                </h3>
                <p className="text-xs text-[#8e8070]">Selecione o produto do cardápio e adicione</p>
              </div>
              <button onClick={() => setOrderToEditItems(null)} className="text-[#8e8070] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                {products.map(p => {
                  const isSel = selectedProdForExisting?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedProdForExisting(p)}
                      className={`p-2.5 rounded-xl border cursor-pointer flex items-center justify-between ${
                        isSel 
                          ? 'bg-[#2d241c] border-[#e28c38]' 
                          : 'bg-[#121317] border-[#25201a] hover:border-[#382f25]'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-bold text-white truncate">{p.name}</div>
                        <div className="text-[11px] font-mono text-[#e28c38]">R$ {p.price.toFixed(2).replace('.', ',')}</div>
                      </div>
                      {isSel && <Check className="w-4 h-4 text-[#e28c38]" />}
                    </div>
                  );
                })}
              </div>

              {selectedProdForExisting && (() => {
                const alreadyInOrder = orderToEditItems.items.find(
                  it => it.id === selectedProdForExisting.id || it.name.trim().toLowerCase() === selectedProdForExisting.name.trim().toLowerCase()
                );
                return (
                  <div className="p-3.5 rounded-xl bg-[#121317] border border-[#e28c38]/40 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">{selectedProdForExisting.name}</span>
                      <span className="font-mono font-bold text-[#e28c38]">
                        R$ {selectedProdForExisting.price.toFixed(2).replace('.', ',')}
                      </span>
                    </div>

                    {alreadyInOrder && (
                      <div className="bg-[#2a221b] border border-[#e28c38]/50 rounded-lg p-2 text-[11px] text-[#e8d8be]">
                        ℹ️ Já tem <strong className="text-[#e28c38]">{alreadyInOrder.qty}x</strong> deste item na comanda. Ao adicionar, somará direto no item existente ficando <strong className="text-white">{alreadyInOrder.qty + existingOrderQty}x</strong>!
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-[#8e8070] mb-1">Quantidade a somar</label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setExistingOrderQty(Math.max(1, existingOrderQty - 1))}
                            className="w-7 h-7 rounded bg-[#20222a] text-[#e28c38] font-bold"
                          >-</button>
                          <span className="font-bold text-sm text-white px-2">{existingOrderQty}</span>
                          <button
                            type="button"
                            onClick={() => setExistingOrderQty(existingOrderQty + 1)}
                            className="w-7 h-7 rounded bg-[#e28c38] text-black font-bold"
                          >+</button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] text-[#8e8070] mb-1">Observações</label>
                        <input
                          type="text"
                          value={existingOrderNotes}
                          onChange={(e) => setExistingOrderNotes(e.target.value)}
                          placeholder="Ex: bem gelado, sem gelo..."
                          className="w-full bg-[#181a20] border border-[#2d261e] rounded-lg px-2.5 py-1 text-xs text-white"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleAddItemToExistingOrder}
                      className="w-full py-2.5 rounded-xl bg-[#e28c38] hover:bg-[#d07b28] text-black font-bold text-xs uppercase tracking-wide transition-all shadow-md"
                    >
                      {alreadyInOrder
                        ? `Somar +${existingOrderQty} ao item existente (${alreadyInOrder.qty + existingOrderQty}x total)`
                        : `Adicionar à Comanda (+${existingOrderQty})`}
                    </button>
                  </div>
                );
              })()}

              {/* Itens já existentes */}
              <div className="pt-2 border-t border-[#2d261e]">
                <h4 className="text-xs font-bold text-[#d4c3ab] mb-2">Itens desta comanda:</h4>
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {orderToEditItems.items.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-[#121317] border border-[#25201a]">
                      <div className="flex items-center gap-2 flex-1 pr-2">
                        <div className="flex items-center gap-1 bg-[#1e2029] px-1 py-0.5 rounded border border-[#332a21]">
                          <button
                            type="button"
                            onClick={() => handleUpdateExistingOrderItemQty(orderToEditItems, idx, -1)}
                            className="w-5 h-5 rounded flex items-center justify-center bg-[#292c3a] text-[#e28c38] font-bold text-xs hover:bg-[#e28c38] hover:text-black"
                            title="Diminuir"
                          >-</button>
                          <span className="font-bold text-[#e28c38] px-1 font-mono">{it.qty}x</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateExistingOrderItemQty(orderToEditItems, idx, 1)}
                            className="w-5 h-5 rounded flex items-center justify-center bg-[#292c3a] text-[#e28c38] font-bold text-xs hover:bg-[#e28c38] hover:text-black"
                            title="Aumentar"
                          >+</button>
                        </div>
                        <span className="text-white font-medium truncate">{it.name}</span>
                        {it.notes && <span className="text-[10px] text-[#8e8070] italic">({it.notes})</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[#d4c3ab]">R$ {(it.price * it.qty).toFixed(2).replace('.', ',')}</span>
                        <button
                          onClick={() => handleRemoveItemFromExistingOrder(orderToEditItems, idx)}
                          className="text-rose-400 hover:text-rose-300 p-0.5"
                          title="Remover"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            <div className="p-4 border-t border-[#2d261e] flex items-center justify-between">
              <span className="font-mono font-bold text-[#e28c38]">
                Total: R$ {orderToEditItems.total.toFixed(2).replace('.', ',')}
              </span>
              <button
                onClick={() => setOrderToEditItems(null)}
                className="px-4 py-1.5 rounded-xl bg-[#2a241e] text-[#d4c3ab] font-bold text-xs"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CADASTRAR / EDITAR PRODUTO
         ======================================================== */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181a20] w-full max-w-lg rounded-2xl p-6 border border-[#3e342a] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#2d261e]">
              <h3 className="text-base font-bold text-[#e8d8be]">
                {editingProductId ? 'Editar Prato' : 'Novo Prato no Cardápio'}
              </h3>
              <button onClick={() => setIsProductModalOpen(false)} className="text-[#8e8070] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#a89985] mb-1">Nome do Prato *</label>
                <input
                  type="text"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="Ex: Escondidinho de Carne Seca"
                  required
                  className="w-full bg-[#121317] border border-[#2d261e] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#e28c38]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#a89985] mb-1">Preço (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                    placeholder="Ex: 42.00"
                    required
                    className="w-full bg-[#121317] border border-[#2d261e] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#e28c38]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#a89985] mb-1">Categoria *</label>
                  <select
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    className="w-full bg-[#121317] border border-[#2d261e] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#e28c38]"
                  >
                    <option value="Pratos Principais">Pratos Principais</option>
                    <option value="Petiscos & Entradas">Petiscos & Entradas</option>
                    <option value="Bebidas">Bebidas</option>
                    <option value="Sobremesas">Sobremesas</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a89985] mb-1">Descrição</label>
                <textarea
                  value={prodDescription}
                  onChange={(e) => setProdDescription(e.target.value)}
                  rows={2}
                  placeholder="Ingredientes e preparo..."
                  className="w-full bg-[#121317] border border-[#2d261e] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#e28c38]"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a89985] mb-1">Foto do Prato</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    ref={fileInputProdRef}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setIsUploadingProdImage(true);
                      const url = await handleFileUpload(file);
                      setIsUploadingProdImage(false);
                      if (url) setProdImageUrl(url);
                    }}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputProdRef.current?.click()}
                    disabled={isUploadingProdImage}
                    className="px-4 py-2 rounded-xl bg-[#22242d] hover:bg-[#2b2e3a] text-[#e28c38] font-semibold text-xs border border-[#3d3329] flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{isUploadingProdImage ? 'Enviando...' : 'Fazer Upload de Foto'}</span>
                  </button>

                  {prodImageUrl && (
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-[#e28c38] bg-black">
                      <img src={prodImageUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#22242a] text-xs text-[#8e8070]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#e28c38] text-black font-bold text-xs uppercase"
                >
                  Salvar Prato
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
