import { createNewResult } from '../project/projectSchema.js';
import { getActiveProject, updateActiveProject } from '../project/projectManager.js';

export function initResultUploader(onSuccess) {
  let modal = document.getElementById("uploaderModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "uploaderModal";
    modal.className = "modal-overlay";
    modal.style.display = "none";
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>📸 UPLOAD GENERATION RESULT</h3>
          <span class="modal-close" id="closeUploaderBtn">&times;</span>
        </div>
        <div class="modal-body">
          <input type="hidden" id="uploaderPromptId">
          
          <div class="form-group">
            <label for="uploaderFile">Asset Screenshot</label>
            <input type="file" id="uploaderFile" accept="image/*" style="display: none;">
            <div id="dropZone" class="uploader-drop-zone">
              <span class="drop-icon">📤</span>
              <p>Drag screenshot image here, or <span class="highlight-cyan">browse file</span></p>
              <img id="previewImage" class="uploader-preview-img" style="display: none;">
            </div>
          </div>

          <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label for="actualTrianglesInput">Actual Triangle Count</label>
              <input type="number" id="actualTrianglesInput" placeholder="e.g. 11250">
            </div>
            <div class="form-group">
              <label for="ratingScoreSelect">User Rating</label>
              <select id="ratingScoreSelect">
                <option value="5">5 Stars (Masterpiece)</option>
                <option value="4">4 Stars (Highly Compliant)</option>
                <option value="3" selected>3 Stars (Acceptable)</option>
                <option value="2">2 Stars (Faceted/Curved Waste)</option>
                <option value="1">1 Star (Failed Geometry)</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label for="resultNotesInput">Research Notes / Observations</label>
            <textarea id="resultNotesInput" style="height: 60px;" placeholder="Identify visual issues, curvature decay, or S-tier detailing success..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button id="submitResultBtn" class="btn btn-primary">Save Research Result</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  const closeBtn = document.getElementById("closeUploaderBtn");
  const submitBtn = document.getElementById("submitResultBtn");
  const fileInput = document.getElementById("uploaderFile");
  const dropZone = document.getElementById("dropZone");
  const previewImage = document.getElementById("previewImage");
  const promptIdInput = document.getElementById("uploaderPromptId");

  const actualTrianglesInput = document.getElementById("actualTrianglesInput");
  const ratingScoreSelect = document.getElementById("ratingScoreSelect");
  const resultNotesInput = document.getElementById("resultNotesInput");

  let base64Image = null;

  // Open file dialog on dropZone click
  dropZone.addEventListener("click", () => fileInput.click());

  // Handle file select
  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
  });

  // Handle Drag & Drop
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("drag-over");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  function handleFile(file) {
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      base64Image = e.target.result;
      previewImage.src = base64Image;
      previewImage.style.display = "block";
      dropZone.querySelector("p").style.display = "none";
      dropZone.querySelector(".drop-icon").style.display = "none";
    };
    reader.readAsDataURL(file);
  }

  // Close Modal
  closeBtn.addEventListener("click", () => {
    modal.style.display = "none";
    resetForm();
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
      resetForm();
    }
  });

  function resetForm() {
    promptIdInput.value = "";
    previewImage.src = "";
    previewImage.style.display = "none";
    dropZone.querySelector("p").style.display = "block";
    dropZone.querySelector(".drop-icon").style.display = "block";
    actualTrianglesInput.value = "";
    resultNotesInput.value = "";
    base64Image = null;
  }

  // Submit Result
  submitBtn.addEventListener("click", () => {
    const promptId = promptIdInput.value;
    const actualTris = parseInt(actualTrianglesInput.value) || null;
    const userScore = parseInt(ratingScoreSelect.value);
    const notes = resultNotesInput.value.trim();

    if (!promptId) return;

    const project = getActiveProject();
    const promptItem = project.prompts.find(p => p.id === promptId);
    if (!promptItem) return;

    const resultDetails = {
      type: "screenshot",
      screenshot: base64Image,
      actualTriangles: actualTris,
      userScore,
      notes
    };

    const newResult = createNewResult(promptId, promptItem.config, resultDetails);
    
    // Check if result already exists for this prompt and replace it or append
    const existingIdx = project.results.findIndex(r => r.promptId === promptId);
    if (existingIdx !== -1) {
      project.results[existingIdx] = newResult;
    } else {
      project.results.push(newResult);
    }

    updateActiveProject(project);
    modal.style.display = "none";
    resetForm();
    onSuccess(project);
  });
}
