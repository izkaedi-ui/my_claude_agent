import { createNewProject } from './projectSchema.js';

export function getProjectsList() {
  return JSON.parse(localStorage.getItem("tripoProjectsList") || "[]");
}

export function saveProjectsList(list) {
  localStorage.setItem("tripoProjectsList", JSON.stringify(list));
}

export function getActiveProjectId() {
  return localStorage.getItem("tripoActiveProjectId");
}

export function setActiveProjectId(id) {
  localStorage.setItem("tripoActiveProjectId", id);
}

export function getActiveProject() {
  const list = getProjectsList();
  const activeId = getActiveProjectId();
  let project = list.find(p => p.id === activeId);
  
  if (!project) {
    // If no project exists, initialize default
    project = createNewProject("Primary Tripo Research");
    list.push(project);
    saveProjectsList(list);
    setActiveProjectId(project.id);
  }
  return project;
}

export function updateActiveProject(project) {
  const list = getProjectsList();
  const idx = list.findIndex(p => p.id === project.id);
  
  project.updatedAt = new Date().toISOString();
  
  if (idx !== -1) {
    list[idx] = project;
  } else {
    list.push(project);
  }
  saveProjectsList(list);
}

export function createNewResearchProject(name) {
  const list = getProjectsList();
  const newProj = createNewProject(name);
  list.push(newProj);
  saveProjectsList(list);
  setActiveProjectId(newProj.id);
  return newProj;
}

export function deleteResearchProject(id) {
  let list = getProjectsList();
  list = list.filter(p => p.id !== id);
  saveProjectsList(list);

  // If deleted active project, select another one
  if (getActiveProjectId() === id) {
    if (list.length > 0) {
      setActiveProjectId(list[0].id);
    } else {
      localStorage.removeItem("tripoActiveProjectId");
    }
  }
}
