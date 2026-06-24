import { subjects } from '../data/subjects.js';

export const WIZARD_STEPS = [
  "Asset Type",
  "Triangle Budget",
  "Production Target",
  "Style",
  "Detail Priority",
  "Final Prompt"
];

export function inferCategoryAndSubject(input) {
  const cleanInput = input.toLowerCase();

  // Mapping of keywords to category and subject keys
  const mapping = [
    { keys: ["station", "orbit", "habitat", "ring station", "satellite"], cat: "SCIFI", subj: "Stations" },
    { keys: ["refinery", "refineries", "fuel depot", "distillation"], cat: "INDUSTRIAL", subj: "Refineries" },
    { keys: ["factory", "factories", "processing", "assembly hall"], cat: "INDUSTRIAL", subj: "Factories" },
    { keys: ["reactor", "cooling tower", "fusion", "fission", "generator core"], cat: "INDUSTRIAL", subj: "Reactors" },
    { keys: ["shipyard", "dock", "scaffold", "spacedock"], cat: "INDUSTRIAL", subj: "Shipyards" },
    { keys: ["carrier", "flight deck", "flagship"], cat: "SCIFI", subj: "Carriers" },
    { keys: ["dreadnought", "capital ship", "frigate", "cruiser", "battleship", "destroyer"], cat: "SCIFI", subj: "Capital_Ships" },
    { keys: ["mech", "robot", "walker", "reverse-joint", "gundam", "automaton"], cat: "CHARACTERS", subj: "Mechs" },
    { keys: ["armor", "helmet", "greaves", "knight", "spaulder", "breastplate", "suit", "exosuit"], cat: "CHARACTERS", subj: "Armor" },
    { keys: ["creature", "insectoid", "monster", "alien", "beast", "dinosaur", "spider", "wasp", "insect", "crab", "dragon", "leviathan"], cat: "CHARACTERS", subj: "Creatures" },
    { keys: ["humanoid", "cyborg", "body", "character", "soldier", "pilot", "npc"], cat: "CHARACTERS", subj: "Humanoids" },
    { keys: ["tank", "treaded", "combat vehicle", "panzer"], cat: "VEHICLES", subj: "Tanks" },
    { keys: ["aircraft", "jet", "plane", "supersonic", "fighter", "glider", "helicopter"], cat: "VEHICLES", subj: "Aircraft" },
    { keys: ["spacecraft", "drop-pod", "shuttle", "saucer", "rocket", "lander"], cat: "VEHICLES", subj: "Spacecraft" },
    { keys: ["naval", "destroyer", "warship", "hull", "submarine", "boat"], cat: "VEHICLES", subj: "Naval" }
  ];

  for (const item of mapping) {
    if (item.keys.some(k => cleanInput.includes(k))) {
      return { category: item.cat, subject: item.subj, matchedKeyword: item.keys.find(k => cleanInput.includes(k)) };
    }
  }

  // Smart fallback based on broader category matching
  if (cleanInput.includes("industrial") || cleanInput.includes("plant") || cleanInput.includes("heavy")) {
    return { category: "INDUSTRIAL", subject: "Refineries", matchedKeyword: "industrial fallback" };
  }
  if (cleanInput.includes("sci-fi") || cleanInput.includes("space") || cleanInput.includes("orbital")) {
    return { category: "SCIFI", subject: "Stations", matchedKeyword: "space fallback" };
  }
  if (cleanInput.includes("soldier") || cleanInput.includes("warrior") || cleanInput.includes("hero")) {
    return { category: "CHARACTERS", subject: "Humanoids", matchedKeyword: "character fallback" };
  }
  if (cleanInput.includes("weapon") || cleanInput.includes("gun") || cleanInput.includes("cannon") || cleanInput.includes("turret")) {
    return { category: "MILITARY", subject: "Defense_Platforms", matchedKeyword: "military fallback" };
  }
  if (cleanInput.includes("vehicle") || cleanInput.includes("car") || cleanInput.includes("truck")) {
    return { category: "VEHICLES", subject: "Tanks", matchedKeyword: "vehicle fallback" };
  }

  // Fallback
  return { category: "INDUSTRIAL", subject: "Refineries", matchedKeyword: "default fallback" };
}

export function recommendTriangleCap(subject, target = "game") {
  const cleanSubj = subject.toLowerCase();
  const cleanTarget = target.toLowerCase();

  const table = {
    refineries: { preview: 2000, game: 10000, hero: 20000 },
    reactors: { preview: 5000, game: 10000, hero: 20000 },
    carriers: { preview: 5000, game: 15000, hero: 20000 },
    mechs: { preview: 2000, game: 10000, hero: 20000 },
    stations: { preview: 10000, game: 20000, hero: 20000 },
    aircraft: { preview: 5000, game: 15000, hero: 20000 }
  };

  const key = Object.keys(table).find(k => cleanSubj.includes(k)) || "refineries";
  const targetLevel = cleanTarget.includes("print") || cleanTarget.includes("cinematic") || cleanTarget.includes("hero") ? "hero" : 
                      cleanTarget.includes("preview") || cleanTarget.includes("low") ? "preview" : "game";

  return table[key][targetLevel];
}

export function recommendTopology(input) {
  const cleanInput = input.toLowerCase();
  if (cleanInput.includes("cinematic") || cleanInput.includes("subdivision") || cleanInput.includes("high-poly")) {
    return "Cinematic_Assets";
  }
  if (cleanInput.includes("print") || cleanInput.includes("printable") || cleanInput.includes("manifold")) {
    return "Print_Assets";
  }
  if (cleanInput.includes("organic") || cleanInput.includes("creature") || cleanInput.includes("humanoid") || cleanInput.includes("muscle") || cleanInput.includes("skin") || cleanInput.includes("flesh")) {
    return "Organic";
  }
  if (cleanInput.includes("game") || cleanInput.includes("retopo") || cleanInput.includes("low-poly") || cleanInput.includes("game-ready")) {
    return "Game_Assets";
  }
  return "SmartMesh";
}

export function runWizard(input) {
  const reasoning = [];
  const inferred = inferCategoryAndSubject(input);
  
  reasoning.push(`Subject Inferred: <strong>${inferred.subject}</strong> (matched keyword: "${inferred.matchedKeyword}")`);

  // Try explicit triangle cap extraction
  let cap = null;
  const numMatch = input.match(/(\d+)\s*(?:k|thousand|tris|triangles|polygon|t)/i);
  if (numMatch) {
    let parsedNum = parseInt(numMatch[1], 10);
    // Handle '15k' vs '15000'
    if (parsedNum < 100) {
      parsedNum = parsedNum * 1000;
    }
    // Snap to closest valid cap rules or keep raw
    cap = parsedNum;
    reasoning.push(`Explicit Cap Inferred: <strong>${cap.toLocaleString()} Triangles</strong>`);
  }

  let target = "game";
  if (input.toLowerCase().includes("cinematic") || input.toLowerCase().includes("hero") || input.toLowerCase().includes("high-poly")) {
    target = "hero";
    reasoning.push(`Target Production Grade: <strong>Hero/Cinematic Asset</strong>`);
  } else if (input.toLowerCase().includes("preview") || input.toLowerCase().includes("low") || input.toLowerCase().includes("low-poly")) {
    target = "preview";
    reasoning.push(`Target Production Grade: <strong>Fast Preview / Low-Poly</strong>`);
  } else {
    reasoning.push(`Target Production Grade: <strong>PBR / Real-Time Game Asset</strong>`);
  }

  if (cap === null) {
    cap = recommendTriangleCap(inferred.subject, target);
    reasoning.push(`Recommended Cap Snapped to: <strong>${cap.toLocaleString()} Triangles</strong> (based on target grade and subject bounds)`);
  }

  const topology = recommendTopology(input);
  reasoning.push(`Topology Optimization: <strong>${topology} Mode</strong> inferred from structural cues.`);

  // Style inference
  let style = "industrial";
  const styles = ["industrial", "brutalist", "cyberpunk", "gothic", "militarized", "fantasy", "sci-fi", "utopian", "rugged", "realistic", "retro-futuristic"];
  for (const s of styles) {
    if (input.toLowerCase().includes(s)) {
      style = s;
      reasoning.push(`Visual Style Theme: <strong>${style}</strong> detected.`);
      break;
    }
  }
  if (style === "industrial" && !input.toLowerCase().includes("industrial")) {
    // Default fallback
    reasoning.push(`Visual Style Theme: <strong>${style}</strong> (default fallback).`);
  }

  // Material suggestion
  let materialIdx = 0;
  const materials = ["steel", "alloy", "titanium", "ceramic", "carbon", "iron", "carapace", "obsidian", "concrete", "stone", "chitinous"];
  for (let i = 0; i < materials.length; i++) {
    if (input.toLowerCase().includes(materials[i])) {
      materialIdx = i % 3; // select index mapping
      reasoning.push(`Material Hint Detected: <strong>${materials[i]}</strong> (using index ${materialIdx})`);
      break;
    }
  }

  return {
    category: inferred.category,
    subject: inferred.subject,
    triangleCap: cap,
    topologyMode: topology,
    detailDensity: target === "hero" ? 95 : target === "preview" ? 35 : 75,
    style,
    productionTarget: target === "hero" ? "Cinematic" : target === "preview" ? "Game" : "PBR",
    silhouetteIdx: 0,
    materialIdx: materialIdx,
    reasoning
  };
}

export function explainExpectedMeshBehavior(config) {
  const subj = (config.subject || "").toLowerCase();
  const cat = (config.category || "").toLowerCase();
  
  if (subj.includes("refinery") || subj.includes("factories") || subj.includes("reactor")) {
    return "Triangles convert into towers, tanks, pipes, gantries — high visual ROI.";
  }
  if (subj.includes("station") || subj.includes("ring") || subj.includes("habitat")) {
    return "Curvature consumes budget; needs docking modules to avoid smooth ring waste.";
  }
  if (cat.includes("creature") || subj.includes("creature")) {
    return "Organic topology should prioritize head, joints, spine, claws, skin systems.";
  }
  if (cat.includes("character") || subj.includes("humanoid") || subj.includes("armor") || subj.includes("mech")) {
    return "Best results come from silhouette, armor segmentation, joints, helmet geometry.";
  }
  return "Prompt should prioritize silhouette, topology, structural anchors, functional systems.";
}

export function calculatePromptRisk(config, prompt) {
  let risk = 0;
  const cleanPrompt = prompt.toLowerCase();
  
  if (config.triangleCap < 10000 && /ring|sphere|smooth aircraft|aircraft|flying/i.test(cleanPrompt)) risk += 40;
  if (/detailed|intricate|complex|beautiful/i.test(cleanPrompt)) risk += 25;
  if ((/organic manifold mesh|organic/i.test(cleanPrompt) || config.subject === "Creatures" || config.subject === "Humanoids") && /hard-surface topology|hard-surface/i.test(cleanPrompt)) risk += 50;
  if (/game-ready/i.test(cleanPrompt) && /print-ready/i.test(cleanPrompt)) risk += 40;

  return risk >= 60 ? "HIGH" : risk >= 30 ? "MED" : "LOW";
}
