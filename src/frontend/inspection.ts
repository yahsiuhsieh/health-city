import { mergeInspectionPages } from "../core/inspection-pages.ts";
import type { InspectionData } from "../core/inspection-pages.ts";

const form = document.getElementById("health-check") as HTMLFormElement;
const button = document.getElementById("run-check") as HTMLButtonElement;
const zone = document.getElementById("time-zone") as HTMLInputElement;
const status = document.getElementById("check-status")!;
if (!zone.value) zone.value = Intl.DateTimeFormat().resolvedOptions().timeZone;
form.addEventListener("submit", event => {
  if (form.getAttribute("aria-busy") === "true") { event.preventDefault(); return; }
  form.setAttribute("aria-busy", "true");
  button.disabled = true;
  button.textContent = "Checking Google Health…";
  status.textContent = "Checking eight data types. This can take up to about one minute.";
});
window.addEventListener("pageshow", () => {
  form.removeAttribute("aria-busy");
  button.disabled = false;
  button.textContent = "Run all read-only checks";
  status.textContent = "";
});

interface ContinuationState {
  key: string;
  title: string;
  date: string;
  zone: string;
  token: string;
  data: InspectionData;
}

const seed = document.getElementById("continuation-seed");
const resume = document.getElementById("continue-batch") as HTMLButtonElement | null;
if (seed && resume) {
  const states: ContinuationState[] = JSON.parse(seed.textContent!);
  const seen = new Set<string>();
  resume.addEventListener("click", async () => {
    resume.disabled = true;
    const report = document.getElementById("batch-progress")!;
    try {
      for (let page = 0; page < 10; page++) {
        const state = states.find(item => item.token);
        if (!state) break;
        const signature = state.key + ":" + state.token;
        if (seen.has(signature)) throw new Error("Repeated page token. The batch stopped.");
        const response = await fetch("/checks/health/run", {
          method: "POST", credentials: "same-origin",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ date: state.date, timeZone: state.zone, stream: state.key,
            pageToken: state.token, activity: page === 0 ? "true" : "false" }),
        });
        if (!response.ok || !response.headers.get("Content-Type")?.includes("application/json")) {
          throw new Error("The batch stopped. Check your session and Google authorization before retrying.");
        }
        const next = await response.json() as { nextPageToken: string; data: InspectionData };
        if (typeof next.nextPageToken !== "string" || next.nextPageToken === state.token) {
          throw new Error("Invalid continuation response.");
        }
        const data = mergeInspectionPages(state.key, state.data, next.data);
        seen.add(signature);
        state.data = data;
        state.token = next.nextPageToken;
        report.textContent = state.title + ": " + state.data.count + " records read.";
      }
    } catch (error) {
      report.textContent = (error instanceof Error ? error.message : "The batch stopped.") + " Previously read data remains in this page.";
    }
    for (const state of states) {
      const section = document.getElementById(state.key)!;
      const container = section.querySelector(".tables")!;
      container.replaceChildren();
      for (const data of state.data.tables) {
        const details = document.createElement("details");
        const summary = document.createElement("summary");
        summary.textContent = data.title + " (" + data.rows.length + " rows)";
        details.append(summary);
        const scroll = document.createElement("div");
        scroll.className = "scroll";
        const table = document.createElement("table");
        const caption = document.createElement("caption");
        caption.textContent = data.title;
        table.append(caption);
        const head = document.createElement("thead");
        const headings = document.createElement("tr");
        for (const name of data.columns) {
          const th = document.createElement("th");
          th.scope = "col";
          th.textContent = name;
          headings.append(th);
        }
        head.append(headings);
        table.append(head);
        const body = document.createElement("tbody");
        for (const row of data.rows) {
          const tr = document.createElement("tr");
          for (const cell of row) {
            const td = document.createElement("td");
            td.textContent = cell === null ? "Unavailable" : String(cell);
            tr.append(td);
          }
          body.append(tr);
        }
        table.append(body);
        scroll.append(table);
        details.append(scroll);
        container.append(details);
      }
      if (state.data.count) section.querySelector(".empty-result")?.remove();
      const summary = document.querySelector('a[href="#' + state.key + '"]')!.closest("tr")!;
      summary.cells[2]!.textContent = String(state.data.count);
      if (!state.token) {
        section.querySelector("strong")!.textContent = "complete";
        section.querySelector(".error")?.remove();
        summary.cells[1]!.textContent = "complete";
      }
    }
    const pending = states.some(item => item.token);
    resume.disabled = !pending;
    resume.textContent = pending ? "Continue next batch" : "All page sequences complete";
    if (!pending) report.textContent = "All page sequences complete.";
  });
}
