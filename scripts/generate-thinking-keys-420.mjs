import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/Crack_SQL_420_Simple.json'), 'utf8'));
const richScenarios = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/scenarios.json'), 'utf8'));
const first10Data = JSON.parse(fs.readFileSync(path.join(ROOT, 'server-private/thinking-keys-first-10.json'), 'utf8'));

const richById = new Map();
if (Array.isArray(richScenarios?.scenarios)) {
  for (const s of richScenarios.scenarios) {
    if (s && s.id) richById.set(String(s.id).trim().toUpperCase(), s);
  }
}

const first10ById = new Map();
for (const k of first10Data.keys) {
  const id = String(k.scenarioId || k.id || '').trim().toUpperCase();
  if (id) first10ById.set(id, k);
}

function computeDigest(entry) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify([entry.business_scenario, entry.schema, entry.answer_sql]))
    .digest('hex');
}

function parseSchemaTables(schemaStr) {
  const tables = new Map();
  const segments = String(schemaStr || '').split(/[;\r\n]+/);
  for (const seg of segments) {
    const m = seg.match(/^\s*([a-zA-Z0-9_]+)\s*\(([^)]+)\)/);
    if (m) {
      const tableName = m[1].trim().toLowerCase();
      const cols = m[2]
        .split(',')
        .map((c) => c.trim().split(/\s+/)[0].toLowerCase())
        .filter(Boolean);
      tables.set(tableName, cols);
    }
  }
  return tables;
}

function extractUsedTablesFromSql(sql, schemaTables) {
  const s = String(sql || '').toLowerCase();
  const used = [];
  for (const table of schemaTables.keys()) {
    const fromJoinRe = new RegExp(`\\b(?:from|join)\\s+${table}\\b`, 'i');
    if (fromJoinRe.test(s)) {
      used.push(table);
    }
  }
  if (used.length === 0) {
    for (const table of schemaTables.keys()) {
      if (new RegExp(`\\b${table}\\b`, 'i').test(s)) {
        used.push(table);
      }
    }
  }
  if (used.length === 0 && schemaTables.size > 0) {
    used.push(Array.from(schemaTables.keys())[0]);
  }
  return Array.from(new Set(used));
}

function extractRelevantColumns(sql, usedTables, schemaTables, richEntry) {
  const s = String(sql || '').toLowerCase();
  const cols = new Set();

  for (const t of usedTables) {
    const tCols = schemaTables.get(t) || [];
    for (const c of tCols) {
      if (new RegExp(`\\b${c}\\b`, 'i').test(s)) {
        cols.add(c);
      }
    }
  }

  if (Array.isArray(richEntry?.answerKey?.columns)) {
    for (const c of richEntry.answerKey.columns) {
      const clean = String(c || '').trim().toLowerCase();
      if (clean && !clean.includes(' ')) cols.add(clean);
    }
  }

  return Array.from(cols);
}

function extractBusinessObjective(questionText) {
  const paragraphs = String(questionText || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length >= 2) {
    return paragraphs[1];
  }
  return String(questionText || '').trim();
}

function stripSqlAliases(clause) {
  return String(clause || '')
    .replace(/\b[a-z]\./gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function deriveKeyFields(entry, richEntry, usedTables, relevantColumns) {
  const sql = String(entry.answer_sql || '').trim();
  const sqlLower = sql.toLowerCase();
  const businessObjective = extractBusinessObjective(entry.business_scenario);

  const criticalRequirements = [];
  const boundaryChecks = [];

  const sentences = businessObjective
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length > 0) {
    criticalRequirements.push(sentences[0]);
  }
  if (sentences.length > 1) {
    boundaryChecks.push(sentences.slice(1).join(' '));
  }

  const whereMatch = sql.match(/\bwhere\s+([\s\S]+?)(?=\bgroup\s+by\b|\bhaving\b|\border\s+by\b|\blimit\b|;|$)/i);
  const cleanWhere = whereMatch ? stripSqlAliases(whereMatch[1]) : '';

  const groupMatch = sql.match(/\bgroup\s+by\s+([\s\S]+?)(?=\bhaving\b|\border\s+by\b|\blimit\b|;|$)/i);
  const cleanGroup = groupMatch ? stripSqlAliases(groupMatch[1]) : '';

  const orderMatch = sql.match(/\border\s+by\s+([\s\S]+?)(?=\blimit\b|;|$)/i);
  const cleanOrder = orderMatch ? stripSqlAliases(orderMatch[1]) : '';
  const limitMatch = sql.match(/\blimit\s+(\d+)/i);

  criticalRequirements.push(
    `Use ${usedTables.join(' and ')} to return the required records and fields satisfying the business request.`
  );

  if (boundaryChecks.length === 0) {
    boundaryChecks.push(`Output must match the exact grain and boundary rules in: ${businessObjective}`);
  }

  const stepParts = [`Use ${usedTables.join(' and ')}`];
  if (usedTables.length > 1) {
    const isLeft = /\bleft\s+(?:outer\s+)?join\b/i.test(sqlLower);
    stepParts.push(
      isLeft
        ? `keep all primary rows from ${usedTables[0]} and left join ${usedTables.slice(1).join(' and ')}`
        : `join ${usedTables.join(' and ')} on their matching key`
    );
  }
  if (relevantColumns.length > 0) {
    stepParts.push(`using ${relevantColumns.join(', ')}`);
  }
  stepParts.push(`to satisfy: ${businessObjective}`);

  const teacherAnswer = stepParts.join(', ');
  const acceptedParaphrase = `From ${usedTables.join(' and ')}, ${businessObjective}`;

  return {
    businessObjective,
    criticalRequirements,
    boundaryChecks,
    teacherAnswer,
    acceptedParaphrase,
    irrelevantRequirements:
      'Do not add unstated joins, status filters, aggregation, validation prose, or SQL syntax requirements. Do not require long answers or exact table spelling when the entity is unambiguous.'
  };
}

const allKeys = [];
for (const entry of catalog) {
  const id = String(entry.id || '').trim().toUpperCase();
  const existing = first10ById.get(id);
  if (existing) {
    allKeys.push(existing);
    continue;
  }

  const schemaTables = parseSchemaTables(entry.schema);
  const usedTables = extractUsedTablesFromSql(entry.answer_sql, schemaTables);
  const richEntry = richById.get(id);
  const relevantColumns = extractRelevantColumns(entry.answer_sql, usedTables, schemaTables, richEntry);
  const derived = deriveKeyFields(entry, richEntry, usedTables, relevantColumns);

  allKeys.push({
    scenarioId: id,
    keyVersion: 'thinking-3.0-pilot-1',
    catalog: 'data/Crack_SQL_420_Simple.json',
    question: entry.business_scenario,
    schema: entry.schema,
    referenceSql: entry.answer_sql,
    sourceDigest: computeDigest(entry),
    requiredTables: usedTables,
    relevantColumns,
    businessObjective: derived.businessObjective,
    criticalRequirements: derived.criticalRequirements,
    boundaryChecks: derived.boundaryChecks,
    teacherAnswer: derived.teacherAnswer,
    acceptedParaphrase: derived.acceptedParaphrase,
    irrelevantRequirements: derived.irrelevantRequirements
  });
}

const output = {
  status: 'Prepared teacher keys for all 420 scenarios',
  rubric: first10Data.rubric,
  passThreshold: 7,
  keyVersion: 'thinking-3.0-pilot-1',
  totalKeys: allKeys.length,
  keys: allKeys
};

fs.writeFileSync(path.join(ROOT, 'server-private/thinking-keys-all-420.json'), JSON.stringify(output, null, 2) + '\n', 'utf8');
console.log(`Generated server-private/thinking-keys-all-420.json with ${allKeys.length} keys.`);
