/**
 * Gerenciador de Sincronização em Tempo Real (Firebase Firestore + LocalStorage Fallback)
 */
class SyncManager {
  constructor() {
    this.firebaseApp = null;
    this.db = null;
    this.isCloudActive = false;
    this.listeners = [];
    this.storageKeyOrders = 'gourmet_comandas_orders';
    this.storageKeyMenu = 'gourmet_comandas_menu';
    this.storageKeySettings = 'gourmet_comandas_settings';
    this.storageKeyFirebaseConfig = 'gourmet_firebase_config';
  }

  init() {
    const savedConfig = this.getSavedFirebaseConfig();
    if (savedConfig && savedConfig.apiKey && savedConfig.projectId) {
      this.initFirebase(savedConfig);
    } else {
      console.log("Iniciando no modo de Armazenamento Local (Offline/Demo)");
      this.notifyStatus(false, "Modo Local (Offline)");
    }
  }

  getSavedFirebaseConfig() {
    try {
      const data = localStorage.getItem(this.storageKeyFirebaseConfig);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  saveFirebaseConfig(config) {
    try {
      localStorage.setItem(this.storageKeyFirebaseConfig, JSON.stringify(config));
      return this.initFirebase(config);
    } catch (e) {
      console.error("Erro ao salvar credenciais do Firebase:", e);
      return false;
    }
  }

  initFirebase(config) {
    try {
      if (!window.firebase) {
        console.warn("SDK do Firebase ainda não disponível no window");
        return false;
      }
      if (!firebase.apps.length) {
        this.firebaseApp = firebase.initializeApp(config);
      } else {
        this.firebaseApp = firebase.app();
      }
      this.db = firebase.firestore();
      this.isCloudActive = true;
      this.notifyStatus(true, "Nuvem Conectada (Tempo Real)");
      console.log("Firebase Firestore inicializado com sucesso!");
      return true;
    } catch (err) {
      console.error("Falha ao inicializar Firebase:", err);
      this.isCloudActive = false;
      this.notifyStatus(false, "Erro ao conectar Firebase");
      return false;
    }
  }

  notifyStatus(connected, message) {
    const event = new CustomEvent('syncStatusChange', {
      detail: { connected, message }
    });
    window.dispatchEvent(event);
  }

  // --- Comandas / Pedidos ---
  async getOrders() {
    if (this.isCloudActive && this.db) {
      try {
        const snapshot = await this.db.collection('comandas').orderBy('createdAt', 'desc').get();
        const orders = [];
        snapshot.forEach(doc => orders.push({ id: doc.id, ...doc.data() }));
        return orders;
      } catch (err) {
        console.warn("Erro ao buscar da nuvem, recorrendo ao local:", err);
      }
    }
    const local = localStorage.getItem(this.storageKeyOrders);
    return local ? JSON.parse(local) : [];
  }

  async saveOrder(order) {
    // 1. Salvar localmente
    const localOrders = await this.getOrders();
    const index = localOrders.findIndex(o => o.id === order.id);
    if (index >= 0) {
      localOrders[index] = order;
    } else {
      localOrders.unshift(order);
    }
    localStorage.setItem(this.storageKeyOrders, JSON.stringify(localOrders));

    // 2. Salvar na nuvem se ativo
    if (this.isCloudActive && this.db) {
      try {
        await this.db.collection('comandas').doc(order.id).set(order, { merge: true });
      } catch (err) {
        console.error("Erro ao sincronizar comanda com o Firebase:", err);
      }
    }
    return order;
  }

  async deleteOrder(orderId) {
    // 1. Deletar local
    let localOrders = await this.getOrders();
    localOrders = localOrders.filter(o => o.id !== orderId);
    localStorage.setItem(this.storageKeyOrders, JSON.stringify(localOrders));

    // 2. Deletar nuvem
    if (this.isCloudActive && this.db) {
      try {
        await this.db.collection('comandas').doc(orderId).delete();
      } catch (err) {
        console.error("Erro ao deletar comanda no Firebase:", err);
      }
    }
  }

  subscribeToOrders(callback) {
    if (this.isCloudActive && this.db) {
      return this.db.collection('comandas').onSnapshot((snapshot) => {
        const orders = [];
        snapshot.forEach(doc => orders.push({ id: doc.id, ...doc.data() }));
        // Ordena por data mais recente
        orders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        localStorage.setItem(this.storageKeyOrders, JSON.stringify(orders));
        callback(orders);
      }, (error) => {
        console.warn("Erro no listener do Firestore:", error);
      });
    }
    return null;
  }

  // --- Menu / Cardápio ---
  getMenu() {
    const saved = localStorage.getItem(this.storageKeyMenu);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_MENU_ITEMS;
      }
    }
    localStorage.setItem(this.storageKeyMenu, JSON.stringify(DEFAULT_MENU_ITEMS));
    return DEFAULT_MENU_ITEMS;
  }

  saveMenu(menuItems) {
    localStorage.setItem(this.storageKeyMenu, JSON.stringify(menuItems));
    if (this.isCloudActive && this.db) {
      this.db.collection('settings').doc('menu').set({ items: menuItems }).catch(console.error);
    }
  }

  // --- Configurações do Restaurante ---
  getSettings() {
    const saved = localStorage.getItem(this.storageKeySettings);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  }

  saveSettings(settings) {
    localStorage.setItem(this.storageKeySettings, JSON.stringify(settings));
    if (this.isCloudActive && this.db) {
      this.db.collection('settings').doc('restaurant').set(settings).catch(console.error);
    }
  }
}

window.syncManager = new SyncManager();
