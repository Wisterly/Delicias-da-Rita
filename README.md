# 🍽️ Sistema de Comandas Gourmet & Gestão Remota

Sistema web moderno, responsivo (mobile-first) e interativo para restaurantes, bares, lanchonetes e bistrôs gerenciarem pedidos e comandas de qualquer lugar pelo celular ou computador.

---

## ✨ Funcionalidades Principais

- 📱 **Mobile-First & PWA**: Totalmente otimizado para o navegador do celular com botões táteis grandes, carrinho acessível com o polegar e opção de "Instalar na Tela Inicial".
- 🏷️ **Identidade Visual Gourmet**: Personalize o **Nome do Restaurante**, **Frases de Efeito (Slogan)** e a **Logo** direto pela interface.
- 🍔 **Cardápio Interativo**: Categorias com navegação rápida (*Lanches, Pratos, Entradas, Bebidas, Sobremesas*), fotos atraentes, preços, selos especiais e busca em tempo real.
- 📝 **Comandas Inteligentes**:
  - Identificação por Mesa ou Número de Comanda e Nome do Cliente.
  - Adição rápida de itens com controle de quantidade (+ / -).
  - Observações personalizadas por item (ex: *"Sem cebola"*, *"Ponto da carne: mal passada"*, *"Gelo e limão"*).
  - Cálculo automático de subtotal, taxa de serviço (10% configurável) e total.
- 🔄 **Kanban de Comandas**:
  - Acompanhe o fluxo: `Aberta` ➔ `Na Cozinha` ➔ `Pronta` ➔ `Fechada`.
  - Reabertura e edição de comandas já criadas.
- 🖨️ **Impressão Térmica & WhatsApp**:
  - Envie o resumo da conta formatado diretamente para o WhatsApp do cliente.
  - Imprima o cupom da comanda direto na impressora térmica ou salve como PDF.
- ☁️ **Sincronização em Tempo Real (Multi-dispositivos)**:
  - Vários celulares podem abrir o mesmo link e ver os pedidos sendo atualizados ao vivo via **Google Firebase Firestore** (gratuito).
  - Fallback offline/local instantâneo no navegador.

---

## 🚀 Como Acessar Remotamente pelo Celular (Como um Site / Link)

Você pode hospedar este projeto gratuitamente na nuvem para ter um **link público** (ex: `https://seu-restaurante.netlify.app`) acessível de qualquer lugar do mundo pelo celular:

### Opção 1: Netlify Drop (Mais rápida - Sem instalar nada)
1. Acesse o site gratuito [app.netlify.com/drop](https://app.netlify.com/drop).
2. Arraste a pasta `silly-franklin` para dentro da tela do navegador.
3. Pronto! Em 5 segundos o Netlify gera um link do tipo `https://seu-restaurante.netlify.app`.
4. Abra esse link no navegador do celular (Safari no iPhone ou Chrome no Android).

### Opção 2: Vercel
1. Crie uma conta gratuita em [vercel.com](https://vercel.com).
2. Suba a pasta para o seu repositório GitHub e conecte com 1 clique na Vercel.

---

## ☁️ Ativando a Sincronização em Tempo Real (Vários celulares juntos)

Se você quiser que o garçom lance o pedido no celular dele e apareça na mesma hora na tela da cozinha:

1. Acesse o [Firebase Console](https://console.firebase.google.com/) com sua conta Google gratuita.
2. Clique em **Criar Projeto** (ex: `comandas-restaurante`).
3. No menu lateral esquerdo, vá em **Firestore Database** e clique em **Criar banco de dados** (escolha *Iniciar no modo de teste*).
4. Vá em **Configurações do Projeto** (ícone de engrenagem) ➔ **Seus aplicativos** ➔ Escolha a opção **Web (</>)**.
5. Copie o objeto `firebaseConfig` gerado (o JSON com `apiKey`, `projectId`, etc.).
6. Abra o sistema no seu navegador ou celular, vá na aba **Configurações & Nuvem**, cole o JSON no campo correspondente e clique em **Conectar à Nuvem**.
7. Pronto! A bolinha no topo ficará verde (`🟢 Nuvem Conectada`) e todos os aparelhos sincronizarão as comandas instantaneamente!

---

## 💻 Como Rodar Localmente no seu Computador

Basta dar dois cliques no arquivo `index.html` para abrir diretamente no seu navegador padrão (Google Chrome, Microsoft Edge, etc.).
