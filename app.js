/**
 * Lógica Principal da Aplicação Gourmet Comandas
 */

// Estado da Aplicação
const state = {
  currentTab: 'menu', // 'menu' | 'orders' | 'settings'
  activeCategory: 'Todos',
  searchQuery: '',
  cartItems: [], // Itens selecionados no pedido atual: [{ id, name, price, qty, notes, category }]
  currentOrderIdentity: {
    tableNumber: 'Mesa 01',
    customerName: '',
    waiterName: ''
  },
  editingOrderId: null,
  orders: [],
  menuItems: [],
  restaurantSettings: {}
};

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
  // Carrega configurações e menu
  state.restaurantSettings = window.syncManager.getSettings();
  state.menuItems = window.syncManager.getMenu();

  // Aplica dados do restaurante na tela
  applyRestaurantBranding();

  // Inicializa o sync
  window.syncManager.init();

  // Carrega lista inicial de comandas
  state.orders = await window.syncManager.getOrders();

  // Inscreve no listener de tempo real
  window.syncManager.subscribeToOrders((updatedOrders) => {
    state.orders = updatedOrders;
    renderOrders();
    updateHeaderCounters();
  });

  // Renderizações iniciais
  renderCategories();
  renderMenu();
  renderOrders();
  renderCart();
  populateSettingsForm();
  updateHeaderCounters();

  // Listeners de eventos globais
  setupEventListeners();

  // Ícones Lucide
  if (window.lucide) {
    lucide.createIcons();
  }
});

// Listener de Status de Sincronização
window.addEventListener('syncStatusChange', (e) => {
  const { connected, message } = e.detail;
  const statusBadge = document.getElementById('cloudStatusBadge');
  const statusText = document.getElementById('cloudStatusText');
  const statusDot = document.getElementById('cloudStatusDot');

  if (statusBadge && statusText && statusDot) {
    statusText.textContent = message;
    if (connected) {
      statusDot.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse';
      statusBadge.className = 'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/70 text-emerald-300 border border-emerald-500/30';
    } else {
      statusDot.className = 'w-2 h-2 rounded-full bg-amber-400';
      statusBadge.className = 'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-950/70 text-amber-300 border border-amber-500/30';
    }
  }
});

// --- APLICAÇÃO DE IDENTIDADE VISUAL ---
function applyRestaurantBranding() {
  const s = state.restaurantSettings;
  const logoEl = document.getElementById('displayLogo');
  const titleEl = document.getElementById('displayName');
  const taglineEl = document.getElementById('displayTagline');

  if (logoEl && s.logoUrl) logoEl.src = s.logoUrl;
  if (titleEl && s.restaurantName) titleEl.textContent = s.restaurantName;
  if (taglineEl && s.tagline) taglineEl.textContent = s.tagline;
  document.title = `${s.restaurantName || 'Comandas'} | Gestão Remota`;
}

// --- CONTROLE DE ABAS ---
function switchTab(tabId) {
  state.currentTab = tabId;
  
  const views = ['menuView', 'ordersView', 'settingsView'];
  views.forEach(v => {
    const el = document.getElementById(v);
    if (el) el.classList.add('hidden');
  });

  const activeView = document.getElementById(`${tabId}View`);
  if (activeView) activeView.classList.remove('hidden');

  // Atualiza botões da navbar
  document.querySelectorAll('[data-tab-btn]').forEach(btn => {
    const isTarget = btn.getAttribute('data-tab-btn') === tabId;
    if (isTarget) {
      btn.className = 'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 transition-all';
    } else {
      btn.className = 'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all';
    }
  });

  if (tabId === 'orders') {
    renderOrders();
  }

  if (window.lucide) lucide.createIcons();
}

// --- CATEGORIAS & CARDÁPIO ---
function getCategories() {
  const cats = new Set(state.menuItems.map(item => item.category));
  return ['Todos', ...Array.from(cats)];
}

function renderCategories() {
  const container = document.getElementById('categoryTabs');
  if (!container) return;

  const categories = getCategories();
  container.innerHTML = categories.map(cat => {
    const isActive = state.activeCategory === cat;
    return `
      <button 
        onclick="selectCategory('${cat}')"
        class="whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${
          isActive 
            ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 font-bold scale-105' 
            : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 border border-slate-700/40'
        }"
      >
        ${cat}
      </button>
    `;
  }).join('');
}

function selectCategory(category) {
  state.activeCategory = category;
  renderCategories();
  renderMenu();
}

function renderMenu() {
  const container = document.getElementById('menuGrid');
  if (!container) return;

  let items = state.menuItems;

  // Filtro de Categoria
  if (state.activeCategory !== 'Todos') {
    items = items.filter(i => i.category === state.activeCategory);
  }

  // Filtro de Busca
  if (state.searchQuery.trim()) {
    const q = state.searchQuery.toLowerCase();
    items = items.filter(i => 
      i.name.toLowerCase().includes(q) || 
      (i.description && i.description.toLowerCase().includes(q))
    );
  }

  if (items.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-16 text-center text-slate-400">
        <i data-lucide="utensils" class="w-12 h-12 mx-auto mb-3 opacity-40 text-amber-400"></i>
        <p class="text-base font-semibold">Nenhum item encontrado no cardápio</p>
        <p class="text-xs text-slate-500 mt-1">Tente buscar outro termo ou selecione outra categoria.</p>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  container.innerHTML = items.map(item => {
    const cartItem = state.cartItems.find(c => c.id === item.id);
    const qtyInCart = cartItem ? cartItem.qty : 0;

    return `
      <div class="interactive-card glass-panel rounded-2xl overflow-hidden flex flex-col justify-between border border-slate-800/80 bg-slate-900/60 hover:border-amber-500/40">
        <div class="relative h-40 w-full overflow-hidden bg-slate-800">
          <img 
            src="${item.image}" 
            alt="${item.name}" 
            loading="lazy"
            class="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
            onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-90"></div>
          
          ${item.badge ? `
            <span class="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/90 text-slate-950 backdrop-blur-md shadow">
              ${item.badge}
            </span>
          ` : ''}

          <span class="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-900/80 text-amber-300 backdrop-blur-md border border-amber-500/20">
            ${item.category}
          </span>

          <div class="absolute bottom-2.5 left-3 right-3 flex items-end justify-between">
            <span class="text-lg font-bold text-amber-400 drop-shadow">
              ${state.restaurantSettings.currencySymbol || 'R$'} ${formatPrice(item.price)}
            </span>
          </div>
        </div>

        <div class="p-4 flex-1 flex flex-col justify-between">
          <div>
            <h3 class="font-bold text-slate-100 text-base leading-snug">${item.name}</h3>
            <p class="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">${item.description || ''}</p>
          </div>

          <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
            ${qtyInCart > 0 ? `
              <div class="flex items-center gap-2 bg-slate-800/90 rounded-xl p-1 border border-amber-500/30">
                <button 
                  onclick="changeCartQty('${item.id}', -1)"
                  class="w-7 h-7 rounded-lg bg-slate-700/80 hover:bg-slate-600 text-amber-400 flex items-center justify-center font-bold text-sm transition-colors"
                >
                  -
                </button>
                <span class="text-xs font-bold text-white px-1.5">${qtyInCart}</span>
                <button 
                  onclick="changeCartQty('${item.id}', 1)"
                  class="w-7 h-7 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-sm transition-colors"
                >
                  +
                </button>
              </div>
              <button 
                onclick="openItemNoteModal('${item.id}')"
                title="Adicionar Observação"
                class="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-amber-400 text-xs font-semibold flex items-center gap-1 border border-slate-700/50"
              >
                <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                <span class="hidden sm:inline">Obs</span>
              </button>
            ` : `
              <button 
                onclick="addToCart('${item.id}')"
                class="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-amber-500/10 active:scale-95 transition-all"
              >
                <i data-lucide="plus" class="w-4 h-4"></i>
                Adicionar à Comanda
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

// --- CARRINHO / MONTAGEM DA COMANDA ATUAL ---
function addToCart(itemId) {
  const item = state.menuItems.find(i => i.id === itemId);
  if (!item) return;

  const existing = state.cartItems.find(i => i.id === itemId);
  if (existing) {
    existing.qty += 1;
  } else {
    state.cartItems.push({
      id: item.id,
      name: item.name,
      price: item.price,
      qty: 1,
      notes: '',
      category: item.category
    });
  }

  showToast(`"${item.name}" adicionado`);
  renderCart();
  renderMenu();
}

function changeCartQty(itemId, delta) {
  const index = state.cartItems.findIndex(i => i.id === itemId);
  if (index === -1) return;

  state.cartItems[index].qty += delta;
  if (state.cartItems[index].qty <= 0) {
    state.cartItems.splice(index, 1);
  }

  renderCart();
  renderMenu();
}

function openItemNoteModal(itemId) {
  const cartItem = state.cartItems.find(i => i.id === itemId);
  if (!cartItem) return;

  const noteModal = document.getElementById('noteModal');
  const noteInput = document.getElementById('noteInput');
  const noteItemTitle = document.getElementById('noteItemTitle');

  if (noteItemTitle) noteItemTitle.textContent = cartItem.name;
  if (noteInput) noteInput.value = cartItem.notes || '';
  if (noteModal) {
    noteModal.dataset.targetItemId = itemId;
    noteModal.classList.remove('hidden');
  }
}

function saveItemNote() {
  const noteModal = document.getElementById('noteModal');
  const noteInput = document.getElementById('noteInput');
  const itemId = noteModal.dataset.targetItemId;

  const cartItem = state.cartItems.find(i => i.id === itemId);
  if (cartItem) {
    cartItem.notes = noteInput.value.trim();
    showToast('Observação salva!');
  }
  closeItemNoteModal();
  renderCart();
}

function closeItemNoteModal() {
  const noteModal = document.getElementById('noteModal');
  if (noteModal) noteModal.classList.add('hidden');
}

function renderCart() {
  const cartContainer = document.getElementById('cartItemsList');
  const cartCountBadges = document.querySelectorAll('.cart-count-badge');
  const subtotalEl = document.getElementById('cartSubtotal');
  const serviceTaxEl = document.getElementById('cartServiceTax');
  const totalEl = document.getElementById('cartTotal');
  const cartDrawerCount = document.getElementById('cartDrawerCount');

  const totalQty = state.cartItems.reduce((acc, item) => acc + item.qty, 0);
  const subtotal = state.cartItems.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const serviceTax = (subtotal * (state.restaurantSettings.serviceTaxPercent || 10)) / 100;
  const total = subtotal + serviceTax;

  cartCountBadges.forEach(b => b.textContent = totalQty);
  if (cartDrawerCount) cartDrawerCount.textContent = totalQty;

  if (subtotalEl) subtotalEl.textContent = `${state.restaurantSettings.currencySymbol || 'R$'} ${formatPrice(subtotal)}`;
  if (serviceTaxEl) serviceTaxEl.textContent = `${state.restaurantSettings.currencySymbol || 'R$'} ${formatPrice(serviceTax)}`;
  if (totalEl) totalEl.textContent = `${state.restaurantSettings.currencySymbol || 'R$'} ${formatPrice(total)}`;

  // Se o carrinho estiver vazio
  if (state.cartItems.length === 0) {
    if (cartContainer) {
      cartContainer.innerHTML = `
        <div class="py-12 text-center text-slate-500">
          <i data-lucide="shopping-bag" class="w-10 h-10 mx-auto mb-2 opacity-30 text-amber-400"></i>
          <p class="text-sm">Nenhum item na comanda ainda.</p>
          <p class="text-xs text-slate-600 mt-1">Toque nos itens do cardápio para adicionar.</p>
        </div>
      `;
    }
    if (window.lucide) lucide.createIcons();
    return;
  }

  if (cartContainer) {
    cartContainer.innerHTML = state.cartItems.map(item => `
      <div class="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex flex-col gap-2">
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1">
            <h4 class="text-sm font-bold text-slate-100">${item.name}</h4>
            <div class="text-xs text-amber-400 font-semibold">
              ${state.restaurantSettings.currencySymbol || 'R$'} ${formatPrice(item.price)} x ${item.qty} = ${state.restaurantSettings.currencySymbol || 'R$'} ${formatPrice(item.price * item.qty)}
            </div>
            ${item.notes ? `
              <div class="mt-1 text-[11px] text-amber-300/90 italic bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/20">
                Obs: ${item.notes}
              </div>
            ` : ''}
          </div>

          <div class="flex items-center gap-1.5">
            <button 
              onclick="changeCartQty('${item.id}', -1)" 
              class="w-6 h-6 rounded bg-slate-800 text-amber-400 flex items-center justify-center text-xs font-bold hover:bg-slate-700"
            >-</button>
            <span class="text-xs font-bold text-white px-1">${item.qty}</span>
            <button 
              onclick="changeCartQty('${item.id}', 1)" 
              class="w-6 h-6 rounded bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-bold hover:bg-amber-400"
            >+</button>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 text-[11px]">
          <button 
            onclick="openItemNoteModal('${item.id}')"
            class="text-slate-400 hover:text-amber-400 flex items-center gap-1 transition-colors"
          >
            <i data-lucide="edit-3" class="w-3 h-3"></i>
            ${item.notes ? 'Editar obs' : '+ Observação'}
          </button>
        </div>
      </div>
    `).join('');
  }

  if (window.lucide) lucide.createIcons();
}

// --- SALVAR / EMITIR COMANDA ---
async function finalizeOrder(status = 'Aberta') {
  if (state.cartItems.length === 0) {
    showToast('Adicione pelo menos 1 item ao pedido!', 'warning');
    return;
  }

  const tableInput = document.getElementById('orderTableInput');
  const customerInput = document.getElementById('orderCustomerInput');
  const waiterInput = document.getElementById('orderWaiterInput');

  const table = (tableInput && tableInput.value.trim()) || state.currentOrderIdentity.tableNumber || 'Mesa Balcão';
  const customer = customerInput ? customerInput.value.trim() : '';
  const waiter = waiterInput ? waiterInput.value.trim() : '';

  const subtotal = state.cartItems.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const serviceTax = (subtotal * (state.restaurantSettings.serviceTaxPercent || 10)) / 100;
  const total = subtotal + serviceTax;

  const orderId = state.editingOrderId || `CMD-${Date.now().toString().slice(-6)}`;

  const orderData = {
    id: orderId,
    orderCode: `#${orderId.replace('CMD-', '')}`,
    table,
    customer,
    waiter,
    items: [...state.cartItems],
    subtotal,
    serviceTax,
    total,
    status, // 'Aberta', 'Na Cozinha', 'Pronta', 'Fechada'
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await window.syncManager.saveOrder(orderData);
  
  // Limpa comanda atual
  state.cartItems = [];
  state.editingOrderId = null;
  if (customerInput) customerInput.value = '';

  renderCart();
  renderMenu();
  closeCartDrawer();
  
  showToast(`Comanda ${orderData.orderCode} salva com sucesso!`, 'success');

  // Atualiza comandas e vai para tela de comandas
  state.orders = await window.syncManager.getOrders();
  renderOrders();
  switchTab('orders');
}

// --- GESTÃO DE COMANDAS ABERTAS (KANBAN / CARDS) ---
function renderOrders() {
  const container = document.getElementById('ordersListContainer');
  if (!container) return;

  const activeOrders = state.orders.filter(o => o.status !== 'Fechada');
  const closedOrders = state.orders.filter(o => o.status === 'Fechada');

  if (state.orders.length === 0) {
    container.innerHTML = `
      <div class="py-20 text-center text-slate-400">
        <i data-lucide="clipboard-list" class="w-14 h-14 mx-auto mb-3 opacity-30 text-amber-400"></i>
        <h3 class="text-lg font-bold text-slate-200">Nenhuma comanda criada</h3>
        <p class="text-sm text-slate-500 mt-1 max-w-sm mx-auto">Vá até o menu de cardápio, escolha os pratos e clique em Salvar Comanda.</p>
        <button 
          onclick="switchTab('menu')"
          class="mt-6 px-6 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider hover:bg-amber-400 shadow-lg shadow-amber-500/20"
        >
          Criar Nova Comanda
        </button>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  container.innerHTML = `
    <!-- Comandas Ativas -->
    <div class="mb-8">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-bold text-slate-100 flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          Comandas em Andamento (${activeOrders.length})
        </h2>
        <button 
          onclick="switchTab('menu')"
          class="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-500/30"
        >
          <i data-lucide="plus" class="w-3.5 h-3.5"></i> Nova Comanda
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${activeOrders.map(order => renderOrderCard(order)).join('')}
      </div>
    </div>

    <!-- Comandas Fechadas / Histórico -->
    ${closedOrders.length > 0 ? `
      <div class="mt-12 pt-6 border-t border-slate-800">
        <h3 class="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-400"></i>
          Comandas Encerradas Recentemente (${closedOrders.length})
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-75 hover:opacity-100 transition-opacity">
          ${closedOrders.map(order => renderOrderCard(order)).join('')}
        </div>
      </div>
    ` : ''}
  `;

  if (window.lucide) lucide.createIcons();
}

function renderOrderCard(order) {
  const statusColorMap = {
    'Aberta': 'bg-blue-950/80 text-blue-300 border-blue-500/30',
    'Na Cozinha': 'bg-amber-950/80 text-amber-300 border-amber-500/30',
    'Pronta': 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30',
    'Fechada': 'bg-slate-800 text-slate-400 border-slate-700'
  };

  const statusClass = statusColorMap[order.status] || statusColorMap['Aberta'];
  const formattedTime = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return `
    <div class="glass-panel rounded-2xl p-4 flex flex-col justify-between border border-slate-800 hover:border-amber-500/40 transition-all bg-slate-900/70">
      <div>
        <div class="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-base font-extrabold text-white">${order.table}</span>
              <span class="text-xs font-mono font-semibold text-amber-400">${order.orderCode}</span>
            </div>
            ${order.customer ? `<p class="text-xs text-slate-400">Cliente: <strong class="text-slate-200">${order.customer}</strong></p>` : ''}
          </div>

          <div class="flex flex-col items-end gap-1">
            <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusClass}">
              ${order.status}
            </span>
            <span class="text-[10px] text-slate-500 font-mono">${formattedTime}</span>
          </div>
        </div>

        <!-- Lista de itens da comanda -->
        <div class="my-3 space-y-1.5 max-h-44 overflow-y-auto pr-1">
          ${order.items.map(it => `
            <div class="flex items-start justify-between text-xs">
              <div class="flex-1 pr-2">
                <span class="font-bold text-amber-400">${it.qty}x</span>
                <span class="text-slate-200">${it.name}</span>
                ${it.notes ? `<div class="text-[10px] text-amber-300/80 italic pl-4">↳ ${it.notes}</div>` : ''}
              </div>
              <span class="text-slate-400 font-mono">${state.restaurantSettings.currencySymbol || 'R$'} ${formatPrice(it.price * it.qty)}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Rodapé do Card -->
      <div class="pt-3 border-t border-slate-800">
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs text-slate-400">Total a pagar:</span>
          <span class="text-base font-extrabold text-amber-400 font-mono">
            ${state.restaurantSettings.currencySymbol || 'R$'} ${formatPrice(order.total)}
          </span>
        </div>

        <div class="grid grid-cols-2 gap-2 text-xs">
          <!-- Ações de Status -->
          ${order.status !== 'Fechada' ? `
            <select 
              onchange="changeOrderStatus('${order.id}', this.value)"
              class="w-full bg-slate-800 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 border border-slate-700 font-medium focus:outline-none focus:border-amber-400"
            >
              <option value="Aberta" ${order.status === 'Aberta' ? 'selected' : ''}>Status: Aberta</option>
              <option value="Na Cozinha" ${order.status === 'Na Cozinha' ? 'selected' : ''}>Status: Na Cozinha</option>
              <option value="Pronta" ${order.status === 'Pronta' ? 'selected' : ''}>Status: Pronta</option>
              <option value="Fechada">Status: Fechar Conta</option>
            </select>

            <button 
              onclick="editOrder('${order.id}')"
              class="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center justify-center gap-1 border border-slate-700"
            >
              <i data-lucide="edit" class="w-3.5 h-3.5 text-amber-400"></i> Editar
            </button>
          ` : `
            <button 
              onclick="reopenOrder('${order.id}')"
              class="col-span-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-semibold flex items-center justify-center gap-1 border border-slate-700"
            >
              <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i> Reabrir
            </button>
          `}

          <div class="col-span-2 flex items-center gap-1.5 mt-1">
            <button 
              onclick="shareOrderWhatsApp('${order.id}')"
              title="Mandar resumo pelo WhatsApp"
              class="flex-1 py-1.5 rounded-xl bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 font-semibold border border-emerald-500/30 flex items-center justify-center gap-1.5 text-xs transition-colors"
            >
              <i data-lucide="message-circle" class="w-3.5 h-3.5"></i> WhatsApp
            </button>

            <button 
              onclick="printOrderReceipt('${order.id}')"
              title="Imprimir cupom da comanda"
              class="flex-1 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700 flex items-center justify-center gap-1.5 text-xs transition-colors"
            >
              <i data-lucide="printer" class="w-3.5 h-3.5 text-amber-400"></i> Imprimir
            </button>

            <button 
              onclick="deleteOrderConfirm('${order.id}')"
              title="Excluir comanda"
              class="p-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/70 text-rose-400 border border-rose-500/30 transition-colors"
            >
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function changeOrderStatus(orderId, newStatus) {
  const order = state.orders.find(o => o.id === orderId);
  if (!order) return;

  order.status = newStatus;
  order.updatedAt = new Date().toISOString();
  await window.syncManager.saveOrder(order);
  showToast(`Comanda ${order.orderCode} alterada para "${newStatus}"`);
  renderOrders();
}

async function reopenOrder(orderId) {
  await changeOrderStatus(orderId, 'Aberta');
}

function editOrder(orderId) {
  const order = state.orders.find(o => o.id === orderId);
  if (!order) return;

  state.editingOrderId = order.id;
  state.cartItems = [...order.items];

  const tableInput = document.getElementById('orderTableInput');
  const customerInput = document.getElementById('orderCustomerInput');
  if (tableInput) tableInput.value = order.table;
  if (customerInput) customerInput.value = order.customer || '';

  renderCart();
  renderMenu();
  openCartDrawer();
  switchTab('menu');
  showToast(`Editando comanda ${order.orderCode}`);
}

async function deleteOrderConfirm(orderId) {
  if (confirm('Tem certeza de que deseja excluir permanentemente esta comanda?')) {
    await window.syncManager.deleteOrder(orderId);
    state.orders = state.orders.filter(o => o.id !== orderId);
    renderOrders();
    updateHeaderCounters();
    showToast('Comanda excluída!', 'warning');
  }
}

// --- IMPRESSÃO & COMPARTILHAMENTO ---
function shareOrderWhatsApp(orderId) {
  const order = state.orders.find(o => o.id === orderId);
  if (!order) return;

  const s = state.restaurantSettings;
  let text = `🧾 *${s.restaurantName || 'RESTAURANTE GOURMET'}*\n`;
  text += `📍 *${order.table}* (${order.orderCode})\n`;
  if (order.customer) text += `👤 Cliente: ${order.customer}\n`;
  text += `⏰ Horário: ${new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n`;
  text += `---------------------------------\n`;
  
  order.items.forEach(it => {
    text += `• ${it.qty}x ${it.name} - ${s.currencySymbol} ${formatPrice(it.price * it.qty)}\n`;
    if (it.notes) text += `   ↳ Obs: ${it.notes}\n`;
  });

  text += `---------------------------------\n`;
  text += `Subtotal: ${s.currencySymbol} ${formatPrice(order.subtotal)}\n`;
  if (order.serviceTax > 0) text += `Serviço (${s.serviceTaxPercent}%): ${s.currencySymbol} ${formatPrice(order.serviceTax)}\n`;
  text += `*TOTAL: ${s.currencySymbol} ${formatPrice(order.total)}*\n\n`;
  text += `_${s.tagline || 'Obrigado pela preferência!'}_`;

  const encoded = encodeURIComponent(text);
  window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
}

function printOrderReceipt(orderId) {
  const order = state.orders.find(o => o.id === orderId);
  if (!order) return;

  const s = state.restaurantSettings;
  const printArea = document.getElementById('printReceiptArea');
  if (!printArea) return;

  printArea.innerHTML = `
    <div style="font-family: monospace; max-width: 300px; margin: 0 auto; padding: 15px; color: #000; font-size: 13px;">
      <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px;">
        <h2 style="margin: 0; font-size: 18px; font-weight: bold;">${s.restaurantName || 'RESTAURANTE'}</h2>
        <p style="margin: 3px 0 0; font-size: 11px;">${s.tagline || ''}</p>
        <p style="margin: 3px 0 0; font-size: 12px; font-weight: bold;">COMANDA: ${order.orderCode} - ${order.table}</p>
        <p style="margin: 2px 0 0; font-size: 11px;">Data: ${new Date(order.createdAt).toLocaleString('pt-BR')}</p>
        ${order.customer ? `<p style="margin: 2px 0 0; font-size: 11px;">Cliente: ${order.customer}</p>` : ''}
      </div>

      <div style="border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px;">
        ${order.items.map(it => `
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>${it.qty}x ${it.name}</span>
            <span>${s.currencySymbol} ${formatPrice(it.price * it.qty)}</span>
          </div>
          ${it.notes ? `<div style="font-size: 10px; font-style: italic; margin-bottom: 4px;">↳ Obs: ${it.notes}</div>` : ''}
        `).join('')}
      </div>

      <div style="text-align: right; margin-bottom: 10px;">
        <div>Subtotal: ${s.currencySymbol} ${formatPrice(order.subtotal)}</div>
        ${order.serviceTax > 0 ? `<div>Serviço (${s.serviceTaxPercent}%): ${s.currencySymbol} ${formatPrice(order.serviceTax)}</div>` : ''}
        <div style="font-size: 16px; font-weight: bold; margin-top: 5px;">TOTAL: ${s.currencySymbol} ${formatPrice(order.total)}</div>
      </div>

      <div style="text-align: center; font-size: 11px; margin-top: 15px; border-top: 1px dashed #000; padding-top: 10px;">
        <p style="margin: 0;">Agradecemos sua preferência!</p>
      </div>
    </div>
  `;

  window.print();
}

// --- DRAWER DO CARRINHO (MOBILE & DESKTOP) ---
function toggleCartDrawer() {
  const drawer = document.getElementById('cartDrawer');
  if (drawer) {
    drawer.classList.toggle('translate-x-full');
    drawer.classList.toggle('translate-x-0');
  }
}

function openCartDrawer() {
  const drawer = document.getElementById('cartDrawer');
  if (drawer) {
    drawer.classList.remove('translate-x-full');
    drawer.classList.add('translate-x-0');
  }
}

function closeCartDrawer() {
  const drawer = document.getElementById('cartDrawer');
  if (drawer) {
    drawer.classList.add('translate-x-full');
    drawer.classList.remove('translate-x-0');
  }
}

// --- CONFIGURAÇÕES DO RESTAURANTE & PRODUTOS ---
function populateSettingsForm() {
  const s = state.restaurantSettings;
  const nameInp = document.getElementById('settingsRestName');
  const taglineInp = document.getElementById('settingsTagline');
  const logoInp = document.getElementById('settingsLogoUrl');
  const taxInp = document.getElementById('settingsServiceTax');

  if (nameInp) nameInp.value = s.restaurantName || '';
  if (taglineInp) taglineInp.value = s.tagline || '';
  if (logoInp) logoInp.value = s.logoUrl || '';
  if (taxInp) taxInp.value = s.serviceTaxPercent || 10;

  // Carrega credenciais do Firebase se salvas
  const savedFirebase = window.syncManager.getSavedFirebaseConfig();
  if (savedFirebase) {
    const fInp = document.getElementById('settingsFirebaseJson');
    if (fInp) fInp.value = JSON.stringify(savedFirebase, null, 2);
  }

  renderManageProductsList();
}

function saveRestaurantSettings(e) {
  if (e) e.preventDefault();

  const name = document.getElementById('settingsRestName').value.trim();
  const tagline = document.getElementById('settingsTagline').value.trim();
  const logoUrl = document.getElementById('settingsLogoUrl').value.trim();
  const tax = parseFloat(document.getElementById('settingsServiceTax').value) || 0;

  state.restaurantSettings = {
    ...state.restaurantSettings,
    restaurantName: name,
    tagline: tagline,
    logoUrl: logoUrl,
    serviceTaxPercent: tax
  };

  window.syncManager.saveSettings(state.restaurantSettings);
  applyRestaurantBranding();
  renderCart();
  showToast('Identidade do restaurante atualizada!');
}

function saveFirebaseCredentials(e) {
  if (e) e.preventDefault();
  const jsonStr = document.getElementById('settingsFirebaseJson').value.trim();
  
  if (!jsonStr) {
    showToast('Cole o JSON de configuração do Firebase', 'warning');
    return;
  }

  try {
    const config = JSON.parse(jsonStr);
    const success = window.syncManager.saveFirebaseConfig(config);
    if (success) {
      showToast('Nuvem Firebase conectada com sucesso!', 'success');
    } else {
      showToast('Configuração salva. Recarregue a página para conectar.', 'info');
    }
  } catch (err) {
    showToast('JSON do Firebase inválido. Verifique o formato.', 'warning');
  }
}

// Adicionar Novo Produto no Cardápio
function addNewProduct(e) {
  if (e) e.preventDefault();

  const name = document.getElementById('newProdName').value.trim();
  const category = document.getElementById('newProdCategory').value.trim();
  const price = parseFloat(document.getElementById('newProdPrice').value) || 0;
  const desc = document.getElementById('newProdDesc').value.trim();
  const img = document.getElementById('newProdImg').value.trim() || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
  const badge = document.getElementById('newProdBadge').value.trim();

  if (!name || !price) {
    showToast('Informe o nome e o preço do item', 'warning');
    return;
  }

  const newProduct = {
    id: `prod-${Date.now()}`,
    name,
    category: category || 'Geral',
    price,
    description: desc,
    image: img,
    badge
  };

  state.menuItems.unshift(newProduct);
  window.syncManager.saveMenu(state.menuItems);

  // Limpa formulário
  document.getElementById('newProductForm').reset();

  renderCategories();
  renderMenu();
  renderManageProductsList();
  showToast(`Item "${name}" adicionado ao cardápio!`);
}

function deleteMenuItem(id) {
  if (confirm('Deseja remover este item do cardápio?')) {
    state.menuItems = state.menuItems.filter(i => i.id !== id);
    window.syncManager.saveMenu(state.menuItems);
    renderCategories();
    renderMenu();
    renderManageProductsList();
    showToast('Item removido do cardápio.');
  }
}

function renderManageProductsList() {
  const container = document.getElementById('manageProductsList');
  if (!container) return;

  container.innerHTML = state.menuItems.map(item => `
    <div class="flex items-center justify-between p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
      <div class="flex items-center gap-3">
        <img src="${item.image}" class="w-12 h-12 object-cover rounded-lg" onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=100&q=80'" />
        <div>
          <h4 class="text-sm font-bold text-white">${item.name}</h4>
          <p class="text-xs text-amber-400 font-semibold">${state.restaurantSettings.currencySymbol || 'R$'} ${formatPrice(item.price)} • <span class="text-slate-400">${item.category}</span></p>
        </div>
      </div>
      <button 
        onclick="deleteMenuItem('${item.id}')"
        class="p-2 text-rose-400 hover:bg-rose-950/60 rounded-lg transition-colors"
        title="Remover produto"
      >
        <i data-lucide="trash-2" class="w-4 h-4"></i>
      </button>
    </div>
  `).join('');

  if (window.lucide) lucide.createIcons();
}

// --- UTILS & EVENTOS ---
function formatPrice(val) {
  return Number(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function updateHeaderCounters() {
  const activeCount = state.orders.filter(o => o.status !== 'Fechada').length;
  const badge = document.getElementById('activeOrdersCountBadge');
  if (badge) {
    badge.textContent = activeCount;
    badge.style.display = activeCount > 0 ? 'inline-flex' : 'none';
  }
}

function showToast(message, type = 'info') {
  const toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) return;

  const toast = document.createElement('div');
  const iconName = type === 'success' ? 'check-circle' : type === 'warning' ? 'alert-triangle' : 'info';
  
  toast.className = 'glass-panel px-4 py-3 rounded-xl border border-amber-500/40 shadow-2xl flex items-center gap-3 text-xs font-semibold text-slate-100 transform transition-all duration-300 translate-y-3 opacity-0';
  toast.innerHTML = `
    <i data-lucide="${iconName}" class="w-4 h-4 text-amber-400 flex-shrink-0"></i>
    <span>${message}</span>
  `;

  toastContainer.appendChild(toast);
  if (window.lucide) lucide.createIcons();

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-3', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 2600);
}

function setupEventListeners() {
  const searchInput = document.getElementById('menuSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      renderMenu();
    });
  }
}
