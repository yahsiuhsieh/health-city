import type { HealthInspection } from "./google-health.ts";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}
export const CHECK_CSS = `body{font:16px/1.5 system-ui,sans-serif;max-width:72rem;margin:2rem auto;padding:0 1rem;color:#203331;background:#f7f9f8}h1,h2{line-height:1.2}table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums}th,td{border-bottom:1px solid #cbd7d3;padding:.5rem;text-align:left;vertical-align:top}caption{text-align:left;font-weight:600;margin:.6rem 0}details{margin:1rem 0;padding:.8rem;background:white;border:1px solid #cbd7d3;border-radius:.4rem}summary{cursor:pointer;font-weight:600}.scroll{overflow:auto;max-height:26rem}label{display:block}input,button{font:inherit;padding:.5rem}form p{display:inline-block;margin-right:1rem}button{cursor:pointer}button:disabled{cursor:wait}.muted{color:#546b65}.error{border-left:4px solid #a33;padding:.5rem 1rem}a{color:#185d52}`;

export function healthCheckHtml(date = "", timeZone = "", result?: HealthInspection, message?: string): string {
  let outcome = "";
  if (result) {
    const summary = result.checks.map((check) => `<tr><td><a href="#${check.key}">${escapeHtml(check.title)}</a></td><td>${check.state}</td><td>${check.data?.count ?? "Unavailable"}</td></tr>`).join("");
    const sections = result.checks.map((check) => {
      const tables = check.data?.tables.map((table) => `<details><summary>${escapeHtml(table.title)} (${table.rows.length} rows)</summary><div class="scroll"><table><caption>${escapeHtml(table.title)}</caption><thead><tr>${table.columns.map((column) => `<th scope="col">${escapeHtml(column)}</th>`).join("")}</tr></thead><tbody>${table.rows.map((row) => `<tr>${row.map((cell) => `<td>${cell === null ? "Unavailable" : escapeHtml(String(cell))}</td>`).join("")}</tr>`).join("")}</tbody></table></div></details>`).join("") ?? "";
      return `<section id="${check.key}"><h2>${escapeHtml(check.title)}</h2><p>Status: <strong>${check.state}</strong></p>
${check.message ? `<p class="error">${escapeHtml(check.message)}</p>` : ''}
${check.data?.count === 0 ? '<p class="empty-result">No matching records returned within this bounded query. This does not establish missing source data.</p>' : ''}
${(check.data?.notes ?? []).map((note) => `<p class="muted">${escapeHtml(note)}</p>`).join("")}<div class="tables">${tables}</div></section>`;
    }).join("");
    outcome = `<h2>Results for ${escapeHtml(date)}</h2><p>Google Health account access passed for this request.</p>
<p>Intraday window: ${escapeHtml(result.window.start)} to ${escapeHtml(result.window.end)} (${escapeHtml(result.window.timeZone)}).</p>
<table><caption>Read-only check summary</caption><thead><tr><th scope="col">Data</th><th scope="col">Read status</th><th scope="col">Records</th></tr></thead><tbody>${summary}</tbody></table>
<p>A complete read means pagination finished. It does not establish sensor coverage or agreement with the source app.</p>${sections}`;
    const pending = result.checks.filter((check) => check.nextPageToken && check.data).map((check) => ({
      key: check.key, title: check.title, date, zone: timeZone, token: check.nextPageToken, data: check.data,
    }));
    if (pending.length) {
      outcome += `<div hidden id="continuation-seed">${escapeHtml(JSON.stringify(pending))}</div>
<p id="batch-progress" role="status">Some streams are incomplete. Each batch reads up to ten additional pages, with no automatic retries.</p>
<button id="continue-batch" type="button">Continue incomplete streams</button>`;
    }
  }
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Health data check</title>
<link rel="stylesheet" href="/checks/styles.css"><script type="module" src="/checks/form.js"></script>
<h1>Health data check</h1>
${message ? `<div class="error"><h2>Check failed</h2><p role="alert">${escapeHtml(message)}</p></div>` : ''}
<p>Check RHR, HRV, total calories, steps, heart rate, sleep, exercise, and heart rate zones in one manual run.</p>
<p>Use one source date and the appropriate IANA time zone. Daily RHR and HRV retain the source date.</p>
<p>HealthCity does not save these health records. Each run makes at most 26 Google requests, with no automatic retries.</p>
<form id="health-check" method="post" action="/checks/health/run"><p><label for="date">Source date</label><input id="date" name="date" type="date" min="0001-01-01" max="9998-12-31" value="${escapeHtml(date)}" required></p>
<p><label for="time-zone">Time zone for intraday records</label><input id="time-zone" name="timeZone" value="${escapeHtml(timeZone)}" placeholder="America/Chicago" maxlength="100" required></p><button id="run-check">Run all read-only checks</button><p id="check-status" role="status"></p></form>
<details><summary>Google authorization</summary><p>This check needs the activity, health metrics, and sleep read-only permissions.</p><form method="post" action="/auth/google/start"><input type="hidden" name="renew" value="true"><button>Renew Google authorization</button></form></details>
${outcome}<p><a href="/auth/status">Return to HealthCity</a></p></html>`;
}
