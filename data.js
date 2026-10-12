// Cardápio inicial pré-carregado com visual gourmet
const DEFAULT_MENU_ITEMS = [
  {
    id: "prod-1",
    name: "Burger Trufado Supreme",
    category: "Lanches",
    price: 44.90,
    description: "Blend 180g angus, queijo brie maçaricado, maionese de trufas negras e cebola caramelizada no pão brioche.",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
    badge: "Mais Pedido"
  },
  {
    id: "prod-2",
    name: "Smash Cheddar & Bacon",
    category: "Lanches",
    price: 34.50,
    description: "2 blends smash 90g crocantes, cheddar inglês cremoso derretido e tiras crocantes de bacon artesanal.",
    image: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=600&q=80",
    badge: "Clássico"
  },
  {
    id: "prod-3",
    name: "Costela BBQ Defumada",
    category: "Pratos",
    price: 68.00,
    description: "Costelinha suína desmanchando, marinada 12h em lenha de macieira com molho barbecue especial e fritas rústicas.",
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
    badge: "Chef's Choice"
  },
  {
    id: "prod-4",
    name: "Risoto de Cogumelos & Filé",
    category: "Pratos",
    price: 59.90,
    description: "Arroz arbóreo al dente, mix de cogumelos frescos (shimeji e paris), medalhão de filé mignon e parmesão gran formaggio.",
    image: "https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?auto=format&fit=crop&w=600&q=80",
    badge: "Especial"
  },
  {
    id: "prod-5",
    name: "Batata Rústica com Alecrim & Aioli",
    category: "Entradas",
    price: 28.00,
    description: "Batatas crocantes temperadas com sal marinho defumado, folhas de alecrim fresco e maionese aioli da casa.",
    image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80",
    badge: ""
  },
  {
    id: "prod-6",
    name: "Croquete de Costela com Geleia",
    category: "Entradas",
    price: 32.00,
    description: "6 unidades super recheadas com costela desfiada e catupiry, acompanhadas de geleia de pimenta levemente picante.",
    image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80",
    badge: "Favorito"
  },
  {
    id: "prod-7",
    name: "Gin Tropical Sunset",
    category: "Bebidas",
    price: 29.90,
    description: "Gin importado, Red Bull Tropical, fatias de laranja Bahia desidratada e zimbro aromático.",
    image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    badge: "Refrescante"
  },
  {
    id: "prod-8",
    name: "Soda Italiana de Frutas Vermelhas",
    category: "Bebidas",
    price: 16.00,
    description: "Xarope artesanal de amora e framboesa, água com gás e folhas frescas de hortelã.",
    image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80",
    badge: "Sem Álcool"
  },
  {
    id: "prod-9",
    name: "Cerveja Artesanal IPA 500ml",
    category: "Bebidas",
    price: 24.00,
    description: "Cerveja artesanal com lúpulos aromáticos cítricos, amargor marcante e corpo aveludado.",
    image: "https://images.unsplash.com/photo-1608270146604-00d3d5f137e0?auto=format&fit=crop&w=600&q=80",
    badge: ""
  },
  {
    id: "prod-10",
    name: "Petit Gâteau com Sorvete Belga",
    category: "Sobremesas",
    price: 27.90,
    description: "Bolinho quente de chocolate meio amargo com recheio cremoso escorrendo, servido com bola de sorvete de baunilha de Bourbon.",
    image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80",
    badge: "Tentação"
  },
  {
    id: "prod-11",
    name: "Cheesecake de Frutas Vermelhas",
    category: "Sobremesas",
    price: 25.00,
    description: "Base crocante de biscoito, creme leve de cream cheese e calda artesanal de morango e amora.",
    image: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=600&q=80",
    badge: ""
  }
];

const DEFAULT_SETTINGS = {
  restaurantName: "LE BISTROT GOURMET",
  tagline: "Onde cada pedido se torna uma experiência inesquecível",
  currencySymbol: "R$",
  serviceTaxPercent: 10,
  logoUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=150&q=80",
  contactPhone: "+55 (11) 99999-9999"
};
