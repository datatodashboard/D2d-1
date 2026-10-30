import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import {
  buildFiddlePracticePackage,
  formatSqlCommentLines,
  splitSqlStatements,
  DOMAIN_SCHEMA_ASSETS
} from '../js/schema.js';

const data = JSON.parse(fs.readFileSync('./data/scenarios.json', 'utf8'));
const simpleCatalog = JSON.parse(fs.readFileSync('./data/Crack_SQL_420_Simple.json', 'utf8'));

describe('DB Fiddle Practice Package Preparation & Verification', () => {
  it('1. builds complete SQL practice package with schema, sample data, reference answer, and PostgreSQL instructions', () => {
    const scenario = simpleCatalog.find(s => s.id === 'BAN_BEG_001');
    const asset = DOMAIN_SCHEMA_ASSETS[scenario.domain];

    const pkg = buildFiddlePracticePackage(scenario, asset);

    assert.ok(typeof pkg === 'string' && pkg.length > 0, 'Package should be a non-empty string');
    assert.ok(pkg.includes('CRACK SQL PRACTICE PACKAGE'), 'Package should have header');
    assert.ok(pkg.includes('BAN_BEG_001'), 'Package should mention scenario ID');
    assert.ok(pkg.includes('PostgreSQL'), 'Package should specify PostgreSQL engine');
    assert.ok(pkg.includes('Schema SQL'), 'Package should explain Schema SQL panel usage');
    assert.ok(pkg.includes('Query SQL'), 'Package should explain Query SQL panel usage');
    assert.ok(pkg.includes('1. TABLE SCHEMA (CREATE TABLE STATEMENTS)'), 'Package should have schema section comment');
    assert.ok(pkg.includes('2. SAMPLE DATA (INSERT STATEMENTS)'), 'Package should have sample data section comment');
    assert.ok(pkg.includes('3. REFERENCE SQL QUERY (CORRECT ANSWER)'), 'Package should have reference answer section comment');
    assert.ok(pkg.includes('CREATE TABLE accounts'), 'Package should contain CREATE TABLE statements');
    assert.ok(pkg.includes('INSERT INTO accounts'), 'Package should contain INSERT statements');
    assert.ok(pkg.includes(scenario.answer_sql), 'Package should include the scenario reference query');
  });

  it('2. prefixes every line of multiline questions (\\n and \\r\\n), blank lines, apostrophes, and special characters with SQL line comments', () => {
    const multilineScenario = {
      id: 'BAN_TEST_MULTI',
      domain: 'Banking',
      level: 'Beginner',
      business_scenario:
        "A bank manager's team is reviewing accounts.\r\n\r\n" +
        "Show the recorded details of accounts whose status is 'Active'; exclude /* other */ statuses.\n\n" +
        "How would you prepare this information? Explain your approach in your own words.",
      answer_sql: "SELECT * FROM accounts WHERE status = 'Active';"
    };

    const pkg = buildFiddlePracticePackage(multilineScenario, DOMAIN_SCHEMA_ASSETS.Banking);
    assert.ok(pkg.length > 0, 'Package must be generated');

    // Every line before CREATE TABLE must be either empty or start with --
    const beforeCreate = pkg.split('CREATE TABLE')[0];
    for (const line of beforeCreate.split('\n')) {
      if (line.trim().length > 0) {
        assert.ok(
          line.startsWith('--'),
          `Non-empty header line must start with '--', found: ${JSON.stringify(line)}`
        );
      }
    }

    // Verify formatSqlCommentLines directly
    const commentLines = formatSqlCommentLines('Question', multilineScenario.business_scenario);
    assert.ok(commentLines.length >= 5, 'Should preserve all lines including blank separator lines');
    for (const cl of commentLines) {
      assert.ok(cl.startsWith('--'), `Comment line must start with '--': ${cl}`);
      assert.ok(!cl.includes('\n') && !cl.includes('\r'), 'Comment line must not contain raw newlines');
    }
  });

  it('3. preserves semicolons inside string literals and comments without splitting statements prematurely', () => {
    const trickySql = `
      CREATE TABLE notes (note_id INT PRIMARY KEY, body VARCHAR(200));
      INSERT INTO notes (note_id, body) VALUES (1, 'First part; second part; Don''t split here');
      -- Comment with a semicolon; inside it
      SELECT note_id, body FROM notes WHERE body LIKE '%;%';
    `;
    const stmts = splitSqlStatements(trickySql);
    assert.equal(stmts.length, 3, 'Should split into exactly 3 top-level SQL statements');
    assert.ok(stmts[1].includes("'First part; second part; Don''t split here'"));
    assert.ok(stmts[2].includes("WHERE body LIKE '%;%';"));
  });

  it('4. rejects descriptive schema shorthand or incomplete assets instead of exporting broken SQL', () => {
    const scenario = simpleCatalog[0];
    const shorthandAsset = {
      schema: scenario.schema, // e.g. "customers(customer_id PK, ...)"
      sample: DOMAIN_SCHEMA_ASSETS.Banking.sample
    };
    assert.equal(
      buildFiddlePracticePackage(scenario, shorthandAsset),
      '',
      'Must not export descriptive schema shorthand as executable DDL'
    );
    assert.equal(
      buildFiddlePracticePackage(scenario, { schema: DOMAIN_SCHEMA_ASSETS.Banking.schema, sample: '' }),
      '',
      'Must not export package when sample INSERT statements are missing'
    );
    assert.equal(
      buildFiddlePracticePackage({ ...scenario, sql: '', answer_sql: '' }, DOMAIN_SCHEMA_ASSETS.Banking),
      '',
      'Must not export package when reference SQL is missing'
    );
  });

  it('5. exports distinct domain-matched packages when switching scenarios across domains and never falls back to Banking', () => {
    const domains = ['Banking', 'Healthcare', 'Insurance', 'Capital Markets', 'Semiconductor', 'Education', 'Retail'];
    const packagesByDomain = new Map();

    for (const dom of domains) {
      const s = simpleCatalog.find(item => item.domain === dom);
      assert.ok(s, `Must find scenario for domain ${dom}`);
      const pkg = buildFiddlePracticePackage(s, DOMAIN_SCHEMA_ASSETS[s.domain]);
      assert.ok(pkg.length > 0, `Package for ${dom} must be non-empty`);
      assert.ok(pkg.includes(`-- Scenario: ${s.id}`));
      assert.ok(pkg.includes(`-- Domain: ${dom} | Level: ${s.level}`));
      assert.ok(pkg.includes(s.answer_sql));
      if (dom !== 'Banking') {
        assert.ok(!pkg.includes('CREATE TABLE accounts '), `${dom} package must not use Banking accounts DDL`);
      }
      packagesByDomain.set(dom, pkg);
    }

    assert.equal(packagesByDomain.size, 7);
  });

  it('6. executes the complete exported DB Fiddle package for all 420 authoritative scenarios in PostgreSQL (PGlite)', async () => {
    assert.equal(simpleCatalog.length, 420, 'Authoritative catalog must have 420 scenarios');
    assert.equal(data.scenarios.length, 420, 'scenarios.json catalog must have 420 scenarios');

    const db = new PGlite();
    const failures = [];

    try {
      for (const scenario of simpleCatalog) {
        const asset = DOMAIN_SCHEMA_ASSETS[scenario.domain];
        const pkg = buildFiddlePracticePackage(scenario, asset);

        if (!pkg) {
          failures.push({ id: scenario.id, reason: 'Empty package returned' });
          continue;
        }

        try {
          await db.exec('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
          const res = await db.exec(pkg);
          if (!Array.isArray(res) || res.length === 0) {
            failures.push({ id: scenario.id, reason: 'No result sets returned from PGlite' });
            continue;
          }
          const last = res[res.length - 1];
          if (!last || !Array.isArray(last.rows)) {
            failures.push({ id: scenario.id, reason: 'Final query did not return rows array' });
          }
        } catch (err) {
          failures.push({ id: scenario.id, domain: scenario.domain, reason: err.message });
        }
      }
    } finally {
      await db.close();
    }

    assert.equal(
      failures.length,
      0,
      `All 420 exported DB Fiddle packages must execute cleanly in PostgreSQL. Failures: ${JSON.stringify(failures.slice(0, 10))}`
    );
  });
});

