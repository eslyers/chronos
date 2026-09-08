# 🎨 CHRONOS — Base de Conhecimento: Design System, UI e UX

> **Módulo:** Identidade Visual, Tokens, Componentes e Guia de Experiência do Usuário  
> **Prioridade de Ajuste:** Média / Alta

---

## 1. Identidade Visual e Filosofia de Design

O **CHRONOS** segue uma estética de software corporativo contemporâneo: minimalista, denso em dados e focado em clareza operacional. A interface adota o princípio de **Design Escuro Nativo (com suporte a Tema Claro)**, tipografia de alta legibilidade (`Inter / Geist`) e paletas com alto contraste funcional.

---

## 2. Sistema de Tokens e Paleta de Cores ([src/app/globals.css](file:///c:/Users/Esly_PC/.gemini/antigravity-ide/scratch/chronos/src/app/globals.css))

A aplicação utiliza variáveis CSS mapeadas no formato HSL (`hsl(var(--token))`) integradas ao Tailwind CSS:

### 2.1 Tokens Principais

| Token | Finalidade | Comportamento no Tema Escuro | Comportamento no Tema Claro |
| :--- | :--- | :--- | :--- |
| `--background` | Cor de fundo principal das páginas | Slate muito escuro (`224 71% 4%`) | Branco puro / Off-white (`0 0% 100%`) |
| `--card` | Fundo de painéis, cartões e diálogos | Slate escuro elevado (`224 71% 7%`) | Branco com borda sutil (`0 0% 100%`) |
| `--primary` | Ações principais, botões de destaque | Azul vibrante / Laranja Chronos | Azul corporativo profundo |
| `--muted-foreground`| Textos secundários, legendas e rótulos | Cinza médio de alto contraste | Cinza neutro |
| `--border` | Bordas de separação e grid | Slate translúcido (`216 34% 17%`) | Cinza suave |

### 2.2 Cores Funcionais de Status e Prioridade

* **Prioridade:**
  * `Critical`: Vermelho Carmim (`#ef4444` / `hsl(0 84% 60%)`)
  * `High`: Laranja Âmbar (`#f97316` / `hsl(24 94% 53%)`)
  * `Medium`: Azul Cobalto (`#3b82f6` / `hsl(217 91% 60%)`)
  * `Low`: Cinza Ardósia (`#64748b` / `hsl(215 16% 47%)`)
* **Status de Tarefa:**
  * `done`: Verde Esmeralda (`#10b981`)
  * `in_progress`: Azul Céu (`#0284c7`)
  * `review`: Roxo Ametista (`#8b5cf6`)
  * `blocked`: Vermelho Intenso (`#dc2626`)
  * `todo`: Cinza Neutro (`#6b7280`)

---

## 3. Arquitetura de Componentes UI (shadcn/ui + Radix)

A biblioteca de componentes baseia-se em componentes não opinativos de alta acessibilidade:
* **Modais e Diálogos:** `@radix-ui/react-dialog` e `AlertDialog` com foco automático e suporte a `Esc` e clique no overlay.
* **Menus de Contexto e Dropdowns:** `@radix-ui/react-dropdown-menu` para ações rápidas nos cartões e linhas.
* **Tooltips e Badges:** Identificação rápida de atrasos, prioridades e tags de responsáveis.

---

## 4. Oportunidades de Polimento e Ajustes de UX/UI

### 4.1 Estado Vazio (*Empty States*) Ilustrados
* **Diagnóstico:** Telas sem tarefas ou novos projetos atualmente mostram áreas em branco ou listas vazias básicas.
* **Melhoria:** Introduzir ilustrações vetoriais sutis com chamadas claras para ação (CTA): *"Nenhuma tarefa cadastrada. Clique em + Nova Tarefa ou importe uma planilha de fechamento"*.

### 4.2 Feedback de Carregamento (*Skeleton Screens*)
* **Diagnóstico:** Algumas trocas de visualização mostram apenas um ícone de spinner centralizado (`<Loader2 />`).
* **Melhoria:** Implementar skeletons estruturados com o formato do Kanban e da Tabela de Fechamento para eliminar o efeito de layout shift (*Cumulative Layout Shift - CLS*).

### 4.3 Responsividade Mobile da Sidebar e do Gantt
* **Sidebar:** O componente `AppLayout.tsx` já possui controle de abertura móvel (`isMobileSidebarOpen`), mas pode ser aprimorado com transição suave via CSS (*backdrop-blur*).
* **Gantt no Mobile:** Gráficos de Gantt complexos são inerentemente difíceis em telas pequenas. Recomenda-se adicionar um aviso automático ou fallback inteligente para a visualização em lista quando acessado em dispositivos com largura inferior a 768px.
