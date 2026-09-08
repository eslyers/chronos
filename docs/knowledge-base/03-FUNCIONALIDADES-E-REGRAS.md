# ⚙️ CHRONOS — Base de Conhecimento: Funcionalidades e Regras de Negócio

> **Módulo:** Lógica de Domínio, Regras de Negócio e Casos de Uso Especializados  
> **Prioridade de Ajuste:** Média / Alta

---

## 1. Módulo Fast Close (Fechamento Financeiro e Contábil)

O módulo de Fast Close ([src/app/app/fast-close/page.tsx](file:///c:/Users/Esly_PC/.gemini/antigravity-ide/scratch/chronos/src/app/app/fast-close/page.tsx)) é projetado especificamente para controladores, contadores e gestores financeiros organizarem as rotinas mensais de encerramento contábil.

### 1.1 Lógica de Cálculo de Dias Úteis ([src/lib/business-days.ts](file:///c:/Users/Esly_PC/.gemini/antigravity-ide/scratch/chronos/src/lib/business-days.ts))
* **Conceito de $D0$:**
  * O dia **$D0$** representa o **último dia útil do mês contábil** que está sendo fechado.
  * Se o último dia do mês cair em sábado ou domingo, o algoritmo retrocede automaticamente para a sexta-feira anterior:
    ```typescript
    export function getClosingD0Date(year: number, month: number): Date {
      const lastDay = new Date(year, month, 0); // Último dia do mês
      while (lastDay.getDay() === 0 || lastDay.getDay() === 6) {
        lastDay.setDate(lastDay.getDate() - 1); // Pula fim de semana
      }
      return lastDay;
    }
    ```
* **Offsets Negativos ($D-X$):** Dias úteis antes de $D0$ (atividades pré-fechamento, cortes de inventário, conciliações preliminares).
* **Offsets Positivos ($D+X$):** Dias úteis após $D0$ (apuração de impostos, fechamento de balancete, consolidação de demonstrações).
* **Toggle `useD0`:** Permite que empresas que não utilizam a nomenclatura $D0$ iniciem a contagem pós-mês diretamente em $D+1$.
* **⚠️ Oportunidade de Ajuste:** Atualmente o cálculo pula sábados e domingos, mas ainda **não contempla a tabela de feriados nacionais e bancários (ex: ANBIMA/Feriados Nacionais Brasil)**. Implementar uma tabela de feriados tornará o cálculo 100% preciso para o mercado brasileiro.

### 1.2 Operações do Fast Close
* **Cópia de Fechamento (`CopyClosingDialog.tsx`):** Permite duplicar a estrutura de tarefas de um mês anterior (ex: Junho/2026) para o novo mês (Julho/2026), recalculando automaticamente todas as datas com base no novo calendário útil.
* **Importação via Planilha (`ImportClosingSpreadsheetDialog.tsx`):** Lê colunas padronizadas (`Tarefa`, `Offset/Dia Útil`, `Responsável`, `Prioridade`) e gera as tarefas instantaneamente.

---

## 2. Grafo de Dependências e Gantt Timeline

### 2.1 Tipos de Dependência Suportados
As tarefas podem ter relacionamentos formais de precedência:
* **FS (*Finish-to-Start*):** A tarefa B só pode iniciar após a conclusão da tarefa A (padrão mais comum).
* **SS (*Start-to-Start*):** A tarefa B inicia no mesmo instante em que a tarefa A inicia.
* **FF (*Finish-to-Finish*):** A tarefa B só pode terminar quando a tarefa A terminar.
* **SF (*Start-to-Finish*):** A tarefa B só pode terminar após o início da tarefa A.

### 2.2 Prevenção de Ciclos e Cascata de Datas
* **Grafo Acíclico Dirigido (DAG):** Ao vincular dependências, o sistema deve impedir ciclos infinitos ($A \to B \to C \to A$).
* **Ajuste Futuro Necessário:** Implementar propagação automática de datas: se a tarefa predecessora atrasa 2 dias, as datas das sucessoras conectadas via FS devem ser automaticamente empurradas na timeline.

---

## 3. Estrutura Hierárquica WBS (Work Breakdown Structure)

* O sistema suporta subtarefas através do campo `parent_task_id` na tabela `tasks`.
* **Regras de Agregação (Rollup):**
  * O progresso da tarefa-mãe deve refletir a média ponderada ou aritmética das subtarefas filhas.
  * Se todas as subtarefas forem marcadas como concluídas (`status = 'done'`), a tarefa pai deve atualizar seu progresso para 100%.
  * O algoritmo [task-sorting.ts](file:///c:/Users/Esly_PC/.gemini/antigravity-ide/scratch/chronos/src/lib/task-sorting.ts) garante que as tarefas filhas sejam renderizadas indentadas logo abaixo do pai correspondente na Timeline e na Lista.

---

## 4. Kanban e Auditoria de Estágios

* **WIP Limits:** Cada coluna do Kanban (`Stage`) pode ter um limite máximo de tarefas ativas (`wip_limit`). A UI sinaliza visualmente quando o limite é atingido.
* **Trigger de Auditoria (`stage_transitions`):** Sempre que uma tarefa é arrastada de uma coluna para outra, o trigger SQL `trigger_stage_change` grava uma linha na tabela de auditoria registrando o usuário executor, data/hora e estágios de origem e destino.

---

## 5. Notificações Automatizadas

* **Canais Ativos:** In-app (sininho), Telegram Bot e e-mails (Brevo/Resend).
* **Gatilhos de Notificação:**
  1. *Due Soon:* Tarefas cuja data de entrega está dentro da janela configurada (ex: faltam 24h ou 48h).
  2. *Overdue:* Tarefas com data de entrega ultrapassada e status diferente de `done`.
  3. *Stage Change:* Tarefa movimentada para um estágio de revisão ou conclusão.
  4. *Quiet Hours:* Bloqueio de envio em horários não comerciais (ex: 22h às 07h).
