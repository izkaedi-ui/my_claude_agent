export function attachResultToPrompt(promptId, result) {
  return {
    id: "res_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    promptId,
    screenshot: result.screenshot || null,
    triangleCap: result.triangleCap || 5000,
    actualTriangles: result.actualTriangles || null,
    userScore: result.userScore || 3,
    silhouetteScore: result.silhouetteScore || 3,
    detailScore: result.detailScore || 3,
    topologyScore: result.topologyScore || 3,
    efficiencyScore: result.efficiencyScore || 3,
    notes: result.notes || "",
    createdAt: new Date().toISOString()
  };
}

export function computeAverageScores(results) {
  if (results.length === 0) return { user: 0, silhouette: 0, detail: 0, topology: 0 };

  const total = results.reduce((acc, r) => {
    acc.user += r.userScore;
    acc.silhouette += r.silhouetteScore || r.userScore;
    acc.detail += r.detailScore || r.userScore;
    acc.topology += r.topologyScore || r.userScore;
    return acc;
  }, { user: 0, silhouette: 0, detail: 0, topology: 0 });

  return {
    user: parseFloat((total.user / results.length).toFixed(1)),
    silhouette: parseFloat((total.silhouette / results.length).toFixed(1)),
    detail: parseFloat((total.detail / results.length).toFixed(1)),
    topology: parseFloat((total.topology / results.length).toFixed(1))
  };
}
