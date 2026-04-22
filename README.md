# 🧠 Study Dashboard - Método de Alta Performance

Um web-app construído para otimizar, estruturar e rastrear sessões avançadas de estudos para concursos e exames. 
A arquitetura do aplicativo e suas funcionalidades são amplamente baseadas no **Método Gleyson Azevedo**, focando na alternância cognitiva (para evitar fadiga), divisão de fases de estudo e registro granular de progresso.

O projeto traz um design com apelo premium ("Dark Glass") desenhado visando ser inteiramente _distraction-free_ na hora de botar a mão na massa.

---

## 🚀 Principais Features

### 1. ⏱️ Cronômetro Multi-Fase Inteligente (`TimerView`)
- Uma engine de cronometria focada na produtividade. Recebe a carga horária e a reparte de forma parametrizada:
  - **Reprise Inicial:** 3 min (Recuperação forçada de memória do que foi estudado ontem).
  - **Fase 1 (Teoria/Aprender):** 85% do tempo. (Com travas em tela cheia).
  - **Fase 2 (Revisão):** 10% do tempo.
  - **Fase 3 (Questões em Lote):** 5% do tempo para validação passiva.
- Registro cumulativo automático no banco de dados local após cada sessão.

### 2. 📚 Criador de Ciclos Antifadiga (`CycleView`)
- Um montador de filas de disciplinas com funcionalidade *Drag-and-Drop* e medidor cognitivo.
- Classifica disciplinas por carga de estresse: Teórica (Verde), Cálculo (Vermelho) e Analítica (Amarelo).
- Gera alertas dinâmicos prevenindo o choque cognitivo (ex: não encavalar duas matérias pesadas de cálculo em sequência).

### 3. 📈 Visão 30D e Heatmaps de Performance (`CycleDashboardView` & `WeeklyStatsView`)
- Gera e salva "Instâncias Fotográficas de Ciclo".
- Contém um **Contribution Graph** (Semelhante ao GitHub) perfeitamente simétrico de 30 dias para checagem orgânica diária das matérias vistas e revisões feitas.
- Relatório em visão macro com *Stats Semanais*, garantindo que nenhuma matéria do edital fique descoberta.
- Botão condicional de nova instância: Só libera um grid para o próximo mês quando você atingir 100% de contato com o grid deste mês.

### 4. 🎯 Controle de Edital Sistêmico (`EditalView`)
- Permite a inserção bruta do conteúdo programático com extração inteligente dos tópicos por quebra de linha.
- Possibilita avançar os tópicos entre níveis de maturidade (Fase 1, 2 e 3).
- Aglutina com a tela principal (`HomeDashboardView`), sinalizando dinamicamente quais são os "Tópicos de Atenção" que possuem alta taxa de erros.

---

## 💻 Tech Stack & Design System

* **Core:** React, Vanilla JavaScript
* **Estilização:** TailwindCSS (Foco na paleta nativa `Zinc`, tons de Dark Mode avançado, Micro-animações e Glassmorphism)
* **Build System:** Vite
* **Ícones:** Lucide React
* **Persistência de Dados:** *Local/Serverless* (Tudo é serializado em altíssima velocidade e salvo de forma atômica no `localStorage` do dispositivo para máxima privacidade e ausência de *loading states* no meio da sessão de estudos).

---

## 🛠️ Como rodar o projeto localmente

Siga o passo a passo para carregar e modificar a ferramenta na sua máquina:

1. **Clone do Repositório**
   ```bash
   git clone <ulr-do-repositorio>
   cd hbc
   ```

2. **Instalação de Dependências**
   Recomendamos a utilização do `npm` ou `yarn`.
   ```bash
   npm install
   # ou
   yarn install
   ```

3. **Iniciando o Servidor de Desenvolvimento**
   Execute o build local no Vite para iniciar com Hot-Reload na porta padrão.
   ```bash
   npm run dev
   # ou
   yarn dev
   ```

4. **Visualização**
   Abra seu navegador em [http://localhost:5173/](http://localhost:5173/) (ou na porta atribuída que aparecer no terminal).

---

## 📂 Arquitetura de Componentes Base

* `/src/components/HomeDashboardView.jsx`: Matriz e centralizadora inicial de KPIs de estudos.
* `/src/components/CycleDashboardView.jsx`: Controlador de Instâncias 30D (Heatmap de estudos).
* `/src/components/CycleView.jsx`: Gerador do ciclo em "pedras" com avaliação de taxa analítica e teórica para combate à exaustão cerebral.
* `/src/components/TimerView.jsx`: Engine principal de estudo de 3 fases e coletas de dados da sessão.
* `/src/components/ui/`: Biblioteca própria de componentes desenhados sob o espectro *Premium Dark Glass* (`Card`, `Input`, `Button`, `Badge`).

---

> _"Disciplina constrói a consistência, arquitetura visual constrói o foco."_
> Projetado para combater a procrastinação usando rastreio cognitivo e fluxo sem interrupções.
