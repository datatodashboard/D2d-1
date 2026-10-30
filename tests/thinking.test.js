import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { evaluateThinking } from '../js/thinking.js';

const data = JSON.parse(fs.readFileSync('./data/scenarios.json', 'utf8'));

describe('Thinking Evaluation', () => {
  it('awards full pass to layman single-table filter explanation', () => {
    const single = data.scenarios.find(s => s.domain === 'Banking' && s.tables.includes('customers'));
    assert(single, 'Scenario should exist');
    
    const userText = 'from the customers table, I have to use filter to get the detail';
    const result = evaluateThinking(single, userText);
    
    assert.strictEqual(result.ready, true, 'User should be marked ready');
    assert(result.score >= 7, `Score should be >= 7, got ${result.score}`);
  });

  it('awards full pass to layman multi-table join explanation', () => {
    const multi = data.scenarios.find(s => s.tables.length > 1);
    assert(multi, 'Multi-table scenario should exist');
    
    const userText = `join two tables and filter the data from ${multi.tables.join(' and ')} to show the result`;
    const result = evaluateThinking(multi, userText);
    
    assert.strictEqual(result.ready, true, 'Multi-table join should be marked ready');
    assert(result.score >= 7, `Score should be >= 7, got ${result.score}`);
  });

  it('all 4 core domains are present with 60 scenarios each', () => {
    const coreDomains = ['Banking', 'Healthcare', 'Insurance', 'Retail'];
    for (const domain of coreDomains) {
      const count = data.scenarios.filter(s => s.domain === domain).length;
      assert.strictEqual(count, 60, `Domain ${domain} should have 60 scenarios, found ${count}`);
    }
  });

  it('every scenario has schemaText, tables, and valid reference sql', () => {
    for (const s of data.scenarios) {
      assert(s.id, 'Scenario must have id');
      assert(s.schemaText && s.schemaText.length > 0, `${s.id} must have schemaText`);
      assert(s.tables && s.tables.length > 0, `${s.id} must have tables`);
      assert(s.sql && s.sql.length > 0, `${s.id} must have reference SQL`);
    }
  });

  describe('HEA_BEG_001 Schema Validation & Scoring Guard Regression Tests', () => {
    const hea = data.scenarios.find(s => s.id === 'HEA_BEG_001');
    assert(hea, 'HEA_BEG_001 must exist');

    it('1. awards high score (9-10) for correct explicit reasoning', () => {
      const res = evaluateThinking(hea, 'Use appointments and filter status Active.');
      assert(res.score >= 9 && res.score <= 10, `Expected score 9-10, got ${res.score}`);
      assert.strictEqual(res.ready, true, 'Learner should be marked ready');
    });

    it('2. caps score at <= 5 when learner mentions non-existent table (accounts)', () => {
      const res = evaluateThinking(hea, 'I need data from accounts and filter account status Active.');
      assert(res.score <= 5, `Expected score <= 5 for wrong table accounts, got ${res.score}`);
      assert.strictEqual(res.ready, false, 'Should not be marked ready with wrong table');
      assert(res.message.includes('accounts'), 'Feedback should constructively mention accounts');
    });

    it('2b. caps score at <= 5 for full paragraph mentioning accounts table and account status', () => {
      const reasoning = 'I need data from the accounts table. I should filter the records where the account status is Active.';
      const res = evaluateThinking(hea, reasoning);
      assert(res.score <= 5, `Expected score <= 5, got ${res.score}`);
      assert.strictEqual(res.ready, false, 'Should not be ready');
    });

    it('3. awards partial/high score without 5-cap when table is not explicitly named', () => {
      const res = evaluateThinking(hea, 'Filter the records where status is Active.');
      assert(res.score >= 7, `Expected partial/high score >= 7, got ${res.score}`);
      assert.strictEqual(res.ready, true, 'Learner should be marked ready');
    });

    it('4. caps score at <= 5 when learner mentions patients table instead of appointments', () => {
      const res = evaluateThinking(hea, 'Use patients and filter status Active.');
      assert(res.score <= 5, `Expected score <= 5 for wrong target table patients, got ${res.score}`);
      assert.strictEqual(res.ready, false, 'Should not be marked ready when using wrong table');
    });

    it('5. gives very low score for completely unrelated reasoning', () => {
      const res = evaluateThinking(hea, 'Tomorrow I will bake a chocolate cake and eat ice cream.');
      assert(res.score <= 2, `Expected very low score <= 2, got ${res.score}`);
      assert.strictEqual(res.ready, false);
    });

    it('6. awards high score for correct natural reasoning without SQL syntax', () => {
      const res = evaluateThinking(hea, 'I will look at the appointments data, keep only those marked as Active, and show the details.');
      assert(res.score >= 8, `Expected score >= 8, got ${res.score}`);
      assert.strictEqual(res.ready, true);
    });
  });

  describe('Dynamic cross-domain schema evaluation (non-Healthcare)', () => {
    const bankingScenario = data.scenarios.find(s => s.domain === 'Banking' && s.tables.includes('accounts'));
    assert(bankingScenario, 'Banking scenario with accounts table must exist');

    it('recognizes accounts in Banking as correct, but appointments as schema mismatch', () => {
      // In Banking, accounts is correct
      const correctRes = evaluateThinking(bankingScenario, 'Use accounts and filter status Active.');
      assert(correctRes.score >= 8, `Expected high score in Banking for accounts, got ${correctRes.score}`);

      // In Banking, appointments does not exist in schema
      const mismatchRes = evaluateThinking(bankingScenario, 'Use appointments and filter status Active.');
      assert(mismatchRes.score <= 5, `Expected <= 5 in Banking for appointments, got ${mismatchRes.score}`);
      assert(mismatchRes.message.includes('appointments'), 'Should identify appointments as not part of this scenario');
    });

    const retailScenario = data.scenarios.find(s => s.domain === 'Retail' && s.tables.includes('products'));
    if (retailScenario) {
      it('dynamically validates Retail scenario with products', () => {
        const res = evaluateThinking(retailScenario, 'From the products table, filter price greater than 100 to show the items.');
        assert(res.score >= 7, `Expected score >= 7, got ${res.score}`);

        const badRes = evaluateThinking(retailScenario, 'From the patients table, filter status Active.');
        assert(badRes.score <= 5, `Expected score <= 5 for patients in Retail, got ${badRes.score}`);
      });
    }

    it('rejects cross-domain reasoning (e.g. Insurance reasoning on BAN_INT_020)', () => {
      const ban20 = data.scenarios.find(s => s.id === 'BAN_INT_020');
      assert(ban20, 'BAN_INT_020 must exist');
      const insText = 'Join policies and claims, filter by policy_date, and aggregate.';
      const res = evaluateThinking(ban20, insText);
      assert(res.score <= 5, `Cross-domain text must be capped <= 5, got ${res.score}`);
      assert.strictEqual(res.ready, false);
      assert(res.message.includes('policies'), 'Message should identify wrong table');
    });
  });

  describe('Curriculum Wide Quality & Integrity Verification', () => {
    it('every scenario exampleThinking scores >= 7 and is marked ready', () => {
      for (const s of data.scenarios) {
        const res = evaluateThinking(s, s.exampleThinking);
        assert(res.score >= 7, `${s.id} exampleThinking score should be >= 7, got ${res.score}. Message: ${res.message}`);
        assert.strictEqual(res.ready, true, `${s.id} exampleThinking should be marked ready`);
      }
    });

    it('every relevantColumns entry is a real table, column or literal value used in the SQL', () => {
      for (const s of data.scenarios) {
        const schemaLines = (s.schemaText || '').split('\n');
        const validTokens = new Set();
        for (const line of schemaLines) {
          const match = line.match(/^(\w+)\s*\((.+)\)/);
          if (match) {
            validTokens.add(match[1].toLowerCase());
            match[2].split(',').forEach(c => validTokens.add(c.trim().toLowerCase()));
          }
        }
        for (const col of s.relevantColumns) {
          const lower = col.toLowerCase();
          const isValid = validTokens.has(lower) || s.sql.toLowerCase().includes(lower);
          assert(isValid, `${s.id} has invalid relevantColumn token: ${col}`);
        }
      }
    });

    it('Step 1 regression: all 420 scenarios built from Crack_SQL_420_Simple.json vs split domain + .sql.json files yield identical score, ready, and feedback', async () => {
      const { getEffectiveScenario } = await import('../js/curriculum.js');
      const originalSimple = JSON.parse(fs.readFileSync('./data/Crack_SQL_420_Simple.json', 'utf8'));
      assert.strictEqual(originalSimple.length, 420, 'Crack_SQL_420_Simple.json must have 420 scenarios');

      const domainSlugs = {
        'Banking': 'banking',
        'Healthcare': 'healthcare',
        'Insurance': 'insurance',
        'Capital Markets': 'capital-markets',
        'Semiconductor': 'semiconductor',
        'Education': 'education',
        'Retail': 'retail'
      };

      const mergedByDomainId = new Map();
      for (const [domainName, slug] of Object.entries(domainSlugs)) {
        const domainRecords = JSON.parse(fs.readFileSync(`./data/domains/${slug}.json`, 'utf8'));
        const sqlMap = JSON.parse(fs.readFileSync(`./data/domains/${slug}.sql.json`, 'utf8'));
        assert.strictEqual(domainRecords.length, 60, `${domainName} domain file must have 60 scenarios`);

        for (const rec of domainRecords) {
          assert.strictEqual(rec.answer_sql, undefined, `${rec.id} in ${slug}.json should not embed answer_sql before merge`);
          const sqlText = String(sqlMap[rec.id] || '').trim();
          assert(sqlText.length > 0, `${rec.id} must have non-empty SQL in ${slug}.sql.json`);
          mergedByDomainId.set(rec.id, {
            ...rec,
            answer_sql: sqlText,
            sql: sqlText
          });
        }
      }

      assert.strictEqual(mergedByDomainId.size, 420, 'Merged domain files must total 420 scenarios');

      for (const rawOrig of originalSimple) {
        const rawMerged = mergedByDomainId.get(rawOrig.id);
        assert(rawMerged, `Merged scenario ${rawOrig.id} must exist`);

        const origScenario = getEffectiveScenario(rawOrig);
        const mergedScenario = getEffectiveScenario(rawMerged);

        assert.strictEqual(mergedScenario.sql, origScenario.sql, `SQL must match for ${rawOrig.id}`);
        assert.strictEqual(mergedScenario.question, origScenario.question, `Question must match for ${rawOrig.id}`);
        assert.strictEqual(mergedScenario.schemaText, origScenario.schemaText, `Schema must match for ${rawOrig.id}`);

        const sampleReasonings = [
          origScenario.pseudo || 'Use the required tables, filter the records by the condition, and return the result.',
          `From ${(origScenario.requiredTables || origScenario.tables).join(' and ')}, filter where status is Active and group by to count and sort the output.`,
          'Use the records where the amount is less than 100 and show the output.'
        ];

        for (const sampleText of sampleReasonings) {
          const evalOrig = evaluateThinking(origScenario, sampleText);
          const evalMerged = evaluateThinking(mergedScenario, sampleText);

          assert.strictEqual(evalMerged.score, evalOrig.score, `Score mismatch for ${rawOrig.id}`);
          assert.strictEqual(evalMerged.ready, evalOrig.ready, `Ready mismatch for ${rawOrig.id}`);
          assert.strictEqual(evalMerged.message, evalOrig.message, `Feedback message mismatch for ${rawOrig.id}`);
        }
      }
    });
  });
});


