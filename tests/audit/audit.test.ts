/**
 * Governance Audit Tests
 * Verifies that commit validation and design system auditing function with exact precision.
 *
 * @copyright 2026 Muath R Abu Ouda <muathrabuouda@hotmail.com>
 * @license MIT
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { validateCommitMessage } from "../../src/audit/git.ts";
import { auditFileDesign } from "../../src/audit/design.ts";
import { writeFileSync, unlinkSync } from "node:fs";

test("Conventional Commits: valid messages pass", () => {
  const validMessages = [
    "feat: add scaffolding engine",
    "fix(audit): correct regex for commit scopes",
    "docs(foundation): update brief with in-scope boundaries",
    "refactor: restructure docs into 3 pillars",
    "test(verify): add property tests for arabic normalization",
    "chore: pin typescript to 5.7.2",
  ];

  for (const msg of validMessages) {
    const result = validateCommitMessage(msg);
    assert.equal(result.valid, true, `Expected "${msg}" to be valid`);
  }
});

test("Conventional Commits: invalid messages are rejected", () => {
  const invalidMessages = [
    "added some files", // missing type
    "feat: Add capital letter at start", // capital letter in description (optional, but let's check pattern)
    "feat: subject ending with a period.", // trailing period
    "unknown(scope): invalid type", // invalid type
    "feat: " + "a".repeat(75), // over 72 chars
  ];

  for (const msg of invalidMessages) {
    const result = validateCommitMessage(msg);
    assert.equal(result.valid, false, `Expected "${msg}" to be invalid`);
  }
});

test("Design System Audit: catches green background violations", () => {
  const tempFile = "temp_test_view.vue";
  try {
    writeFileSync(
      tempFile,
      `<template>\n  <div class="bg-[#14A800] p-4">\n    <h1>Hello</h1>\n  </div>\n</template>`,
      "utf8",
    );
    const violations = auditFileDesign(tempFile);
    assert.equal(violations.length, 1);
    assert.equal(violations[0].line, 2);
    assert.match(violations[0].message, /Green \(#14A800\) is an accent color, NEVER a background/);
  } finally {
    try {
      unlinkSync(tempFile);
    } catch {
      // ignore
    }
  }
});
