// ─────────────────────────────────────────────────────────────
// CHRONOS — Excel/CSV/ODS Parser → Tasks
// Suporta .xlsx, .xls, .ods, .csv
// Mapeamento inteligente de colunas PT-BR / EN / variações
// Detecta hierarquia WBS via coluna "Nível" (1, 2, 3...)
// ─────────────────────────────────────────────────────────────

import * as XLSX from "xlsx";
import Papa from "papaparse";
import type { Task } from "@/lib/context/DataContext";

// ── Tipos ────────────────────────────────────────────────────

export type ImportRowStatus = "valid" | "warning" | "error";

export interface ImportRow {
  index: number; // linha no arquivo (1-based, header = 0)
  raw: Record<string, string | number | null>; // linha bruta original
  parsed: Partial<Task>; // task parseada
  warnings: string[];
  errors: string[];
  status: ImportRowStatus;
  // WBS: número do nível hierárquico (1 = raiz, 2 = sub, etc)
  // undefined se não tem coluna Nível
  level?: number;
}

export interface ImportPreview {
  filename: string;
  totalRows: number;
  validRows: number;
  warningRows: number;
  errorRows: number;
  columns: string[]; // cabeçalhos detectados
  mapping: Record<string, string>; // coluna do arquivo → campo do task
  rows: ImportRow[];
  sheetName?: string;
  hasWBS: boolean; // true se alguma row tem level detectado
}

export interface ImportResult {
  created: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

// ── Mapeamento de colunas (case-insensitive, ignora acentos) ─

type FieldName = keyof Task | "category" | "project" | "level" | "ignore";

const COLUMN_MAP: Record<string, FieldName> = {
  // Título da task (obrigatório)
  "etapas": "title",
  "etapa": "title",
  "tarefa": "title",
  "atividade": "title",
  "task": "title",
  "name": "title",
  "nome": "title",
  "titulo": "title",
  "title": "title",
  // Descrição
  "observacao": "description",
  "observações": "description",
  "descricao": "description",
  "description": "description",
  "details": "description",
  "notas": "description",
  "notes": "description",
  // Responsável
  "responsavel": "assignee_id",
  "responsável": "assignee_id",
  "owner": "assignee_id",
  "atribuido a": "assignee_id",
  "atribuído a": "assignee_id",
  "recurso": "assignee_id",
  "resource": "assignee_id",
  "assignee": "assignee_id",
  // Datas
  "data inicio": "start_date",
  "data ínicio": "start_date",
  "inicio": "start_date",
  "início": "start_date",
  "start": "start_date",
  "start date": "start_date",
  "data fim": "due_date",
  "data término": "due_date",
  "data termino": "due_date",
  "termino": "due_date",
  "término": "due_date",
  "fim": "due_date",
  "due date": "due_date",
  "end": "due_date",
  "finish": "due_date",
  "prazo": "due_date",
  // Prioridade
  "prioridade": "priority",
  "priority": "priority",
  // Status
  "status": "status",
  "estado": "status",
  // Projeto
  "projeto": "project",
  "project": "project",
  "nome do projeto": "project",
  // Pilar (categoria agregadora)
  "pilar de atuacao": "category",
  "pilar de atuação": "category",
  "pilar": "category",
  // Hierarquia
  "nivel": "level",
  "nível": "level",
  "level": "level",
  // Progresso
  "realizado": "progress",
  "% realizado": "progress",
  "progresso": "progress",
  "progress": "progress",
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function detectMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const header of headers) {
    const norm = normalize(header);
    if (COLUMN_MAP[norm]) {
      mapping[header] = COLUMN_MAP[norm];
    } else {
      // Tentar match por contém (ex: "Data de Início" → contém "inicio")
      for (const [key, val] of Object.entries(COLUMN_MAP)) {
        if (norm.includes(key) && val !== "ignore") {
          mapping[header] = val;
          break;
        }
      }
    }
  }
  return mapping;
}

// ── Conversões de valores ───────────────────────────────────

function parseDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;

  // Se for número → data do Excel (serial date)
  if (typeof value === "number") {
    // Excel serial date: dias desde 1900-01-01 (com bug do 1900 sendo ano bissexto)
    const utcDays = Math.floor(value - 25569); // 25569 = dias entre 1900-01-01 e 1970-01-01
    const utcValue = utcDays * 86400;
    const date = new Date(utcValue * 1000);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split("T")[0];
  }

  // Se for string → tenta formatos comuns
  const str = String(value).trim();

  // ISO: 2026-07-22 ou 2026-07-22T10:00:00
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  // BR: dd/mm/yyyy ou dd-mm-yyyy
  const brMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (brMatch) {
    const [, d, m, yRaw] = brMatch;
    const y = yRaw!.length === 2 ? `20${yRaw}` : yRaw;
    return `${y}-${m!.padStart(2, "0")}-${d!.padStart(2, "0")}`;
  }

  // Tentar Date.parse como fallback
  const ts = Date.parse(str);
  if (!isNaN(ts)) {
    return new Date(ts).toISOString().split("T")[0];
  }

  return null;
}

function parseStatus(value: unknown): { status: Task["status"]; warnings: string[] } {
  const warnings: string[] = [];
  if (value === null || value === undefined || value === "") {
    return { status: "todo", warnings };
  }
  const s = normalize(String(value));

  // PT-BR mapping
  if (s.includes("concluid") || s.includes("feito") || s === "done" || s.includes("100%")) {
    return { status: "done", warnings };
  }
  if (s.includes("atrasad") || s.includes("overdue") || s.includes("blocked")) {
    warnings.push(`Status "${value}" interpretado como in_progress (atrasado)`);
    return { status: "in_progress", warnings };
  }
  if (s.includes("andamento") || s.includes("progresso") || s.includes("in progress") || s.includes("in_progress")) {
    return { status: "in_progress", warnings };
  }
  if (s.includes("revisao") || s.includes("revisão") || s.includes("review")) {
    return { status: "review", warnings };
  }
  if (s.includes("a fazer") || s.includes("pendente") || s.includes("todo") || s.includes("to do") || s.includes("backlog") || s.includes("no prazo")) {
    return { status: "todo", warnings };
  }

  warnings.push(`Status "${value}" não reconhecido — usando "todo"`);
  return { status: "todo", warnings };
}

function parsePriority(value: unknown): { priority: Task["priority"]; warnings: string[] } {
  const warnings: string[] = [];
  if (value === null || value === undefined || value === "") {
    return { priority: "medium", warnings };
  }
  const s = normalize(String(value));
  if (s.includes("critic") || s.includes("urgente") || s.includes("critical")) return { priority: "critical", warnings };
  if (s.includes("alta") || s.includes("high")) return { priority: "high", warnings };
  if (s.includes("baixa") || s.includes("low")) return { priority: "low", warnings };
  if (s.includes("media") || s.includes("média") || s.includes("medium")) return { priority: "medium", warnings };
  warnings.push(`Prioridade "${value}" não reconhecida — usando "medium"`);
  return { priority: "medium", warnings };
}

function parseProgress(value: unknown): { progress: number; warnings: string[] } {
  const warnings: string[] = [];
  if (value === null || value === undefined || value === "") {
    return { progress: 0, warnings };
  }
  const str = String(value).replace("%", "").trim();
  const num = parseFloat(str);
  if (isNaN(num)) {
    warnings.push(`Progresso "${value}" inválido — usando 0%`);
    return { progress: 0, warnings };
  }
  return { progress: Math.max(0, Math.min(100, Math.round(num))), warnings };
}

// ── Detecção de cabeçalho ────────────────────────────────────

function findHeaderRow(rows: unknown[][]): number {
  // Procura a primeira linha que contenha palavras-chave de cabeçalho
  const keywords = ["etapa", "tarefa", "task", "responsavel", "responsável", "titulo", "título", "inicio", "início"];
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;
    const cells = row.map((c) => normalize(String(c || "")));
    const hits = cells.filter((c) => keywords.some((k) => c.includes(k))).length;
    if (hits >= 2) return i;
  }
  return 0; // fallback: assume linha 0
}

// ── Ler arquivo ──────────────────────────────────────────────

// ── Sanitizador de c\u00e9lula: garante string | number | null (sem mentira de TS) ──
// SheetJS retorna c\u00e9lulas com tipo 'e' (error: #REF!, #NAME?, #VALUE!, #DIV/0!, #N/A) como
// objetos Error nativos do JS. Mandar isso pra frente quebra Radix Select / JSON.stringify
// com "Unsupported value type error". Aqui a gente converte pra string e marca como erro.
function sanitizeCell(value: unknown): { value: string | number | null; cellError: boolean } {
  if (value === null || value === undefined || value === "") {
    return { value: null, cellError: false };
  }
  // Erro do Excel (#REF!, #NAME?, etc) \u2014 vira string com prefixo visivel
  if (value instanceof Error) {
    return { value: `#ERR:${value.message || "UNKNOWN"}`, cellError: true };
  }
  // Date object \u2192 ISO string (SheetJS j\u00e1 faz isso com cellDates:true, mas garantimos)
  if (value instanceof Date) {
    const t = value.getTime();
    if (Number.isNaN(t)) return { value: null, cellError: false };
    return { value: value.toISOString().slice(0, 10), cellError: false };
  }
  // Primitivos OK
  if (typeof value === "string") return { value: value.trim(), cellError: false };
  if (typeof value === "number") return { value, cellError: false };
  if (typeof value === "boolean") return { value: value ? "true" : "false", cellError: false };
  // Fallback: stringify (objetos literais, arrays raros, etc)
  try {
    return { value: String(value), cellError: false };
  } catch {
    return { value: null, cellError: false };
  }
}

export async function parseImportFile(buffer: Buffer, filename: string): Promise<{
  rows: Record<string, string | number | null>[];
  headers: string[];
  sheetName?: string;
}> {
  const ext = filename.toLowerCase().split(".").pop();

  if (ext === "csv") {
    const text = buffer.toString("utf-8");
    const result = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    });
    if (result.errors.length > 0) {
      console.warn("[excel-parser] CSV parse warnings:", result.errors);
    }
    // Sanitiza tamb\u00e9m o CSV (papaparse j\u00e1 devolve string, mas defensivo)
    const rows = result.data.map((row) => {
      const out: Record<string, string | number | null> = {};
      for (const [k, v] of Object.entries(row)) {
        const sanitized = sanitizeCell(v);
        out[k] = sanitized.value;
      }
      return out;
    });
    return {
      rows,
      headers: result.meta.fields || [],
    };
  }

  // Excel/ODS via SheetJS
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Pegar como matriz (pra detectar cabe\u00e7alho)
  const matrix: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });
  const headerIdx = findHeaderRow(matrix);
  const headerRow = matrix[headerIdx] as unknown[];

  // Pegar dados a partir do cabe\u00e7alho
  const dataRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    range: headerIdx,
    raw: true,
    defval: null,
  });

  const headers = headerRow.map((h) => String(h || "").trim()).filter(Boolean);

  // Normalizar + sanitizar cada c\u00e9lula (sem mentiras de TS)
  const normalized = dataRows.map((row) => {
    const out: Record<string, string | number | null> = {};
    for (const h of headers) {
      const { value } = sanitizeCell(row[h]);
      out[h] = value;
    }
    return out;
  });

  return { rows: normalized, headers, sheetName };
}

// ── Validar e fazer preview ──────────────────────────────────

export function buildPreview(
  rows: Record<string, string | number | null>[],
  headers: string[],
  filename: string,
  sheetName?: string
): ImportPreview {
  const mapping = detectMapping(headers);
  const hasTitle = Object.values(mapping).includes("title");

  const importRows: ImportRow[] = rows.map((row, idx) => {
    const warnings: string[] = [];
    const errors: string[] = [];
    const parsed: Partial<Task> = {};
    let level: number | undefined;

    if (!hasTitle) {
      errors.push("Coluna de título (ETAPAS/TAREFA/TASK) não detectada — impossível criar task");
    }

    // Mapear campos
    for (const [colName, fieldName] of Object.entries(mapping)) {
      if (fieldName === "ignore") continue;

      if (fieldName === "level") {
        const raw = row[colName];
        if (raw === null || raw === undefined || raw === "") break;
        const n = typeof raw === "number" ? raw : parseInt(String(raw).trim(), 10);
        if (isNaN(n) || n < 1) {
          warnings.push(`Nível "${raw}" inválido — esperado número >= 1`);
          break;
        }
        level = n;
        break;
      }
      const raw = row[colName];

      switch (fieldName) {
        case "title":
          if (!raw || String(raw).trim() === "") {
            errors.push("Título vazio");
          } else {
            parsed.title = String(raw).trim();
          }
          break;

        case "description":
          if (raw) parsed.description = String(raw).trim();
          break;

        case "assignee_id":
          // Mantém como string por enquanto — vira FK depois via /api/users
          if (raw) parsed.assignee_id = String(raw).trim();
          break;

        case "start_date": {
          const d = parseDate(raw);
          if (raw && !d) warnings.push(`Data de início "${raw}" não reconhecida`);
          if (d) parsed.start_date = d;
          break;
        }

        case "due_date": {
          const d = parseDate(raw);
          if (raw && !d) warnings.push(`Data de fim "${raw}" não reconhecida`);
          if (d) parsed.due_date = d;
          break;
        }

        case "priority": {
          const { priority, warnings: pw } = parsePriority(raw);
          parsed.priority = priority;
          warnings.push(...pw);
          break;
        }

        case "status": {
          const { status, warnings: sw } = parseStatus(raw);
          parsed.status = status;
          warnings.push(...sw);
          break;
        }

        case "progress": {
          const { progress, warnings: prw } = parseProgress(raw);
          parsed.progress = progress;
          warnings.push(...prw);
          break;
        }
      }
    }

    // Defaults
    if (!parsed.priority) parsed.priority = "medium";
    if (!parsed.status) parsed.status = "todo";
    if (parsed.progress === undefined) parsed.progress = 0;

    let status: ImportRowStatus = "valid";
    if (errors.length > 0) status = "error";
    else if (warnings.length > 0) status = "warning";

    return {
      index: idx + 1,
      raw: row,
      parsed,
      warnings,
      errors,
      status,
      level,
    };
  });

  return {
    filename,
    sheetName,
    totalRows: importRows.length,
    validRows: importRows.filter((r) => r.status === "valid").length,
    warningRows: importRows.filter((r) => r.status === "warning").length,
    errorRows: importRows.filter((r) => r.status === "error").length,
    columns: headers,
    mapping,
    rows: importRows,
    hasWBS: importRows.some((r) => r.level !== undefined),
  };
}
