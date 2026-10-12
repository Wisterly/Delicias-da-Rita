import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  Firestore,
  getDocs
} from 'firebase/firestore';
import { Order, Product, Settings } from './types';

// Dados iniciais padrão de "Delícias da Rita"
export const DEFAULT_SETTINGS: Settings = {
  restaurantName: "Delícias da Rita",
  logoUrl: "/logo-rita.png"
};

export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: "prod-1",
    name: "Feijoada Completa da Rita",
    price: 49.90,
    category: "Pratos Principais",
    description: "Feijão preto encorpado com carnes nobres, arroz branco soltinho, couve refogada no alho, farofa crocante e laranja.",
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "prod-2",
    name: "Escondidinho de Carne Seca",
    price: 42.00,
    category: "Pratos Principais",
    description: "Purê cremoso de mandioca artesanal, recheio farto de carne seca desfiada e queijo coalho gratinado.",
    image: "https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "prod-3",
    name: "Galinhada Caipira com Pequi",
    price: 45.00,
    category: "Pratos Principais",
    description: "Frango caipira cozido lentamente no caldo temperado com açafrão da terra, arroz e cheiro-verde fresco.",
    image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "prod-4",
    name: "Bobó de Camarão Cremoso",
    price: 58.00,
    category: "Pratos Principais",
    description: "Camarões frescos refogados no azeite de dendê, creme aveludado de aipim com leite de coco e pimentões.",
    image: "https://images.unsplash.com/photo-1551248429-40975aa4de74?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "prod-5",
    name: "Porção de Torresmo Pururuca",
    price: 28.00,
    category: "Petiscos & Entradas",
    description: "Torresmo artesanal super crocante por fora e macio por dentro, servido com gomos de limão caipira.",
    image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "prod-6",
    name: "Pastelzinhos de Angu (6 unid)",
    price: 26.00,
    category: "Petiscos & Entradas",
    description: "Massa de milho tradicional frita na hora, recheados com carne moída temperadinha e queijo minas.",
    image: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "prod-7",
    name: "Suco de Laranja da Fazenda 500ml",
    price: 12.00,
    category: "Bebidas",
    description: "Espremido na hora, doce e natural.",
    image: "https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "prod-8",
    name: "Caipirinha Tradicional de Cachaça",
    price: 20.00,
    category: "Bebidas",
    description: "Cachaça artesanal de alambique, limão taiti fresco e açúcar cristal.",
    image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "prod-9",
    name: "Pudim de Leite da Vovó",
    price: 16.00,
    category: "Sobremesas",
    description: "Textura aveludada sem furinhos com calda caramelizada dourada irresistível.",
    image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80"
  }
];

export const DEFAULT_ORDERS: Order[] = [
  {
    id: "cmd-1",
    orderCode: "#101",
    table: "Mesa 03",
    customer: "Família Souza",
    status: "Aberta",
    items: [
      {
        id: "prod-1",
        name: "Feijoada Completa da Rita",
        price: 49.90,
        qty: 2,
        notes: "Farofa extra"
      },
      {
        id: "prod-7",
        name: "Suco de Laranja da Fazenda 500ml",
        price: 12.00,
        qty: 2,
        notes: "Sem açúcar"
      }
    ],
    total: 123.80,
    createdAt: new Date().toISOString()
  }
];

class CloudSyncService {
  private app: FirebaseApp | null = null;
  private db: Firestore | null = null;
  public isConnected: boolean = false;

  constructor() {
    this.init();
  }

  public init(): boolean {
    const savedConfig = this.getSavedConfig();
    if (savedConfig && savedConfig.apiKey && savedConfig.projectId) {
      try {
        if (!getApps().length) {
          this.app = initializeApp(savedConfig);
        } else {
          this.app = getApp();
        }
        this.db = getFirestore(this.app);
        this.isConnected = true;
        console.log("Firebase Firestore conectado com sucesso!");
        return true;
      } catch (err) {
        console.warn("Erro ao inicializar Firebase:", err);
        this.isConnected = false;
        return false;
      }
    }
    this.isConnected = false;
    return false;
  }

  public getSavedConfig(): any | null {
    try {
      const item = localStorage.getItem('delicias_firebase_config');
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  }

  public saveConfig(config: any): boolean {
    try {
      localStorage.setItem('delicias_firebase_config', JSON.stringify(config));
      return this.init();
    } catch (err) {
      console.error("Erro ao salvar config do Firebase:", err);
      return false;
    }
  }

  // --- ESCUTA EM TEMPO REAL: COMANDAS ---
  public subscribeOrders(onUpdate: (orders: Order[]) => void): () => void {
    if (this.isConnected && this.db) {
      const ordersCol = collection(this.db, 'orders');
      return onSnapshot(ordersCol, (snapshot) => {
        const list: Order[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Order);
        });
        // Ordena por data mais recente
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        localStorage.setItem('delicias_orders_cache', JSON.stringify(list));
        onUpdate(list);
      }, (err) => {
        console.warn("Erro no listener do Firestore:", err);
        onUpdate(this.getLocalOrders());
      });
    }

    // Fallback Local
    onUpdate(this.getLocalOrders());
    const interval = setInterval(() => {
      onUpdate(this.getLocalOrders());
    }, 2500);
    return () => clearInterval(interval);
  }

  public async saveOrder(order: Order): Promise<void> {
    // 1. Salva local
    const local = this.getLocalOrders();
    const idx = local.findIndex(o => o.id === order.id);
    if (idx >= 0) local[idx] = order;
    else local.unshift(order);
    localStorage.setItem('delicias_orders_cache', JSON.stringify(local));

    // 2. Salva no Firestore
    if (this.isConnected && this.db) {
      try {
        await setDoc(doc(this.db, 'orders', order.id), order, { merge: true });
      } catch (e) {
        console.error("Erro ao salvar comanda no Firestore:", e);
      }
    }
  }

  public async deleteOrder(orderId: string): Promise<void> {
    // 1. Local
    let local = this.getLocalOrders();
    local = local.filter(o => o.id !== orderId);
    localStorage.setItem('delicias_orders_cache', JSON.stringify(local));

    // 2. Firestore
    if (this.isConnected && this.db) {
      try {
        await deleteDoc(doc(this.db, 'orders', orderId));
      } catch (e) {
        console.error("Erro ao excluir comanda no Firestore:", e);
      }
    }
  }

  public getLocalOrders(): Order[] {
    try {
      const data = localStorage.getItem('delicias_orders_cache');
      return data ? JSON.parse(data) : DEFAULT_ORDERS;
    } catch {
      return DEFAULT_ORDERS;
    }
  }

  // --- ESCUTA EM TEMPO REAL: PRODUTOS ---
  public subscribeProducts(onUpdate: (products: Product[]) => void): () => void {
    if (this.isConnected && this.db) {
      const prodCol = collection(this.db, 'products');
      return onSnapshot(prodCol, (snapshot) => {
        const list: Product[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Product);
        });
        if (list.length > 0) {
          localStorage.setItem('delicias_products_cache', JSON.stringify(list));
          onUpdate(list);
        } else {
          // Se vazio, salva os pratos padrão
          this.seedInitialProducts();
          onUpdate(DEFAULT_PRODUCTS);
        }
      }, () => {
        onUpdate(this.getLocalProducts());
      });
    }

    onUpdate(this.getLocalProducts());
    return () => {};
  }

  private async seedInitialProducts() {
    if (this.isConnected && this.db) {
      for (const p of DEFAULT_PRODUCTS) {
        await setDoc(doc(this.db, 'products', p.id), p, { merge: true });
      }
    }
  }

  public async saveProduct(product: Product): Promise<void> {
    const local = this.getLocalProducts();
    const idx = local.findIndex(p => p.id === product.id);
    if (idx >= 0) local[idx] = product;
    else local.unshift(product);
    localStorage.setItem('delicias_products_cache', JSON.stringify(local));

    if (this.isConnected && this.db) {
      try {
        await setDoc(doc(this.db, 'products', product.id), product, { merge: true });
      } catch (e) {
        console.error("Erro ao salvar produto no Firestore:", e);
      }
    }
  }

  public async deleteProduct(productId: string): Promise<void> {
    let local = this.getLocalProducts();
    local = local.filter(p => p.id !== productId);
    localStorage.setItem('delicias_products_cache', JSON.stringify(local));

    if (this.isConnected && this.db) {
      try {
        await deleteDoc(doc(this.db, 'products', productId));
      } catch (e) {
        console.error("Erro ao excluir produto no Firestore:", e);
      }
    }
  }

  public getLocalProducts(): Product[] {
    try {
      const data = localStorage.getItem('delicias_products_cache');
      return data ? JSON.parse(data) : DEFAULT_PRODUCTS;
    } catch {
      return DEFAULT_PRODUCTS;
    }
  }

  // --- CONFIGURAÇÕES DA EMPRESA ---
  public subscribeSettings(onUpdate: (settings: Settings) => void): () => void {
    if (this.isConnected && this.db) {
      return onSnapshot(doc(this.db, 'settings', 'general'), (docSnap) => {
        if (docSnap.exists()) {
          const s = docSnap.data() as Settings;
          localStorage.setItem('delicias_settings_cache', JSON.stringify(s));
          onUpdate(s);
        } else {
          onUpdate(this.getLocalSettings());
        }
      }, () => {
        onUpdate(this.getLocalSettings());
      });
    }

    onUpdate(this.getLocalSettings());
    return () => {};
  }

  public async saveSettings(settings: Settings): Promise<void> {
    localStorage.setItem('delicias_settings_cache', JSON.stringify(settings));
    if (this.isConnected && this.db) {
      try {
        await setDoc(doc(this.db, 'settings', 'general'), settings, { merge: true });
      } catch (e) {
        console.error("Erro ao salvar settings no Firestore:", e);
      }
    }
  }

  public getLocalSettings(): Settings {
    try {
      const data = localStorage.getItem('delicias_settings_cache');
      return data ? JSON.parse(data) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }
}

export const cloudSync = new CloudSyncService();
