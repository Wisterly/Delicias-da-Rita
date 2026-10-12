export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  image?: string;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  notes?: string;
}

export type OrderStatus = 'Aberta' | 'Pronta' | 'Finalizada';

export interface Order {
  id: string;
  orderCode: string;
  table: string;
  customer?: string;
  status: OrderStatus;
  items: OrderItem[];
  total: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Settings {
  restaurantName: string;
  logoUrl: string;
}

export interface AppData {
  settings: Settings;
  products: Product[];
  orders: Order[];
}
