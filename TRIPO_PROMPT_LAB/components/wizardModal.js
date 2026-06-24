import { runWizard } from '../engine/wizardEngine.js';
import { createPromptRecipe } from '../randomizer/promptRecipe.js';
import { encodeRecipe } from '../randomizer/shareCode.js';

export function initWizardModal(onApply) {
  // Create modal container if not exists
  let modal = document.getElementById("wizardModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "wizardModal";
    modal.className = "modal-overlay";
    modal.style.display = "none";
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>🪄 ASSET WIZARD</h3>
          <span class="modal-close" id="closeWizardBtn">&times;</span>
        </div>
        <div class="modal-body">
          <p class="modal-desc">Describe what you want to build in plain English. The engine will infer the Category, Cap, Topology, and Style to construct your S-Tier prompt.</p>
          
          <div class="form-group">
            <label for="wizardInput">Plain English Intent</label>
            <textarea id="wizardInput" class="wizard-textarea" placeholder="e.g. A game-ready sci-fi space station with docking ports at 15000 triangles..."></textarea>
          </div>

          <!-- Real-time Intelligence Report -->
          <div id="wizardIntelligenceReport" style="margin-top: 1rem; background: rgba(5,8,16,0.8); border: 1px solid var(--border-color); border-radius: 4px; padding: 0.75rem; display: none;">
            <h4 style="color: var(--neon-cyan); margin: 0 0 0.5rem 0; font-family: var(--font-title); font-size: 0.8rem; text-transform: uppercase;">🧠 Wizard Intelligence Report</h4>
            <div id="wizardIntelligenceContent"></div>
          </div>
          
          <div class="quick-examples" style="margin-top: 1rem;">
            <span class="ex-lbl">Try Examples:</span>
            <button class="btn-ex-chip" data-text="A cinematic gothic knight armor suit at 20000 tris with edge wear details">Gothic Armor (20k)</button>
            <button class="btn-ex-chip" data-text="A low-poly retro-futuristic combat tank at 2000 tris">Combat Tank (2k)</button>
            <button class="btn-ex-chip" data-text="An industrial fusion reactor cooling tower at 10000 triangles">Fusion Reactor (10k)</button>
          </div>
        </div>
        <div class="modal-footer" style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; width: 100%;">
          <button id="wizardSubmitBtn" class="btn btn-primary" style="font-size: 0.75rem; padding: 0.5rem;">🔧 Infer & Load</button>
          <button id="wizardGenerateBtn" class="btn btn-primary" style="font-size: 0.75rem; padding: 0.5rem; background: var(--neon-magenta); box-shadow: 0 0 10px rgba(255,0,127,0.3); color: #fff; border-color: var(--neon-magenta);">🚀 Infer & Generate</button>
          <button id="wizardRandomizeBtn" class="btn btn-secondary" style="font-size: 0.75rem; padding: 0.5rem;">🎲 Randomize Inferred</button>
          <button id="wizardRecipeBtn" class="btn btn-secondary" style="font-size: 0.75rem; padding: 0.5rem;">💾 Save Recipe Code</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  const openBtn = document.getElementById("openWizardBtn");
  const closeBtn = document.getElementById("closeWizardBtn");
  const submitBtn = document.getElementById("wizardSubmitBtn");
  const generateBtn = document.getElementById("wizardGenerateBtn");
  const randomizeBtn = document.getElementById("wizardRandomizeBtn");
  const recipeBtn = document.getElementById("wizardRecipeBtn");
  const wizardInput = document.getElementById("wizardInput");
  const chips = modal.querySelectorAll(".btn-ex-chip");

  function calculateConfidence(text) {
    let score = 0;
    const cleanText = text.toLowerCase();
    
    // Explicit cap: e.g. "15000" or "15k"
    if (cleanText.match(/(\d+)\s*(?:k|thousand|tris|triangles|polygon|t)/i)) score += 20;
    
    // Explicit style: industrial, brutalist, cyberpunk, gothic, militarized, etc.
    const styles = ["industrial", "brutalist", "cyberpunk", "gothic", "militarized", "fantasy", "sci-fi", "utopian", "rugged", "realistic", "retro-futuristic"];
    if (styles.some(s => cleanText.includes(s))) score += 20;
    
    // Explicit subject
    const subjectsList = ["refineries", "factories", "reactors", "shipyards", "stations", "capital ship", "carrier", "outpost", "mech", "armor", "creature", "humanoid", "tank", "aircraft", "spacecraft", "naval"];
    if (subjectsList.some(s => cleanText.includes(s))) score += 20;
    
    // Explicit material
    const materials = ["steel", "alloy", "titanium", "ceramic", "carbon", "iron", "carapace", "obsidian", "concrete", "stone"];
    if (materials.some(m => cleanText.includes(m))) score += 20;
    
    // Explicit topology
    if (/organic|low-poly|game-ready|print|retopo|cinematic/i.test(cleanText)) score += 20;
    
    return Math.max(20, score);
  }

  function getTriangleCapExplanation(cap) {
    if (cap <= 2000) {
      return "Low-poly preview: Optimized for rapid layout testing and quick silhouette iterations in Tripo.";
    }
    if (cap <= 10000) {
      return "Real-time game asset: Snaps perfectly to standard polygon budget. Balanced mesh weight.";
    }
    return "Cinematic hero target: High density allows complex micro-anchors, weathering, and edge loops.";
  }

  function updateReport() {
    const text = wizardInput.value.trim();
    const reportContainer = document.getElementById("wizardIntelligenceReport");
    const reportContent = document.getElementById("wizardIntelligenceContent");
    
    if (!text) {
      if (reportContainer) reportContainer.style.display = "none";
      return;
    }
    
    const result = runWizard(text);
    const confidence = calculateConfidence(text);
    const capExplanation = getTriangleCapExplanation(result.triangleCap);
    
    // Check conflicts
    const isOrganicSubject = ["creatures", "humanoids"].some(s => result.subject.toLowerCase().includes(s));
    const isHardSurfaceTopo = result.topologyMode.toLowerCase().includes("hard_surface") || result.topologyMode.toLowerCase().includes("smartmesh");
    const hasConflict = isOrganicSubject && isHardSurfaceTopo;
    
    if (reportContainer && reportContent) {
      reportContainer.style.display = "block";
      reportContent.innerHTML = `
        <!-- Live Extracted Chips -->
        <div style="display: flex; gap: 0.35rem; flex-wrap: wrap; margin-bottom: 0.6rem; margin-top: 0.5rem; justify-content: flex-start;">
          <span style="font-size: 0.65rem; padding: 0.15rem 0.4rem; border-radius: 3px; background: rgba(0, 128, 255, 0.15); color: #0080ff; border: 1px solid rgba(0, 128, 255, 0.3); font-family: var(--font-mono); font-weight: bold;">
            CAT: ${result.category}
          </span>
          <span style="font-size: 0.65rem; padding: 0.15rem 0.4rem; border-radius: 3px; background: rgba(57, 255, 20, 0.15); color: var(--neon-green); border: 1px solid rgba(57, 255, 20, 0.3); font-family: var(--font-mono); font-weight: bold;">
            SUBJ: ${result.subject}
          </span>
          <span style="font-size: 0.65rem; padding: 0.15rem 0.4rem; border-radius: 3px; background: rgba(0, 240, 255, 0.15); color: var(--neon-cyan); border: 1px solid rgba(0, 240, 255, 0.3); font-family: var(--font-mono); font-weight: bold;">
            CAP: ${result.triangleCap.toLocaleString()}
          </span>
          <span style="font-size: 0.65rem; padding: 0.15rem 0.4rem; border-radius: 3px; background: rgba(128, 0, 255, 0.15); color: #8000ff; border: 1px solid rgba(128, 0, 255, 0.3); font-family: var(--font-mono); font-weight: bold;">
            TOPO: ${result.topologyMode}
          </span>
        </div>

        <!-- Confidence Meter -->
        <div style="margin-bottom: 0.6rem; text-align: left;">
          <div style="display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--text-muted); margin-bottom: 0.15rem; font-family: var(--font-mono);">
            <span>Matching Confidence</span>
            <span style="color: ${confidence >= 80 ? 'var(--neon-green)' : confidence >= 40 ? 'var(--neon-amber)' : 'var(--neon-magenta)'}">${confidence}%</span>
          </div>
          <div style="height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden;">
            <div style="width: ${confidence}%; height: 100%; background: ${confidence >= 80 ? 'var(--neon-green)' : confidence >= 40 ? 'var(--neon-amber)' : 'var(--neon-magenta)'}; transition: width 0.3s ease;"></div>
          </div>
        </div>

        <!-- Topology Conflict Warning -->
        ${hasConflict ? `
          <div style="background: rgba(255, 0, 127, 0.08); border: 1px solid rgba(255, 0, 127, 0.25); border-radius: 4px; padding: 0.5rem; margin-bottom: 0.5rem; text-align: left; color: var(--neon-magenta); font-size: 0.7rem; font-family: var(--font-mono);">
            ⚠️ Topology Conflict: Organic subject paired with hard-surface topology. Snapping topology mode to Organic is recommended.
          </div>
        ` : ""}

        <!-- Triangle-cap Explanation -->
        <div style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 0.5rem; text-align: left; border-left: 2px solid var(--neon-cyan); padding-left: 0.5rem;">
          <strong>Cap Budget:</strong> ${capExplanation}
        </div>

        <!-- Why this prompt will work -->
        <div style="background: rgba(57,255,20,0.03); border: 1px solid rgba(57,255,20,0.15); border-radius: 4px; padding: 0.5rem; text-align: left;">
          <h5 style="color: var(--neon-green); font-size: 0.75rem; margin: 0 0 0.25rem 0; font-family: var(--font-title); text-transform: uppercase;">✔ Why this prompt will work</h5>
          <ul style="margin: 0; padding-left: 1rem; font-size: 0.7rem; color: var(--text-muted); line-height: 1.3;">
            <li>Subject placement shapes the primary silhouette grid.</li>
            <li>Inferred topology avoids non-manifold face errors during Tripo synthesis.</li>
            <li>Specific S-Tier detail anchors maximize geometric information return.</li>
          </ul>
        </div>
      `;
    }
  }

  // Open Modal
  if (openBtn) {
    openBtn.addEventListener("click", () => {
      wizardInput.value = "";
      const reportContainer = document.getElementById("wizardIntelligenceReport");
      if (reportContainer) reportContainer.style.display = "none";
      modal.style.display = "flex";
    });
  }

  // Close Modal
  closeBtn.addEventListener("click", () => {
    modal.style.display = "none";
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
  });

  // Example Chips
  chips.forEach(chip => {
    chip.addEventListener("click", () => {
      wizardInput.value = chip.dataset.text;
      updateReport();
    });
  });

  wizardInput.addEventListener("input", updateReport);

  // Submit Intent (Infer & Load)
  submitBtn.addEventListener("click", () => {
    const text = wizardInput.value.trim();
    if (!text) return;

    const resultState = runWizard(text);
    onApply(resultState, false); // Load only
    modal.style.display = "none";
  });

  // Infer & Generate
  generateBtn.addEventListener("click", () => {
    const text = wizardInput.value.trim();
    if (!text) return;

    const resultState = runWizard(text);
    onApply(resultState, true); // Generate immediately
    modal.style.display = "none";
  });

  // Randomize within Inferred
  randomizeBtn.addEventListener("click", () => {
    const text = wizardInput.value.trim();
    if (!text) return;

    const resultState = runWizard(text);
    // Add randomization elements
    resultState.silhouetteIdx = Math.floor(Math.random() * 3);
    resultState.materialIdx = Math.floor(Math.random() * 3);
    resultState.detailDensity = Math.floor(Math.random() * 50) + 50;
    
    // Snap to a random style tag from subjects
    const styles = ["industrial", "brutalist", "cyberpunk", "gothic", "militarized", "fantasy", "sci-fi"];
    resultState.style = styles[Math.floor(Math.random() * styles.length)];

    onApply(resultState, true);
    modal.style.display = "none";
  });

  // Save Inferred Recipe
  recipeBtn.addEventListener("click", () => {
    const text = wizardInput.value.trim();
    if (!text) return;

    const resultState = runWizard(text);
    const config = {
      seed: "wizard_inferred_" + Math.floor(Math.random() * 1000),
      profileKey: resultState.category.toLowerCase() === "scifi" ? "megastructures" : "powerArmor",
      triangleCap: resultState.triangleCap,
      chaos: "safe"
    };

    const recipe = createPromptRecipe(config, `Inferred prompt from: "${text}"`);
    const shareCode = encodeRecipe(recipe);
    
    navigator.clipboard.writeText(shareCode);
    alert("Inferred recipe share code copied to clipboard!\n" + shareCode);
  });
}
