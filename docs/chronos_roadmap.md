# 🗺️ CHRONOS — Roadmap de Arquitetura Futura (Propostas 1, 2 & 3)

Este documento registra a especificação técnica e arquitetural dos módulos corporativos planejados para expansão futura do **CHRONOS Enterprise**.

---

## 📌 Módulo 1: Gestão Financeira, Orçamento & Análise de Valor Agregado (EVA)

### 🎯 Objetivo
Permitir a gestão de custos em tempo real, comparando o Orçamento Previsto (*Planned Value*) com o Custo Realizado (*Actual Cost*) e medindo a saúde financeira do projeto através de métricas padronizadas PMI (CPI & SPI).

### 🛠️ Esquema de Dados Planejado
- **`projects` (Novos campos)**:
  - `budget_currency`: `BRL` | `USD` | `EUR`
  - `planned_budget`: `DECIMAL(12, 2)` (Orçamento total aprovado)
- **`tasks` (Novos campos)**:
  - `estimated_cost`: `DECIMAL(10, 2)` (Custo orçado da atividade)
  - `actual_cost`: `DECIMAL(10, 2)` (Custo efetivamente incorrido)
  - `hourly_rate`: `DECIMAL(8, 2)` (Custo/hora do responsável)

### 📈 Indicadores Calculados
- **PV (Planned Value)**: Orçamento previsto até a data atual.
- **EV (Earned Value)**: Orçamento da porcentagem concluída (`planned_budget * progress / 100`).
- **AC (Actual Cost)**: Custo total gasto.
- **CPI (Cost Performance Index)**: `EV / AC` (> 1 = abaixo do orçamento / economia; < 1 = estourou orçamento).
- **SPI (Schedule Performance Index)**: `EV / PV` (> 1 = adiantado; < 1 = atrasado).

---

## 📌 Módulo 2: Timesheet & Apontamento de Horas (Time Tracking)

### 🎯 Objetivo
Permitir que membros da equipe registrem o tempo exato investido em cada tarefa através de um cronômetro interativo (*Play / Pause*) ou lançamento manual de horas.

### 🛠️ Esquema de Dados Planejado
- **Tabela `task_time_logs`**:
  - `id`: UUID PRIMARY KEY
  - `task_id`: UUID (FK `tasks`)
  - `user_id`: UUID (FK `profiles`)
  - `duration_seconds`: INTEGER (Tempo total registrado)
  - `started_at`: TIMESTAMPTZ
  - `stopped_at`: TIMESTAMPTZ
  - `description`: TEXT (Notas da atividade realizada)

### 🎛️ Componentes de UI
- **Widget de Timer no TaskDialog**: Botão `▶ Iniciar Cronômetro` que contabiliza segundos em background e sincroniza com o banco de dados ao pausar `⏸️`.
- **Relatório de Apontamento**: Relatório semanal mostrando total de horas trabalhadas por projeto e por usuário.

---

## 📌 Módulo 3: Alocação de Recursos & Carga de Trabalho (Workload)

### 🎯 Objetivo
Oferecer ao gestor do projeto a visão gráfica da capacidade diária/semanal da equipe para prevenir *burnout* ou ociosidade.

### 🛠️ Esquema de Dados Planejado
- **`profiles` (Novos campos)**:
  - `daily_capacity_hours`: `INTEGER DEFAULT 8` (Capacidade de trabalho diária)
- **Cálculo Dinâmico de Carga**:
  - `Horas Atribuídas no Dia = Soma(Horas das Tarefas Ativas com Vencimento no Dia)`
  - Se `Horas Atribuídas > Capacidade` -> Destacar em **Vermelho (Sobrecarregado)**.
  - Se `Horas Atribuídas == Capacidade` -> Destacar em **Verde (Capacidade Ideal)**.
  - Se `Horas Atribuídas < Capacidade` -> Destacar em **Azul (Disponível para novas tarefas)**.

---
*Documento mantido como especificação oficial do Roadmap de evolução do CHRONOS.*
