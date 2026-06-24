import { createExperiment } from '../intelligence/experimentRunner.js';
import { validatePrompt } from '../engine/validator.js';
import { bonusAudit } from '../engine/roiEngine.js';
import { calculateComplexity, getBenchmarkGrade, estimateTriangleSpend } from '../engine/benchmarkScorer.js';
import { explainExpectedMeshBehavior, calculatePromptRisk } from '../engine/wizardEngine.js';

function getCategorySvg(category, subject) {
  const cat = (category || "").toLowerCase();
  const subj = (subject || "").toLowerCase();
  
  let paths = "";
  if (cat.includes("industrial") || subj.includes("refinery") || subj.includes("factory") || subj.includes("reactor")) {
    paths = `
      <rect x="25" y="45" width="20" height="40" fill="none" stroke="var(--neon-cyan)" stroke-width="2"/>
      <line x1="35" y1="45" x2="35" y2="15" stroke="var(--neon-cyan)" stroke-width="2"/>
      <rect x="55" y="30" width="25" height="55" fill="none" stroke="var(--neon-cyan)" stroke-width="2"/>
      <circle cx="67" cy="50" r="8" fill="none" stroke="var(--neon-cyan)" stroke-width="2"/>
    `;
  } else if (cat.includes("scifi") || subj.includes("station") || subj.includes("carrier") || subj.includes("space")) {
    paths = `
      <circle cx="50" cy="50" r="22" fill="none" stroke="var(--neon-cyan)" stroke-width="2" stroke-dasharray="6 3"/>
      <circle cx="50" cy="50" r="8" fill="none" stroke="var(--neon-cyan)" stroke-width="2"/>
      <line x1="20" y1="50" x2="80" y2="50" stroke="var(--neon-cyan)" stroke-width="1.5"/>
      <line x1="50" y1="20" x2="50" y2="80" stroke="var(--neon-cyan)" stroke-width="1.5"/>
    `;
  } else if (cat.includes("character") || subj.includes("humanoid") || subj.includes("armor") || subj.includes("mech") || cat.includes("creature") || subj.includes("creature")) {
    paths = `
      <circle cx="50" cy="38" r="16" fill="none" stroke="var(--neon-cyan)" stroke-width="2"/>
      <path d="M35 60 L35 80 L65 80 L65 60 Z" fill="none" stroke="var(--neon-cyan)" stroke-width="2"/>
      <path d="M25 45 C 35 25, 65 25, 75 45" fill="none" stroke="var(--neon-cyan)" stroke-width="2"/>
    `;
  } else if (cat.includes("vehicle") || subj.includes("tank") || subj.includes("aircraft") || subj.includes("naval")) {
    paths = `
      <rect x="20" y="52" width="60" height="18" rx="4" fill="none" stroke="var(--neon-cyan)" stroke-width="2"/>
      <circle cx="35" cy="70" r="4" fill="none" stroke="var(--neon-cyan)" stroke-width="1.5"/>
      <circle cx="50" cy="70" r="4" fill="none" stroke="var(--neon-cyan)" stroke-width="1.5"/>
      <circle cx="65" cy="70" r="4" fill="none" stroke="var(--neon-cyan)" stroke-width="1.5"/>
      <path d="M38 52 L45 35 L58 35 L65 52 Z" fill="none" stroke="var(--neon-cyan)" stroke-width="2"/>
    `;
  } else {
    paths = `
      <rect x="30" y="30" width="40" height="40" fill="none" stroke="var(--neon-cyan)" stroke-width="2"/>
      <line x1="20" y1="50" x2="80" y2="50" stroke="var(--neon-cyan)" stroke-dasharray="4 2"/>
      <line x1="50" y1="20" x2="50" y2="80" stroke="var(--neon-cyan)" stroke-dasharray="4 2"/>
    `;
  }

  return `
    <svg width="60" height="60" viewBox="0 0 100 100" style="background: rgba(5,8,16,0.8); border: 1px solid var(--border-color); border-radius: 4px; display: block; flex-shrink: 0; box-shadow: 0 0 8px rgba(0, 240, 255, 0.1);">
      ${paths}
    </svg>
  `;
}

export function initExperimentBoard(state, onApplyConfig, onToggleFavorite) {
  let modal = document.getElementById("experimentModal");
  let lastGeneratedExperiment = null;

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "experimentModal";
    modal.className = "modal-overlay";
    modal.style.display = "none";
    modal.innerHTML = `
      <div class="modal-content modal-content-wide" style="max-width: 900px;">
        <div class="modal-header">
          <h3>🔬 EXPERIMENT RUNNER</h3>
          <span class="modal-close" id="closeExperimentBtn">&times;</span>
        </div>
        <div class="modal-body">
          <p class="modal-desc">Test how specific prompt parameters scale across variant sets. This generates a collection of prompts with a variable test target.</p>
          
          <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 0.5rem;">
            <div class="form-group">
              <label for="experimentVarSelect">Variable to Test</label>
              <select id="experimentVarSelect">
                <option value="triangleCap">Triangle Cap scaling</option>
                <option value="style">Style tag mutation</option>
                <option value="detailDensity">Detail Density scaling</option>
              </select>
            </div>
            <div class="form-group" style="display: flex; gap: 0.5rem;">
              <button id="runExperimentBtn" class="btn btn-primary" style="margin-top: 1.1rem; height: 35px; flex: 2;">Generate Test Set</button>
              <button id="exportExperimentJsonBtn" class="btn btn-secondary" style="margin-top: 1.1rem; height: 35px; flex: 1;">📥 Export JSON</button>
            </div>
          </div>

          <div id="experimentGrid" class="experiment-grid-container" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; text-align: left; max-height: 450px; overflow-y: auto; padding-right: 0.5rem;"></div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  const openBtn = document.getElementById("openExperimentBtn");
  const closeBtn = document.getElementById("closeExperimentBtn");
  const runBtn = document.getElementById("runExperimentBtn");
  const exportJsonBtn = document.getElementById("exportExperimentJsonBtn");
  const varSelect = document.getElementById("experimentVarSelect");
  const grid = document.getElementById("experimentGrid");

  if (openBtn) {
    openBtn.addEventListener("click", () => {
      grid.innerHTML = "";
      modal.style.display = "flex";
    });
  }

  closeBtn.addEventListener("click", () => {
    modal.style.display = "none";
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
  });

  // Run Experiment
  runBtn.addEventListener("click", () => {
    const testVar = varSelect.value;
    let values = [];
    let name = "";

    if (testVar === "triangleCap") {
      values = [500, 2000, 10000, 20000];
      name = "Triangle Cap scaling run";
    } else if (testVar === "style") {
      values = ["industrial", "brutalist", "cyberpunk", "gothic", "militarized"];
      name = "Style tag mutation run";
    } else if (testVar === "detailDensity") {
      values = [15, 50, 85];
      name = "Detail Density scaling run";
    }

    // Capture state as base config
    const experiment = createExperiment(name, { ...state }, testVar, values);
    lastGeneratedExperiment = experiment;
    
    grid.innerHTML = experiment.prompts.map((item, idx) => {
      const val = validatePrompt(item.prompt, item.config);
      const audit = bonusAudit(item.prompt, item.config.triangleCap, item.config);
      const comp = calculateComplexity(item.prompt);
      const grade = getBenchmarkGrade(comp.complexityScore, audit.roiScore);
      const spend = estimateTriangleSpend(item.prompt);
      const risk = calculatePromptRisk(item.config, item.prompt);
      const behavior = explainExpectedMeshBehavior(item.config);

      const isLowCapCurvatureRisk = item.config.triangleCap < 10000 && (item.prompt.toLowerCase().includes("ring") || item.prompt.toLowerCase().includes("sphere") || item.prompt.toLowerCase().includes("aircraft"));

      const riskColor = risk === "HIGH" ? "var(--neon-magenta)" : risk === "MED" ? "var(--neon-amber)" : "var(--neon-green)";
      const riskBg = risk === "HIGH" ? "rgba(255, 0, 127, 0.1)" : risk === "MED" ? "rgba(255, 174, 0, 0.1)" : "rgba(57, 255, 20, 0.1)";

      return `
        <div class="experiment-card" style="border: 1px solid ${val.passedAll ? 'var(--border-color)' : 'rgba(255, 0, 127, 0.3)'}; padding: 0.75rem; border-radius: 6px; background: rgba(15, 22, 38, 0.4); display: flex; flex-direction: column; justify-content: space-between; gap: 0.5rem;">
          
          <div>
            <!-- Header section with thumbnail and buttons -->
            <div style="display: flex; gap: 0.75rem; align-items: flex-start;">
              ${getCategorySvg(item.config.category, item.config.subject)}
              <div style="flex: 1;">
                <div class="experiment-card-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.35rem;">
                  <strong style="color: var(--neon-cyan); font-family: var(--font-mono); font-size: 0.8rem;">${testVar}: ${item.value}</strong>
                  <span style="font-size: 0.6rem; font-family: var(--font-mono); padding: 0.15rem 0.35rem; border-radius: 3px; background: ${riskBg}; color: ${riskColor}; border: 1px solid ${riskColor}; font-weight: bold;">
                    RISK: ${risk}
                  </span>
                </div>
                <p class="experiment-card-text" style="font-family: var(--font-mono); font-size: 0.75rem; margin: 0.35rem 0; line-height: 1.3; color: var(--text-main); word-break: break-all;">${item.prompt}</p>
              </div>
            </div>

            <!-- Expected Mesh Behavior -->
            <div style="font-size: 0.7rem; color: var(--text-muted); line-height: 1.3; margin-top: 0.25rem; font-style: italic; background: rgba(255,255,255,0.02); padding: 0.35rem; border-radius: 4px; border-left: 2px solid var(--neon-cyan);">
              <strong>Expected Mesh:</strong> ${behavior}
            </div>
          </div>
          
          <div>
            <!-- ROI Sparkline allocation meter -->
            <div style="margin-bottom: 0.4rem;">
              <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--text-muted); font-family: var(--font-mono); margin-bottom: 0.15rem;">
                <span>Spend Sparkline (Struct / Func / Micro / Sil)</span>
                <span>${spend.structural}% / ${spend.functional}% / ${spend.micro}%</span>
              </div>
              <div style="display: flex; height: 5px; background: rgba(255,255,255,0.05); border-radius: 2px; overflow: hidden; width: 100%;">
                <div style="width: ${spend.structural}%; background: var(--neon-green); height: 100%;"></div>
                <div style="width: ${spend.functional}%; background: var(--neon-cyan); height: 100%;"></div>
                <div style="width: ${spend.micro}%; background: #ffe600; height: 100%;"></div>
                <div style="width: ${spend.silhouette}%; background: rgba(0, 128, 255, 0.5); height: 100%;"></div>
                <div style="width: ${spend.curvatureWaste}%; background: var(--neon-magenta); height: 100%;"></div>
              </div>
            </div>

            <!-- Intelligence Badges & Buttons row -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.25rem; gap: 0.5rem; flex-wrap: wrap;">
              <div style="display: flex; gap: 0.25rem; flex-wrap: wrap;">
                <span style="font-size: 0.6rem; padding: 0.1rem 0.3rem; border-radius: 2px; background: ${val.passedCount === 8 ? 'rgba(57,255,20,0.1)' : 'rgba(255,0,127,0.1)'}; color: ${val.passedCount === 8 ? 'var(--neon-green)' : 'var(--neon-magenta)'}; border: 1px solid ${val.passedCount === 8 ? 'rgba(57,255,20,0.3)' : 'rgba(255,0,127,0.3)'}; font-family: var(--font-mono);">
                  Gates: ${val.passedCount}/8
                </span>
                <span style="font-size: 0.6rem; padding: 0.1rem 0.3rem; border-radius: 2px; background: rgba(0, 240, 255, 0.1); color: var(--neon-cyan); border: 1px solid rgba(0, 240, 255, 0.3); font-family: var(--font-mono);">
                  ROI: ${audit.roiScore}%
                </span>
                <span style="font-size: 0.6rem; padding: 0.1rem 0.3rem; border-radius: 2px; background: rgba(255, 174, 0, 0.1); color: var(--neon-amber); border: 1px solid rgba(255, 174, 0, 0.3); font-family: var(--font-mono);">
                  Grade: ${grade}
                </span>
              </div>
              
              <div style="display: flex; gap: 0.2rem;">
                <button class="btn btn-secondary btn-exp-copy" data-prompt="${item.prompt}" style="font-size: 0.65rem; padding: 0.2rem 0.4rem; height: auto;">📋 Copy</button>
                <button class="btn btn-secondary btn-exp-fav" data-idx="${idx}" style="font-size: 0.65rem; padding: 0.2rem 0.4rem; height: auto;">⭐ Favorite</button>
                <button class="btn btn-primary btn-exp-apply" data-idx="${idx}" style="font-size: 0.65rem; padding: 0.2rem 0.4rem; height: auto;">🔧 Load</button>
              </div>
            </div>

            <!-- Warnings list -->
            ${val.warnings.length > 0 || isLowCapCurvatureRisk ? `
              <div style="margin-top: 0.4rem; border-top: 1px dashed rgba(255, 0, 127, 0.2); padding-top: 0.3rem;">
                <ul style="margin: 0; padding-left: 0.85rem; font-size: 0.65rem; color: var(--neon-magenta); line-height: 1.3;">
                  ${val.warnings.map(w => `<li>${w.message}</li>`).join("")}
                  ${isLowCapCurvatureRisk ? `<li>⚠️ Risk: Curvature detail will waste triangles at low cap (${item.config.triangleCap} tris).</li>` : ""}
                </ul>
              </div>
            ` : ""}
          </div>

        </div>
      `;
    }).join("");

    // Bind copy events
    grid.querySelectorAll(".btn-exp-copy").forEach(btn => {
      btn.addEventListener("click", () => {
        navigator.clipboard.writeText(btn.dataset.prompt);
        btn.textContent = "COPIED!";
        setTimeout(() => btn.textContent = "📋 Copy", 1000);
      });
    });

    // Bind apply/load events
    grid.querySelectorAll(".btn-exp-apply").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.idx, 10);
        const item = experiment.prompts[idx];
        if (onApplyConfig) {
          onApplyConfig(item.config, item.prompt);
          modal.style.display = "none";
        }
      });
    });

    // Bind favorite events
    grid.querySelectorAll(".btn-exp-fav").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.idx, 10);
        const item = experiment.prompts[idx];
        if (onToggleFavorite) {
          onToggleFavorite(item.config, item.prompt);
          btn.textContent = btn.textContent.includes("⭐") ? "★ Favorited" : "⭐ Favorite";
        }
      });
    });
  });

  // Export JSON Click Listener
  if (exportJsonBtn) {
    exportJsonBtn.addEventListener("click", () => {
      if (!lastGeneratedExperiment) {
        alert("Please generate a test set first.");
        return;
      }
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(lastGeneratedExperiment, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `experiment_test_set_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    });
  }
}
