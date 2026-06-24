// Mock DOM and localStorage for Node testing environment
global.localStorage = {
  store: {},
  getItem(key) {
    return this.store[key] || null;
  },
  setItem(key, value) {
    this.store[key] = String(value);
  },
  removeItem(key) {
    delete this.store[key];
  },
  clear() {
    this.store = {};
  }
};

global.document = {
  body: {},
  createElement() {
    return {
      setAttribute() {},
      click() {}
    };
  },
  querySelector() {
    return {
      classList: {
        add() {},
        remove() {}
      },
      textContent: ""
    };
  }
};

import { createNewProject } from './project/projectSchema.js';
import { getActiveProject, updateActiveProject } from './project/projectManager.js';
import { createPromptChild, buildLineageTree } from './evolution/promptLineage.js';
import { mineSuccessPatterns } from './intelligence/patternMiner.js';
import { createExperiment } from './intelligence/experimentRunner.js';
import { importLabData } from './export/importLabData.js';
import { checkModuleHealth } from './diagnostics/moduleHealth.js';
import { runFullDiagnostics } from './diagnostics/connectionTest.js';
import { generateRandomPrompt, generateValidRandomPrompt } from './randomizer/randomPromptEngine.js';
import { createPromptRecipe } from './randomizer/promptRecipe.js';
import { encodeRecipe, decodeRecipe } from './randomizer/shareCode.js';

console.log("==================================================");
console.log("TRIPO PROMPT LAB - RUNNING INTELLIGENCE LAYER TESTS");
console.log("==================================================");

// Test 1: Project creation and active state
console.log("\nTest 1: Project Lifecycle...");
const initialProject = getActiveProject();
console.log(`- Default project loaded: "${initialProject.name}"`);
if (!initialProject.id || initialProject.name !== "Primary Tripo Research") {
  console.error("FAIL: Default project initialization failed!");
  process.exit(1);
}
console.log("PASS: Project lifecycle verified.");

// Test 2: Mutation lineages
console.log("\nTest 2: Prompt Mutation Lineage Tracking...");
const p1 = { id: "p_1", prompt: "base prompt", config: {} };
const p2 = createPromptChild("p_1", "material", "mutated material prompt");
const p3 = createPromptChild(p2.id, "style", "mutated style prompt");

initialProject.prompts.push(p1);
initialProject.prompts.push({ ...p2, config: {} });
initialProject.prompts.push({ ...p3, config: {} });

const roots = buildLineageTree(initialProject);
console.log(`- Detected lineage roots: ${roots.length}`);
if (roots.length !== 1) {
  console.error("FAIL: Lineage tree build failed to identify the single root!");
  process.exit(1);
}
const child1 = roots[0].children[0];
if (!child1 || child1.parentId !== "p_1") {
  console.error("FAIL: Lineage child parentId map error!");
  process.exit(1);
}
console.log("PASS: Lineage trees verify perfectly.");

// Test 3: Success pattern miner
console.log("\nTest 3: Success Pattern Mining...");
// Add mock prompt and scored result
const mockPromptItem = { id: "p_miner", prompt: "reactor, industrial style, metallic panels", config: {} };
initialProject.prompts.push(mockPromptItem);
initialProject.results.push({
  promptId: "p_miner",
  userScore: 5
});
updateActiveProject(initialProject);

const patterns = mineSuccessPatterns(initialProject);
console.log(`- Mined terms count: ${patterns.length}`);
const metallicPattern = patterns.find(p => p.term === "metallic panels");
if (!metallicPattern || metallicPattern.count !== 1) {
  console.error("FAIL: Success pattern miner failed to extract matching terms!");
  process.exit(1);
}
console.log("PASS: Pattern miner verified.");

// Test 4: Experiment Runner
console.log("\nTest 4: Experiment scaling sets...");
const baseConfig = {
  category: "INDUSTRIAL",
  subject: "Refineries",
  triangleCap: 2000,
  topologyMode: "SmartMesh",
  detailDensity: 50,
  style: "industrial",
  productionTarget: "Game"
};
const experiment = createExperiment("Triangle test", baseConfig, "triangleCap", [500, 10000]);
console.log(`- Experiment generated ${experiment.prompts.length} variant prompts`);
if (experiment.prompts.length !== 2 || experiment.prompts[0].config.triangleCap !== 500) {
  console.error("FAIL: Experiment runner configuration mismatch!");
  process.exit(1);
}
console.log("PASS: Experiment runner verified.");

// Test 5: Import and version validation
console.log("\nTest 5: Export JSON Import Validation...");
const exportPayload = {
  version: "1.0.0",
  project: {
    id: "proj_imported",
    name: "Imported Experiment Data",
    prompts: [],
    results: [],
    favorites: [],
    notes: [],
    settings: {}
  }
};
const importedProj = importLabData(JSON.stringify(exportPayload));
if (importedProj.id !== "proj_imported") {
  console.error("FAIL: Project import content validation failed!");
  process.exit(1);
}

// Check validation errors
try {
  importLabData(JSON.stringify({ version: "0.9.0", project: {} }));
  console.error("FAIL: Import failed to throw version error!");
  process.exit(1);
} catch (e) {
  console.log(`- Expected validation failure caught: "${e.message}"`);
}
console.log("PASS: Import validation verified.");

// Test 6: Module health inspector
console.log("\nTest 6: Module Health Audit...");
const mockModules = {
  projectManager: { getActiveProject, updateActiveProject },
  promptLineage: { createPromptChild, buildLineageTree },
  errorHandler: null
};
const health = checkModuleHealth(mockModules);
console.log(`- Module health results:`, health);
if (health[0].status !== "PASS" || health[2].status !== "FAIL") {
  console.error("FAIL: Health inspector reported incorrect status!");
  process.exit(1);
}
console.log("PASS: Health inspector verified.");

// Test 7: Full diagnostics compiler
console.log("\nTest 7: Full Diagnostics Compilation...");
const diagReport = runFullDiagnostics(mockModules);
console.log(`- Compiled connection test count: ${diagReport.connection.length}`);
console.log(`- Diagnostics report timestamp: ${diagReport.timestamp}`);
if (!diagReport.connection || !diagReport.events || !diagReport.errors) {
  console.error("FAIL: Full diagnostics compilation failed!");
  process.exit(1);
}
console.log("PASS: Full diagnostics compiled.");

// Test 8: Extended Random Prompt System
console.log("\nTest 8: Extended Random Prompt System...");
const randomConfig = {
  profileKey: "powerArmor",
  triangleCap: 10000,
  seed: "tripo_test_seed",
  chaos: "balanced"
};

const pSeed1 = generateRandomPrompt(randomConfig);
const pSeed2 = generateRandomPrompt(randomConfig);
console.log(`- Seeded prompt 1: "${pSeed1}"`);
console.log(`- Seeded prompt 2: "${pSeed2}"`);

if (pSeed1 !== pSeed2) {
  console.error("FAIL: Seeded random generation is not deterministic!");
  process.exit(1);
}
console.log("- Determinism check: PASS");

const validResult = generateValidRandomPrompt(randomConfig);
console.log(`- Valid random prompt: "${validResult.prompt}"`);
if (!validResult.prompt) {
  console.error("FAIL: generateValidRandomPrompt returned empty prompt!");
  process.exit(1);
}
console.log("- Validation check: PASS");

const recipe = createPromptRecipe(randomConfig, validResult.prompt);
const shareCode = encodeRecipe(recipe);
console.log(`- Encoded Share Code: ${shareCode}`);
if (!shareCode) {
  console.error("FAIL: Share code encoding returned empty string!");
  process.exit(1);
}

const decodedRecipe = decodeRecipe(shareCode);
console.log(`- Decoded Recipe Prompt: "${decodedRecipe.prompt}"`);
if (decodedRecipe.prompt !== validResult.prompt || decodedRecipe.seed !== randomConfig.seed) {
  console.error("FAIL: Share code round-trip failed!");
  process.exit(1);
}
console.log("- Share code round-trip: PASS");
console.log("PASS: Extended Random Prompt System verified.");

console.log("\n==================================================");
console.log("ALL MASTERPIECE INTELLIGENCE TESTS COMPLETED SUCCESSFULLY!");
console.log("==================================================");
process.exit(0);
