import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  Firestore
} from 'firebase/firestore';
import { Order, Product, Settings } from './types';

// Dados reais do restaurante "Delícias da Rita"
export const DEFAULT_SETTINGS: Settings = {
  restaurantName: "Delícias da Rita",
  logoUrl: "/logo-rita.png"
};

export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: "prod-arrumadinho-grande",
    name: "Arrumadinho - Grande",
    price: 25,
    category: "Arrumadinho",
    description: "Porção grande e farta com feijão temperado, carne de sol em cubos dourada na manteiga, farofa crocante, vinagrete fresco e purê aveludado da casa.",
    image: "/produtos/arrumadinho-grande.jpg"
  },
  {
    id: "prod-arrumadinho-pequeno",
    name: "Arrumadinho - Pequeno",
    price: 18,
    category: "Arrumadinho",
    description: "Porção individual generosa com carne de sol selecionada em cubos, feijão temperado, farofa crocante da Rita, vinagrete fresquinho e purê especial.",
    image: "/produtos/arrumadinho-pequeno.jpg"
  },
  {
    id: "prod-creme-galinha-grande",
    name: "Creme de Galinha - Grande",
    price: 10,
    category: "Cremes & Caldos",
    description: "Tigela grande com o tradicional e aclamado creme de galinha da Rita: frango desfiado suculento, creme aveludado de milho, azeitonas e cheiro-verde.",
    image: "/produtos/creme-galinha-grande.jpg"
  },
  {
    id: "prod-creme-galinha-pequeno",
    name: "Creme de Galinha - Pequeno",
    price: 8,
    category: "Cremes & Caldos",
    description: "Tigela média/pequena de creme de galinha artesanal temperado no capricho, bem quentinho, com milho verde, azeitonas fatiadas e frango macio.",
    image: "/produtos/creme-galinha-pequeno.jpg"
  },
  {
    id: "prod-creme-galinha-copo",
    name: "Creme de Galinha - Copo",
    price: 6,
    category: "Cremes & Caldos",
    description: "Copo térmico prático com creme de galinha delicioso e quentinho, perfeito para uma refeição rápida e saborosa.",
    image: "/produtos/creme-galinha-copo.jpg"
  },
  {
    id: "prod-mingau-milho-grande",
    name: "Mingau de Milho - Grande",
    price: 10,
    category: "Mingaus & Doces",
    description: "Tigela grande de mingau de milho verde artesanal bem cremoso, preparado com leite condensado e polvilhado com canela em pó perfumada.",
    image: "/produtos/mingau-milho-grande.jpg"
  },
  {
    id: "prod-mingau-milho-pequeno",
    name: "Mingau de Milho - Pequeno",
    price: 8,
    category: "Mingaus & Doces",
    description: "Porção pequena de mingau de milho quentinho e reconfortante, doce na medida certa com toque sutil de canela.",
    image: "/produtos/mingau-milho-pequeno.jpg"
  },
  {
    id: "prod-mingau-milho-copo",
    name: "Mingau de Milho - Copo",
    price: 6,
    category: "Mingaus & Doces",
    description: "Copo individual de mingau de milho cremoso, quentinho e servido na hora com canela a gosto.",
    image: "/produtos/mingau-milho-copo.jpg"
  },
  {
    id: "prod-kreps-misto",
    name: "Krep's Misto",
    price: 8,
    category: "Krep's no Palito",
    description: "Crepe suíço no palito douradinho e crocante por fora, com recheio duplo e abundante de queijo mussarela derretido e presunto suculento.",
    image: "/produtos/kreps-misto.jpg"
  },
  {
    id: "prod-kreps-queijo",
    name: "Krep's de Queijo",
    price: 8,
    category: "Krep's no Palito",
    description: "Crepe suíço no palito quentinho, recheado com queijo derretido de alta cremosidade com casquinha crocante.",
    image: "/produtos/kreps-queijo.jpg"
  },
  {
    id: "prod-kreps-chocolate",
    name: "Krep's de Chocolate",
    price: 12,
    category: "Krep's no Palito",
    description: "Delicioso crepe doce no palito recheado com calda cremosa de chocolate suave que derrete a cada mordida.",
    image: "/produtos/kreps-chocolate.jpg"
  },
  {
    id: "prod-coca-cola-1-litro",
    name: "Coca-Cola 1 Litro",
    price: 12,
    category: "Bebidas",
    description: "Garrafa de Coca-Cola Original 1L, bem gelada, ideal para compartilhar na mesa.",
    image: "/produtos/coca-cola-1-litro.jpg"
  },
  {
    id: "prod-coca-cola-lata",
    name: "Coca-Cola Lata 350ml",
    price: 7,
    category: "Bebidas",
    description: "Lata de Coca-Cola Sabor Original 350ml, estupidamente gelada.",
    image: "/produtos/coca-cola-lata.jpg"
  },
  {
    id: "prod-guarana-1-litro",
    name: "Guaraná Antarctica 1 Litro",
    price: 12,
    category: "Bebidas",
    description: "Garrafa de Guaraná Antarctica 1L trincando de gelada, sabor autêntico brasileiro.",
    image: "/produtos/guarana-1-litro.jpg"
  },
  {
    id: "prod-guarana-lata",
    name: "Guaraná Antarctica Lata 350ml",
    price: 7,
    category: "Bebidas",
    description: "Lata de Guaraná Antarctica 350ml gelada na temperatura ideal.",
    image: "/produtos/guarana-lata.jpg"
  },
  {
    id: "prod-agua-mineral-500ml",
    name: "Água Mineral sem Gás 500ml",
    price: 5,
    category: "Bebidas",
    description: "Garrafa de água mineral pura e refrescante de 500ml, sem gás.",
    image: "/produtos/agua-mineral-500ml.jpg"
  },
  {
    id: "prod-heineken-garrafa",
    name: "Cerveja Heineken Garrafa 600ml",
    price: 16,
    category: "Cervejas",
    description: "Cerveja Heineken puro malte garrafa 600ml, servida trincando na mesa com balde de gelo.",
    image: "/produtos/heineken-garrafa.jpg"
  },
  {
    id: "prod-heineken-lata",
    name: "Cerveja Heineken Lata 350ml",
    price: 9,
    category: "Cervejas",
    description: "Cerveja Heineken lata 350ml puro malte, super refrescante e gelada.",
    image: "/produtos/heineken-lata.jpg"
  },
  {
    id: "prod-spaten-garrafa",
    name: "Cerveja Spaten Garrafa 600ml",
    price: 14,
    category: "Cervejas",
    description: "Cerveja puro malte Munich Helles tradicional alemã Spaten 600ml garrafa.",
    image: "/produtos/spaten-garrafa.jpg"
  },
  {
    id: "prod-spaten-lata",
    name: "Cerveja Spaten Lata 350ml",
    price: 8,
    category: "Cervejas",
    description: "Cerveja puro malte Spaten lata 350ml com sabor marcante e amargor equilibrado.",
    image: "/produtos/spaten-lata.jpg"
  },
  {
    id: "prod-stella-artois-garrafa",
    name: "Cerveja Stella Artois Garrafa 550ml",
    price: 15,
    category: "Cervejas",
    description: "Cerveja Premium Lager belga Stella Artois garrafa, sabor sofisticado e refrescante.",
    image: "/produtos/stella-artois-garrafa.jpg"
  },
  {
    id: "prod-stella-artois-lata",
    name: "Cerveja Stella Artois Lata 350ml",
    price: 8,
    category: "Cervejas",
    description: "Cerveja Stella Artois em lata 350ml, perfeita para acompanhar os pratos da Rita.",
    image: "/produtos/stella-artois-lata.jpg"
  },
  {
    id: "prod-brahma-garrafa",
    name: "Cerveja Brahma Garrafa 600ml",
    price: 12,
    category: "Cervejas",
    description: "Cerveja Brahma Chopp garrafa 600ml tradicional, o clássico chopp na garrafa.",
    image: "/produtos/brahma-garrafa.jpg"
  },
  {
    id: "prod-brahma-lata",
    name: "Cerveja Brahma Lata 350ml",
    price: 6,
    category: "Cervejas",
    description: "Cerveja Brahma Chopp lata 350ml bem geladinha.",
    image: "/produtos/brahma-lata.jpg"
  },
  {
    id: "prod-skol-garrafa",
    name: "Cerveja Skol Garrafa 600ml",
    price: 12,
    category: "Cervejas",
    description: "Cerveja Skol garrafa 600ml que desce redondo, bem estupidamente gelada.",
    image: "/produtos/skol-garrafa.jpg"
  },
  {
    id: "prod-skol-lata",
    name: "Cerveja Skol Lata 350ml",
    price: 6,
    category: "Cervejas",
    description: "Cerveja Skol lata 350ml leve e refrescante.",
    image: "/produtos/skol-lata.jpg"
  }
];

export const DEFAULT_ORDERS: Order[] = [
  {
    id: "cmd-1791819200064",
    orderCode: "#585",
    table: "Mesa 01",
    customer: "",
    status: "Finalizada",
    items: [
      {
        id: "prod-arrumadinho-grande",
        name: "Arrumadinho - Grande",
        price: 25,
        qty: 1,
        notes: ""
      },
      {
        id: "prod-mingau-milho-pequeno",
        name: "Mingau de Milho - Pequeno",
        price: 8,
        qty: 3,
        notes: ""
      },
      {
        id: "prod-agua-mineral-500ml",
        name: "Água Mineral sem Gás 500ml",
        price: 5,
        qty: 1,
        notes: ""
      },
      {
        id: "prod-guarana-1-litro",
        name: "Guaraná Antarctica 1 Litro",
        price: 12,
        qty: 1,
        notes: ""
      }
    ],
    total: 66,
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
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        localStorage.setItem('delicias_orders_cache_v2', JSON.stringify(list));
        onUpdate(list);
      }, (err) => {
        console.warn("Erro no listener do Firestore:", err);
        onUpdate(this.getLocalOrders());
      });
    }

    onUpdate(this.getLocalOrders());
    const interval = setInterval(() => {
      onUpdate(this.getLocalOrders());
    }, 2500);
    return () => clearInterval(interval);
  }

  public async saveOrder(order: Order): Promise<void> {
    const local = this.getLocalOrders();
    const idx = local.findIndex(o => o.id === order.id);
    if (idx >= 0) local[idx] = order;
    else local.unshift(order);
    localStorage.setItem('delicias_orders_cache_v2', JSON.stringify(local));

    if (this.isConnected && this.db) {
      try {
        await setDoc(doc(this.db, 'orders', order.id), order, { merge: true });
      } catch (e) {
        console.error("Erro ao salvar comanda no Firestore:", e);
      }
    }
  }

  public async deleteOrder(orderId: string): Promise<void> {
    let local = this.getLocalOrders();
    local = local.filter(o => o.id !== orderId);
    localStorage.setItem('delicias_orders_cache_v2', JSON.stringify(local));

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
      const data = localStorage.getItem('delicias_orders_cache_v2');
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
          localStorage.setItem('delicias_products_cache_v2', JSON.stringify(list));
          onUpdate(list);
        } else {
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
    localStorage.setItem('delicias_products_cache_v2', JSON.stringify(local));

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
    localStorage.setItem('delicias_products_cache_v2', JSON.stringify(local));

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
      const data = localStorage.getItem('delicias_products_cache_v2');
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
          localStorage.setItem('delicias_settings_cache_v2', JSON.stringify(s));
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
    localStorage.setItem('delicias_settings_cache_v2', JSON.stringify(settings));
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
      const data = localStorage.getItem('delicias_settings_cache_v2');
      return data ? JSON.parse(data) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }
}

export const cloudSync = new CloudSyncService();
