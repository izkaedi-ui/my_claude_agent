import { initSelectors } from './components/selectors.js';
import { initPromptOutput } from './components/promptOutput.js';
import { initRoiPanel } from './components/roiPanel.js';
import { initBenchmarkPanel } from './components/benchmarkPanel.js';
import { initValidationPanel } from './components/validationPanel.js';

import { initWizardModal } from './components/wizardModal.js';
import { initComparisonModal } from './components/comparisonModal.js';

import { assemblePrompt } from './engine/promptGenerator.js';
import { bonusAudit, autoFixPrompt } from './engine/roiEngine.js';
import { validatePrompt } from './engine/validator.js';
import { calculateComplexity } from './engine/benchmarkScorer.js';

// Masterpiece imports
import { getActiveProject, updateActiveProject } from './project/projectManager.js';
import { initProjectTimeline } from './project/projectTimeline.js';
import { initInsightFeed } from './ui/insightFeed.js';
import { initResultUploader } from './results/resultUploader.js';
import { initResultGallery } from './results/resultGallery.js';
import { initVariantTree } from './evolution/variantTrees.js';
import { initExperimentBoard } from './ui/experimentBoard.js';
import { initCollectionShelf } from './ui/collectionShelf.js';

import { exportLabData } from './export/exportLabData.js';
import { importLabData } from './export/importLabData.js';
import { exportMarkdownReport } from './export/exportMarkdownReport.js';

// Diagnostics imports
import { safeRun, clearErrorLog } from './diagnostics/errorHandler.js';
import { auditEvent } from './diagnostics/eventAudit.js';
import { runConnectionTest, renderConnectionTest } from './diagnostics/connectionTest.js';

// Randomizer imports
import { generateValidRandomPrompt } from './randomizer/randomPromptEngine.js';
import { createPromptRecipe } from './randomizer/promptRecipe.js';
import { encodeRecipe, decodeRecipe } from './randomizer/shareCode.js';

// Central State management
const state = {
  category: "INDUSTRIAL",
  subject: "Refineries",
  triangleCap: 5000,
  topologyMode: "SmartMesh",
  detailDensity: 75,
  style: "industrial",
  productionTarget: "Game",
  silhouetteIdx: 0,
  materialIdx: 0,
  uiMode: "beginner", // beginner vs expert
  lockedFields: {
    category: false,
    subject: false,
    triangleCap: false,
    topologyMode: false,
    style: false
  }
};

// UI Components
let syncUI;
let promptOutputComponent;
let roiPanelComponent;
let benchmarkPanelComponent;
let validationPanelComponent;
let projectTimelineComponent;
let insightFeedComponent;

// Project state variables
let activeProject = getActiveProject();
let currentPromptId = null;
let pendingParentId = null;
let pendingMutationType = null;
let autoPilotInterval = null;

// Diagnostics exposed app object
const app = {
  generatePrompt: () => {
    updateApp();
    return document.getElementById("promptTextBox")?.value || "";
  },
  validatePrompt: (prompt) => {
    return validatePrompt(prompt, state);
  },
  calculateGeometryROI: (prompt) => {
    return bonusAudit(prompt, state.triangleCap, state);
  }
};

function updateApp() {
  // 1. Generate Prompt based on state
  let prompt = assemblePrompt(state);

  // If beginner mode has autoFixPrompt enabled:
  if (state.uiMode === "beginner") {
    prompt = autoFixPrompt(prompt, state.triangleCap);
  }

  // 2. Perform Audit
  const audit = bonusAudit(prompt, state.triangleCap, state);

  // 3. Run Validation
  const validation = validatePrompt(prompt, state);

  // 4. Score Complexity
  const complexity = calculateComplexity(prompt);

  // 5. Render Panel Outputs
  promptOutputComponent.render(prompt, state);
  roiPanelComponent.render(prompt, audit);
  benchmarkPanelComponent.render(prompt, complexity, audit.roiScore, state);
  validationPanelComponent.render(validation, prompt, state);

  // 6. Save to active project prompts (if it's a valid structured output)
  if (validation.passedCount >= 6) {
    const isNew = !activeProject.prompts.some(p => p.prompt === prompt);
    if (isNew) {
      const newPromptItem = {
        id: "p_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
        prompt,
        config: { ...state },
        createdAt: new Date().toISOString(),
        parentPromptId: pendingParentId || null,
        mutationType: pendingMutationType || null
      };
      activeProject.prompts.push(newPromptItem);
      updateActiveProject(activeProject);
      currentPromptId = newPromptItem.id;
    } else {
      const existing = activeProject.prompts.find(p => p.prompt === prompt);
      currentPromptId = existing.id;
    }
    // Reset mutations
    pendingParentId = null;
    pendingMutationType = null;
  }

  // 7. Render Project Timeline and Insights Feed
  if (projectTimelineComponent) {
    projectTimelineComponent.render(activeProject);
  }
  if (insightFeedComponent) {
    insightFeedComponent.render(activeProject);
  }
}

function updateAppWithPrompt(prompt) {
  // 1. Perform Audit
  const audit = bonusAudit(prompt, state.triangleCap, state);

  // 2. Run Validation
  const validation = validatePrompt(prompt, state);

  // 3. Score Complexity
  const complexity = calculateComplexity(prompt);

  // 4. Render Panel Outputs
  promptOutputComponent.render(prompt, state);
  roiPanelComponent.render(prompt, audit);
  benchmarkPanelComponent.render(prompt, complexity, audit.roiScore, state);
  validationPanelComponent.render(validation, prompt, state);

  // 5. Save to active project prompts (if it's a valid structured output)
  if (validation.passedCount >= 6) {
    const isNew = !activeProject.prompts.some(p => p.prompt === prompt);
    if (isNew) {
      const newPromptItem = {
        id: "p_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
        prompt,
        config: { ...state },
        createdAt: new Date().toISOString(),
        parentPromptId: pendingParentId || null,
        mutationType: pendingMutationType || null
      };
      activeProject.prompts.push(newPromptItem);
      updateActiveProject(activeProject);
      currentPromptId = newPromptItem.id;
    } else {
      const existing = activeProject.prompts.find(p => p.prompt === prompt);
      currentPromptId = existing.id;
    }
    pendingParentId = null;
    pendingMutationType = null;
  }

  // 6. Render Project Timeline and Insights Feed
  if (projectTimelineComponent) {
    projectTimelineComponent.render(activeProject);
  }
  if (insightFeedComponent) {
    insightFeedComponent.render(activeProject);
  }
}

// Callback when mutated configuration is received (locks respected)
function handleMutation(mutatedState, mutationType) {
  // Apply changes only to UNLOCKED fields
  Object.keys(mutatedState).forEach(key => {
    if (state.lockedFields[key] === true) {
      // Locked: preserve old value
      return;
    }
    state[key] = mutatedState[key];
  });
  
  if (mutationType) {
    pendingParentId = currentPromptId;
    pendingMutationType = mutationType;
  }
  
  syncUI(); // Update select dropdown positions visually
  updateApp();
}

// One-click Auto-Fix warnings handler
function handleAutoFix() {
  let prompt = assemblePrompt(state);
  const fixedPrompt = autoFixPrompt(prompt, state.triangleCap);
  
  // Update state/text box directly
  promptOutputComponent.render(fixedPrompt, state);
  
  // Re-run audit, validation, and benchmarking with the fixed text
  const audit = bonusAudit(fixedPrompt, state.triangleCap, state);
  const validation = validatePrompt(fixedPrompt, state);
  const complexity = calculateComplexity(fixedPrompt);

  roiPanelComponent.render(fixedPrompt, audit);
  benchmarkPanelComponent.render(fixedPrompt, complexity, audit.roiScore, state);
  validationPanelComponent.render(validation, fixedPrompt, state);
}

// Beginner / Expert UI mode applicator
function applyUIMode(mode) {
  state.uiMode = mode;
  const advancedPanel = document.getElementById("advancedControlsPanel");
  const modeBeginnerBtn = document.getElementById("modeBeginnerBtn");
  const modeExpertBtn = document.getElementById("modeExpertBtn");

  if (mode === "beginner") {
    advancedPanel.style.display = "none";
    modeBeginnerBtn.classList.add("active");
    modeExpertBtn.classList.remove("active");
  } else {
    advancedPanel.style.display = "block";
    modeBeginnerBtn.classList.remove("active");
    modeExpertBtn.classList.add("active");
  }
  updateApp();
}

// Roll S-tier random configurations (respecting padlocks)
function runRandomDiscovery() {
  const categories = ["INDUSTRIAL", "SCIFI", "MILITARY", "VEHICLES"];
  const caps = [2000, 5000, 10000, 20000];
  const topologies = ["SmartMesh", "Game_Assets", "Cinematic_Assets", "Hard_Surface"];
  const styles = ["industrial", "brutalist", "cyberpunk", "gothic", "militarized", "sci-fi"];

  const randomCat = categories[Math.floor(Math.random() * categories.length)];
  const randomCap = caps[Math.floor(Math.random() * caps.length)];
  const randomTopo = topologies[Math.floor(Math.random() * topologies.length)];
  const randomStyle = styles[Math.floor(Math.random() * styles.length)];

  const nextState = {};
  if (!state.lockedFields.category) nextState.category = randomCat;
  if (!state.lockedFields.triangleCap) nextState.triangleCap = randomCap;
  if (!state.lockedFields.topologyMode) nextState.topologyMode = randomTopo;
  if (!state.lockedFields.style) nextState.style = randomStyle;

  nextState.detailDensity = Math.floor(Math.random() * 50) + 50; // 50 to 100
  nextState.silhouetteIdx = Math.floor(Math.random() * 3);
  nextState.materialIdx = Math.floor(Math.random() * 3);

  handleMutation(nextState);
}

function runBulkDiscovery() {
  for (let i = 0; i < 10; i++) {
    const randomCat = ["INDUSTRIAL", "SCIFI", "MILITARY", "VEHICLES"][Math.floor(Math.random() * 4)];
    const randomCap = [2000, 5000, 10000, 20000][Math.floor(Math.random() * 4)];
    const randomTopo = ["SmartMesh", "Game_Assets", "Cinematic_Assets", "Hard_Surface"][Math.floor(Math.random() * 4)];
    const randomStyle = ["industrial", "brutalist", "cyberpunk", "gothic", "militarized", "sci-fi"][Math.floor(Math.random() * 6)];

    const nextConfig = { ...state };
    if (!state.lockedFields.category) nextConfig.category = randomCat;
    if (!state.lockedFields.triangleCap) nextConfig.triangleCap = randomCap;
    if (!state.lockedFields.topologyMode) nextConfig.topologyMode = randomTopo;
    if (!state.lockedFields.style) nextConfig.style = randomStyle;

    nextConfig.detailDensity = Math.floor(Math.random() * 50) + 50;
    nextConfig.silhouetteIdx = Math.floor(Math.random() * 3);
    nextConfig.materialIdx = Math.floor(Math.random() * 3);

    let prompt = assemblePrompt(nextConfig);
    if (state.uiMode === "beginner") {
      prompt = autoFixPrompt(prompt, nextConfig.triangleCap);
    }
    const validation = validatePrompt(prompt, nextConfig);

    if (validation.passedCount >= 6) {
      const isNew = !activeProject.prompts.some(p => p.prompt === prompt);
      if (isNew) {
        activeProject.prompts.push({
          id: "p_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
          prompt,
          config: nextConfig,
          createdAt: new Date().toISOString(),
          parentPromptId: null,
          mutationType: null
        });
      }
    }
  }
  updateActiveProject(activeProject);
  updateApp();
}

function toggleAutoPilot() {
  const btn = document.getElementById("autoPilotBtn");
  if (autoPilotInterval) {
    clearInterval(autoPilotInterval);
    autoPilotInterval = null;
    btn.textContent = "🤖 Auto-Pilot: OFF";
    btn.classList.remove("btn-active");
    auditEvent("autopilot-deactivated");
  } else {
    btn.textContent = "🤖 Auto-Pilot: ON";
    btn.classList.add("btn-active");
    auditEvent("autopilot-activated");
    runRandomDiscovery();
    autoPilotInterval = setInterval(() => {
      runRandomDiscovery();
    }, 5000);
  }
}

function initApp() {
  console.log("Tripo Prompt Lab initialization started.");

  // Initialize UI panels
  roiPanelComponent = initRoiPanel();
  benchmarkPanelComponent = initBenchmarkPanel();
  
  // validation panel needs autofix callback
  validationPanelComponent = initValidationPanel(handleAutoFix);

  promptOutputComponent = initPromptOutput(state, updateApp, handleMutation);

  // Initialize selectors
  syncUI = initSelectors(state, updateApp);

  // Initialize project timeline instead of old history tracker
  projectTimelineComponent = initProjectTimeline((loadedConfig) => {
    handleMutation(loadedConfig);
  });

  // Initialize adaptive insight feed
  insightFeedComponent = initInsightFeed(activeProject);

  // Initialize modals
  initWizardModal((wizardState, autoGenerate = true) => {
    handleMutation(wizardState);
    if (autoGenerate) {
      auditEvent("wizard-inferred-generate", wizardState);
    } else {
      auditEvent("wizard-inferred-load", wizardState);
    }
  });
  initComparisonModal();

  // Initialize masterpiece R&D mod/modals
  initResultUploader((updatedProject) => {
    activeProject = updatedProject;
    updateApp();
  });
  initResultGallery();
  initVariantTree();
  initExperimentBoard(state, (loadedConfig, promptText) => {
    handleMutation(loadedConfig);
    if (promptText) {
      const promptTextBox = document.getElementById("promptTextBox");
      if (promptTextBox) promptTextBox.value = promptText;
      updateAppWithPrompt(promptText);
    }
  }, (config, promptText) => {
    const project = getActiveProject();
    let promptItem = project.prompts.find(p => p.prompt === promptText);
    if (!promptItem) {
      promptItem = {
        id: "p_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
        prompt: promptText,
        config,
        createdAt: new Date().toISOString(),
        parentPromptId: null,
        mutationType: null
      };
      project.prompts.push(promptItem);
    }
    const favIdx = project.favorites.indexOf(promptItem.id);
    if (favIdx !== -1) {
      project.favorites.splice(favIdx, 1);
    } else {
      project.favorites.push(promptItem.id);
    }
    updateActiveProject(project);
    updateApp();
    auditEvent("experiment-variant-favorited", { promptId: promptItem.id });
  });
  initCollectionShelf((loadedConfig) => {
    handleMutation(loadedConfig);
  });

  // Wire import/export buttons
  document.getElementById("exportProjectBtn").addEventListener("click", () => {
    exportLabData(activeProject);
  });

  document.getElementById("exportReportBtn").addEventListener("click", () => {
    exportMarkdownReport(activeProject);
  });

  const importFileEl = document.getElementById("importProjectFile");
  document.getElementById("importProjectBtn").addEventListener("click", () => {
    importFileEl.click();
  });

  importFileEl.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const imported = importLabData(evt.target.result);
        activeProject = imported;
        if (activeProject.settings) {
          state.triangleCap = activeProject.settings.defaultTriangleCap || 5000;
          state.topologyMode = activeProject.settings.defaultMode || "SmartMesh";
          state.productionTarget = activeProject.settings.defaultTarget || "Game";
        }
        syncUI();
        updateApp();
        alert(`Successfully imported project: ${activeProject.name}`);
      } catch (err) {
        alert("Import failed: " + err.message);
      }
    };
    reader.readAsText(file);
  });

  // Mode click listeners
  document.getElementById("modeBeginnerBtn").addEventListener("click", () => applyUIMode("beginner"));
  document.getElementById("modeExpertBtn").addEventListener("click", () => applyUIMode("expert"));

  // Discovery click listener
  document.getElementById("randomDiscoveryBtn").addEventListener("click", runRandomDiscovery);
  document.getElementById("bulkDiscoveryBtn").addEventListener("click", runBulkDiscovery);
  document.getElementById("autoPilotBtn").addEventListener("click", toggleAutoPilot);

  // Apply default UI mode
  applyUIMode("beginner");

  console.log("Tripo Prompt Lab online.");
}

// Wrap initialization and wire diagnostic buttons
document.addEventListener("DOMContentLoaded", () => {
  safeRun("initApp", () => {
    initApp();
    auditEvent("app-init");
  });
});

let lastRandomConfig = null;

document.addEventListener("click", e => {
  if (e.target.matches("#randomPromptButton")) {
    safeRun("randomPromptButton", () => {
      const config = {
        profileKey: document.getElementById("randomProfileSelect").value,
        triangleCap: Number(document.getElementById("randomTriangleCap").value),
        seed: document.getElementById("seedInput").value || "",
        chaos: document.getElementById("chaosSelect").value
      };
      
      lastRandomConfig = config;
      
      const result = generateValidRandomPrompt(config);
      
      const promptTextBox = document.getElementById("promptTextBox");
      if (promptTextBox) {
        promptTextBox.value = result.prompt;
      }
      
      state.triangleCap = config.triangleCap;
      updateAppWithPrompt(result.prompt);
      
      const recipe = createPromptRecipe(config, result.prompt);
      const shareCode = encodeRecipe(recipe);
      
      const container = document.getElementById("recipeShareContainer");
      const output = document.getElementById("shareCodeOutput");
      if (container && output) {
        container.style.display = "block";
        output.value = shareCode;
      }
      
      auditEvent("random-prompt-generated", result);
    });
  }

  if (e.target.matches("#rerollButton")) {
    safeRun("rerollButton", () => {
      const seedEl = document.getElementById("seedInput");
      if (seedEl && !seedEl.value) {
        seedEl.value = Math.floor(Math.random() * 1000000).toString(16);
      }
      
      const config = {
        profileKey: document.getElementById("randomProfileSelect").value,
        triangleCap: Number(document.getElementById("randomTriangleCap").value),
        seed: seedEl ? seedEl.value : "",
        chaos: document.getElementById("chaosSelect").value
      };
      
      lastRandomConfig = config;
      
      const result = generateValidRandomPrompt(config);
      
      const promptTextBox = document.getElementById("promptTextBox");
      if (promptTextBox) {
        promptTextBox.value = result.prompt;
      }
      
      state.triangleCap = config.triangleCap;
      updateAppWithPrompt(result.prompt);
      
      const recipe = createPromptRecipe(config, result.prompt);
      const shareCode = encodeRecipe(recipe);
      
      const container = document.getElementById("recipeShareContainer");
      const output = document.getElementById("shareCodeOutput");
      if (container && output) {
        container.style.display = "block";
        output.value = shareCode;
      }
      
      auditEvent("random-prompt-rerolled", result);
    });
  }

  if (e.target.matches("#copyShareCodeBtn")) {
    safeRun("copyShareCodeBtn", () => {
      const output = document.getElementById("shareCodeOutput");
      if (output && output.value) {
        navigator.clipboard.writeText(output.value);
        alert("Recipe share code copied to clipboard!");
      }
    });
  }

  if (e.target.matches("#importShareCodeBtn")) {
    safeRun("importShareCodeBtn", () => {
      const input = document.getElementById("importShareCodeInput");
      if (input && input.value) {
        const recipe = decodeRecipe(input.value.trim());
        if (recipe) {
          document.getElementById("randomProfileSelect").value = recipe.profileKey || "orbitalRefinery";
          document.getElementById("randomTriangleCap").value = recipe.triangleCap || 10000;
          document.getElementById("seedInput").value = recipe.seed || "";
          document.getElementById("chaosSelect").value = recipe.chaos || "safe";
          
          const promptTextBox = document.getElementById("promptTextBox");
          if (promptTextBox) {
            promptTextBox.value = recipe.prompt;
          }
          
          state.triangleCap = recipe.triangleCap;
          updateAppWithPrompt(recipe.prompt);
          
          const container = document.getElementById("recipeShareContainer");
          const output = document.getElementById("shareCodeOutput");
          if (container && output) {
            container.style.display = "block";
            output.value = input.value.trim();
          }
          
          input.value = "";
          alert("Recipe successfully loaded!");
          auditEvent("random-prompt-imported", recipe);
        } else {
          alert("Invalid recipe share code.");
        }
      }
    });
  }

  if (e.target.matches("#generateButton")) {
    safeRun("generatePrompt", () => {
      app.generatePrompt();
      auditEvent("generate-click");
    });
  }

  if (e.target.matches("#runConnectionTest")) {
    safeRun("connectionTest", () => {
      const results = runConnectionTest(app);
      renderConnectionTest(results, document.querySelector("#connectionResults"));
    });
  }

  if (e.target.matches("#clearErrorLog")) {
    clearErrorLog();
    auditEvent("error-log-cleared");
  }
});

export { state, updateApp };
