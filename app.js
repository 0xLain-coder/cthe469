// Offline-first schedule rendering, daily logging, analytics, and backup handling.
(() => {
  "use strict";

  const CONFIG = window.FOM_SCHEDULE_CONFIG;
  const STORAGE_KEY = "fom-daily-schedule-v2.1";
  const STATE_VERSION = 1;
  const SVG_NS = "http://www.w3.org/2000/svg";
  const modeById = new Map(CONFIG.modes.map((mode) => [mode.id, mode]));
  const errorCodeById = new Map(CONFIG.errorCodes.map((item) => [item.code, item]));

  const elements = {
    date: document.getElementById("today-date"),
    modeSelect: document.getElementById("day-mode"),
    modeChip: document.getElementById("today-mode-chip"),
    modeGuidance: document.getElementById("mode-guidance"),
    currentBlockName: document.getElementById("current-block-name"),
    currentBlockTime: document.getElementById("current-block-time"),
    nextBlockName: document.getElementById("next-block-name"),
    nextBlockTime: document.getElementById("next-block-time"),
    progressCount: document.getElementById("day-progress-count"),
    progress: document.getElementById("day-progress"),
    progressDetail: document.getElementById("day-progress-detail"),
    burnout: document.getElementById("burnout-status"),
    burnoutName: document.getElementById("burnout-zone-name"),
    burnoutDetail: document.getElementById("burnout-zone-detail"),
    templateName: document.getElementById("template-name"),
    templateSummary: document.getElementById("template-summary"),
    modePlanTitle: document.getElementById("mode-plan-title"),
    modePlanTarget: document.getElementById("mode-plan-target"),
    modePlanSummary: document.getElementById("mode-plan-summary"),
    modePlanInstructions: document.getElementById("mode-plan-instructions"),
    scheduleList: document.getElementById("schedule-list"),
    weeklyHitMiss: document.getElementById("weekly-hit-miss-body"),
    errorCodes: document.getElementById("top-error-codes-body"),
    moduleProgress: document.getElementById("module-progress-list"),
    energyChart: document.getElementById("energy-chart"),
    sleepinessChart: document.getElementById("sleepiness-chart"),
    backupFeedback: document.getElementById("backup-feedback"),
    importInput: document.getElementById("import-backup"),
    exportButton: document.getElementById("export-backup"),
  };

  let state = createEmptyState();
  let persistenceAvailable = true;
  let readOnlyAfterStorageError = false;
  let renderedDateKey = "";

  function createEmptyState() {
    return {
      schemaVersion: STATE_VERSION,
      logs: {},
      weeklyReviews: {},
      modules: [],
    };
  }

  function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function isDateKey(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T12:00:00`);
    return !Number.isNaN(date.valueOf()) && localDateKey(date) === value;
  }

  function getTemplateForDate(dateKey) {
    const date = new Date(`${dateKey}T12:00:00`);
    return CONFIG.templateForDay(date.getDay());
  }

  function emptyRecord(dateKey) {
    const template = getTemplateForDate(dateKey);
    return {
      templateId: template.id,
      dayMode: "",
      blocks: {},
      scores: Object.fromEntries(CONFIG.scoreFields.map(({ id }) => [id, null])),
      sleepiness: Object.fromEntries(CONFIG.sleepinessCheckpoints.map((time) => [time, null])),
      fom4: { flagged: null, corrected: null, doubtLog: null },
      errorCodes: [],
      shutdownResult: null,
      unfinishedItems: "",
      hardestMinutes: "",
    };
  }

  function recordFor(dateKey = localDateKey()) {
    return state.logs[dateKey] ?? emptyRecord(dateKey);
  }

  function getTodayTemplate() {
    return getTemplateForDate(localDateKey());
  }

  function getActiveModePlan() {
    const record = recordFor();
    const template = getTodayTemplate();
    return record.dayMode
      ? CONFIG.modePlans[record.dayMode]?.[template.id] ?? null
      : null;
  }

  function getModeBlock(block) {
    const override = getActiveModePlan()?.overrides[block.id];
    return override ? { ...block, ...override } : block;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function showFeedback(message, isError = false) {
    elements.backupFeedback.textContent = message;
    elements.backupFeedback.dataset.state = isError ? "error" : "success";
  }

  function loadState() {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === null) return;
      state = validateData(JSON.parse(saved));
    } catch (error) {
      persistenceAvailable = false;
      readOnlyAfterStorageError = true;
      showFeedback(
        `Saved records could not be loaded (${error.message}). Changes will remain only in memory until you export a backup.`,
        true,
      );
    }
  }

  function persistState() {
    if (!persistenceAvailable || readOnlyAfterStorageError) return false;
    try {
      state.schemaVersion = STATE_VERSION;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      persistenceAvailable = false;
      readOnlyAfterStorageError = true;
      showFeedback(
        `Automatic saving failed (${error.message}). Changes remain in memory; export a backup before leaving this page.`,
        true,
      );
      return false;
    }
  }

  function validateScore(value, label) {
    if (value === null) return null;
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      throw new TypeError(`${label} must be a whole number from 1 to 5 or null.`);
    }
    return value;
  }

  function validateCount(value, label) {
    if (value === null) return null;
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new TypeError(`${label} must be a non-negative whole number or null.`);
    }
    return value;
  }

  function validateData(candidate) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      throw new TypeError("Backup data must be an object.");
    }
    if (candidate.schemaVersion !== STATE_VERSION) {
      throw new TypeError(`Unsupported data version: ${candidate.schemaVersion ?? "missing"}.`);
    }
    if (!candidate.logs || typeof candidate.logs !== "object" || Array.isArray(candidate.logs)) {
      throw new TypeError("Daily logs are missing or invalid.");
    }
    if (
      !candidate.weeklyReviews ||
      typeof candidate.weeklyReviews !== "object" ||
      Array.isArray(candidate.weeklyReviews)
    ) {
      throw new TypeError("Weekly reviews are missing or invalid.");
    }
    if (!Array.isArray(candidate.modules)) {
      throw new TypeError("Module progress must be a list.");
    }

    const validated = createEmptyState();
    for (const [dateKey, rawRecord] of Object.entries(candidate.logs)) {
      if (!isDateKey(dateKey)) throw new TypeError(`Invalid daily log date: ${dateKey}.`);
      if (!rawRecord || typeof rawRecord !== "object" || Array.isArray(rawRecord)) {
        throw new TypeError(`Daily log ${dateKey} is invalid.`);
      }
      const expectedTemplate = getTemplateForDate(dateKey);
      if (rawRecord.templateId !== expectedTemplate.id) {
        throw new TypeError(`Daily log ${dateKey} does not match its fixed schedule template.`);
      }
      if (rawRecord.dayMode !== "" && !modeById.has(rawRecord.dayMode)) {
        throw new TypeError(`Daily log ${dateKey} has an unknown day mode.`);
      }
      if (!rawRecord.blocks || typeof rawRecord.blocks !== "object" || Array.isArray(rawRecord.blocks)) {
        throw new TypeError(`Block records for ${dateKey} are invalid.`);
      }

      const blocks = {};
      for (const [blockId, rawBlock] of Object.entries(rawRecord.blocks)) {
        if (
          !expectedTemplate.blocks.some((block) => block.id === blockId) ||
          !rawBlock ||
          typeof rawBlock !== "object" ||
          Array.isArray(rawBlock)
        ) {
          throw new TypeError(`Block ${blockId} in ${dateKey} is invalid.`);
        }
        if (typeof rawBlock.done !== "boolean") {
          throw new TypeError(`Completion status for ${blockId} in ${dateKey} is invalid.`);
        }
        const milestoneDraft = rawBlock.milestoneDraft ?? "";
        if (typeof milestoneDraft !== "string") {
          throw new TypeError(`Milestone draft for ${blockId} in ${dateKey} is invalid.`);
        }
        blocks[blockId] = { done: rawBlock.done, milestoneDraft };
      }

      if (!rawRecord.scores || typeof rawRecord.scores !== "object") {
        throw new TypeError(`Daily scores for ${dateKey} are invalid.`);
      }
      const scores = {};
      for (const { id, label } of CONFIG.scoreFields) {
        scores[id] = validateScore(rawRecord.scores[id] ?? null, `${label} on ${dateKey}`);
      }

      if (!rawRecord.sleepiness || typeof rawRecord.sleepiness !== "object") {
        throw new TypeError(`Sleepiness scores for ${dateKey} are invalid.`);
      }
      const sleepiness = {};
      for (const time of CONFIG.sleepinessCheckpoints) {
        sleepiness[time] = validateScore(rawRecord.sleepiness[time] ?? null, `Sleepiness at ${time} on ${dateKey}`);
      }

      const rawFom4 = rawRecord.fom4;
      if (!rawFom4 || typeof rawFom4 !== "object") {
        throw new TypeError(`FOM-4 tally for ${dateKey} is invalid.`);
      }
      const fom4 = {
        flagged: validateCount(rawFom4.flagged ?? null, `Flagged count on ${dateKey}`),
        corrected: validateCount(rawFom4.corrected ?? null, `Corrected count on ${dateKey}`),
        doubtLog: validateCount(rawFom4.doubtLog ?? null, `Doubt log count on ${dateKey}`),
      };

      if (!Array.isArray(rawRecord.errorCodes) || rawRecord.errorCodes.some((code) => !errorCodeById.has(code))) {
        throw new TypeError(`Error codes for ${dateKey} are invalid.`);
      }
      if (
        rawRecord.shutdownResult !== null &&
        rawRecord.shutdownResult !== "hit" &&
        rawRecord.shutdownResult !== "miss"
      ) {
        throw new TypeError(`Shutdown result for ${dateKey} is invalid.`);
      }
      if (typeof rawRecord.unfinishedItems !== "string" || typeof rawRecord.hardestMinutes !== "string") {
        throw new TypeError(`Shutdown notes for ${dateKey} are invalid.`);
      }
      validated.logs[dateKey] = {
        templateId: expectedTemplate.id,
        dayMode: rawRecord.dayMode,
        blocks,
        scores,
        sleepiness,
        fom4,
        errorCodes: [...new Set(rawRecord.errorCodes)],
        shutdownResult: rawRecord.shutdownResult,
        unfinishedItems: rawRecord.unfinishedItems,
        hardestMinutes: rawRecord.hardestMinutes,
      };
    }

    for (const [weekKey, review] of Object.entries(candidate.weeklyReviews)) {
      if (!isDateKey(weekKey) || !review || typeof review !== "object" || Array.isArray(review)) {
        throw new TypeError(`Weekly review ${weekKey} is invalid.`);
      }
      const fields = ["energyDashboard", "reviewNotes", "nextWeekPlan", "helperSync"];
      const normalizedReview = {};
      for (const field of fields) {
        if (typeof review[field] !== "string") {
          throw new TypeError(`Weekly review field ${field} for ${weekKey} is invalid.`);
        }
        normalizedReview[field] = review[field];
      }
      validated.weeklyReviews[weekKey] = normalizedReview;
    }

    const moduleIds = new Set();
    validated.modules = candidate.modules.map((item) => {
      if (
        !item ||
        typeof item !== "object" ||
        typeof item.id !== "string" ||
        item.id.length === 0 ||
        item.id.length > 100 ||
        moduleIds.has(item.id) ||
        typeof item.name !== "string" ||
        item.name.trim().length === 0 ||
        item.name.length > 100 ||
        !Number.isInteger(item.progress) ||
        item.progress < 0 ||
        item.progress > 100
      ) {
        throw new TypeError("A module entry has an invalid ID, name, or completion percentage.");
      }
      moduleIds.add(item.id);
      return { id: item.id, name: item.name, progress: item.progress };
    });
    return validated;
  }

  function mutateToday(mutator, refresh = false) {
    const dateKey = localDateKey();
    const record = recordFor(dateKey);
    mutator(record);
    state.logs[dateKey] = record;
    persistState();
    if (refresh) refreshDerived();
    return true;
  }

  function setDateHeading() {
    const now = new Date();
    elements.date.dateTime = now.toISOString();
    elements.date.textContent = new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(now);
  }

  function updateModeView(record) {
    const mode = modeById.get(record.dayMode);
    elements.modeSelect.value = mode ? mode.id : "";
    elements.modeChip.textContent = mode ? mode.label.toUpperCase() : "MODE NOT SET";
    elements.modeGuidance.textContent = mode
      ? mode.description
      : "Your selected mode will be saved with today’s log.";
  }

  function minutesOfDay(value) {
    const [hours, minutes] = value.split(":").map(Number);
    return hours * 60 + minutes;
  }

  function isBlockActive(block, nowMinutes) {
    const start = minutesOfDay(block.start);
    const end = minutesOfDay(block.end);
    return end <= start ? nowMinutes >= start || nowMinutes < end : nowMinutes >= start && nowMinutes < end;
  }

  function formatBlockTime(block) {
    return `${block.start}–${block.end}`;
  }

  function getCurrentAndNextBlock(now = new Date()) {
    const todayTemplate = CONFIG.templateForDay(now.getDay());
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const currentIndex = todayTemplate.blocks.findIndex((block) => isBlockActive(block, nowMinutes));
    if (currentIndex >= 0) {
      const current = getModeBlock(todayTemplate.blocks[currentIndex]);
      const next = currentIndex < todayTemplate.blocks.length - 1
        ? todayTemplate.blocks[currentIndex + 1]
        : CONFIG.templateForDay((now.getDay() + 1) % 7).blocks[0];
      return { current, next: getModeBlock(next) };
    }

    const next = todayTemplate.blocks.find((block) => minutesOfDay(block.start) > nowMinutes);
    if (next) return { current: null, next: getModeBlock(next) };
    return {
      current: null,
      next: CONFIG.templateForDay((now.getDay() + 1) % 7).blocks[0],
    };
  }

  function updateNowNext() {
    const { current, next } = getCurrentAndNextBlock();
    elements.currentBlockName.textContent = current ? current.title : "No active block";
    elements.currentBlockTime.textContent = current
      ? formatBlockTime(current)
      : "Between fixed schedule blocks";
    elements.nextBlockName.textContent = next ? next.title : "No upcoming block";
    elements.nextBlockTime.textContent = next ? formatBlockTime(next) : "—";
    updateCurrentBlockHighlight();
  }

  function blockProgressPercent(block, now) {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const start = minutesOfDay(block.start);
    const end = minutesOfDay(block.end);
    const duration = end <= start ? 1440 - start + end : end - start;
    const elapsed = end <= start && nowMinutes < end
      ? 1440 - start + nowMinutes
      : nowMinutes - start;
    return Math.max(0, Math.min(100, Math.floor((elapsed / duration) * 100)));
  }

  function updateCurrentBlockHighlight(now = new Date()) {
    const template = CONFIG.templateForDay(now.getDay());
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const currentBlock = template.blocks.find((block) => isBlockActive(block, nowMinutes));
    elements.scheduleList.querySelectorAll("[data-block-card]").forEach((card) => {
      const active = card.dataset.blockCard === currentBlock?.id;
      card.classList.toggle("is-current", active);
      if (active) card.setAttribute("aria-current", "time");
      else card.removeAttribute("aria-current");
      const progressFill = card.querySelector("[data-current-progress]");
      if (progressFill && active) {
        progressFill.style.width = `${blockProgressPercent(currentBlock, now)}%`;
      }
    });
  }

  function renderSchedule() {
    const template = getTodayTemplate();
    const record = recordFor();
    renderModePlan(template);
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    elements.templateName.textContent = `${template.label.toUpperCase()} TEMPLATE`;
    elements.templateSummary.textContent = template.summary;

    elements.scheduleList.innerHTML = template.blocks.map((baseBlock) => {
      const block = getModeBlock(baseBlock);
      const saved = record.blocks[block.id] ?? { done: false, milestoneDraft: "" };
      const current = isBlockActive(baseBlock, nowMinutes);
      const cardClasses = ["schedule-card"];
      if (current) cardClasses.push("is-current");
      if (saved.done) cardClasses.push("is-complete");
      const milestone = block.milestone
        ? `<input class="milestone-draft" type="text" data-milestone="${escapeHtml(block.id)}" aria-label="Milestone draft for ${escapeHtml(block.title)}; finalize on paper" placeholder="Milestone draft · finalize on paper" value="${escapeHtml(saved.milestoneDraft)}">`
        : "";
      return `
        <article class="${cardClasses.join(" ")}" data-block-card="${escapeHtml(block.id)}"${current ? ' aria-current="time"' : ""}>
          <div class="schedule-time-cell">
            <time class="schedule-time">${escapeHtml(formatBlockTime(baseBlock))}</time>
            <span class="current-time-marker" aria-hidden="true">NOW</span>
            <span class="current-time-track" aria-hidden="true"><span data-current-progress></span></span>
          </div>
          <div class="schedule-block-title">${escapeHtml(block.title)}${block.milestone ? "<small>Draft here · finalize on paper</small>" : ""}</div>
          <span class="category-tag">${escapeHtml(block.category)}</span>
          <p class="schedule-description">${escapeHtml(block.detail)}</p>
          <label class="block-check">
            <input type="checkbox" data-block-done="${escapeHtml(block.id)}" ${saved.done ? "checked" : ""}>
            Done
          </label>
          ${milestone}
        </article>`;
    }).join("");
    updateProgress();
    updateNowNext();
  }

  function renderModePlan(template = getTodayTemplate()) {
    const mode = modeById.get(recordFor().dayMode);
    const plan = getActiveModePlan();
    if (!mode || !plan) {
      elements.modePlanTitle.textContent = "Choose a day mode";
      elements.modePlanTarget.textContent = "The schedule is shown at its fixed times.";
      elements.modePlanSummary.textContent = "Select a mode above to show its specific plan in the schedule below.";
      elements.modePlanInstructions.innerHTML =
        "<li>Changing modes updates the plan and block guidance without changing fixed times.</li>";
      return;
    }

    elements.modePlanTitle.textContent = `${mode.label} · ${template.label} plan`;
    elements.modePlanTarget.textContent = plan.studyTarget;
    elements.modePlanSummary.textContent = plan.summary;
    elements.modePlanInstructions.innerHTML = plan.instructions
      .map((instruction) => `<li>${escapeHtml(instruction)}</li>`)
      .join("");
  }

  function updateProgress() {
    const template = getTodayTemplate();
    const record = recordFor();
    const completed = template.blocks.filter((block) => record.blocks[block.id]?.done).length;
    const percentage = template.blocks.length ? Math.round((completed / template.blocks.length) * 100) : 0;
    elements.progressCount.textContent = `${completed} / ${template.blocks.length}`;
    elements.progress.value = percentage;
    elements.progressDetail.textContent = `${percentage}% of fixed schedule blocks marked done.`;
  }

  function setInputValue(selector, value) {
    const input = document.querySelector(selector);
    if (input) input.value = value ?? "";
  }

  function renderDailyLog() {
    const record = recordFor();
    updateModeView(record);
    for (const { id } of CONFIG.scoreFields) {
      setInputValue(`[data-score="${id}"]`, record.scores[id]);
    }
    for (const time of CONFIG.sleepinessCheckpoints) {
      setInputValue(`[data-sleepiness="${time}"]`, record.sleepiness[time]);
    }
    setInputValue("#fom4-flagged", record.fom4.flagged);
    setInputValue("#fom4-corrected", record.fom4.corrected);
    setInputValue("#fom4-doubt-log", record.fom4.doubtLog);
    setInputValue("#unfinished-items", record.unfinishedItems);
    setInputValue("#hardest-minutes", record.hardestMinutes);
    document.querySelectorAll('input[name="errorCodes"]').forEach((input) => {
      input.checked = record.errorCodes.includes(input.value);
    });
    document.querySelectorAll("[data-shutdown-result]").forEach((button) => {
      button.setAttribute("aria-pressed", String(record.shutdownResult === button.dataset.shutdownResult));
    });
    updateBurnoutIndicator();
  }

  function currentWeekStart(date = new Date()) {
    const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const offset = (monday.getDay() + 6) % 7;
    monday.setDate(monday.getDate() - offset);
    return localDateKey(monday);
  }

  function updateBurnoutIndicator() {
    const record = recordFor();
    const values = CONFIG.scoreFields.map(({ id }) => record.scores[id]);
    const scoresComplete = values.every((value) => Number.isInteger(value));
    if (!scoresComplete) {
      elements.burnout.dataset.zone = "unrated";
      elements.burnoutName.textContent = "Awaiting daily scores";
      elements.burnoutDetail.textContent = "Complete all five daily scores to view the capacity indicator.";
      return;
    }

    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const sleepinessValues = CONFIG.sleepinessCheckpoints
      .map((time) => record.sleepiness[time])
      .filter(Number.isInteger);
    const averageSleepiness = sleepinessValues.length
      ? sleepinessValues.reduce((sum, value) => sum + value, 0) / sleepinessValues.length
      : null;
    let mode;
    if (mean < 2) mode = modeById.get("essential-plan");
    else if (mean < 3 || values.some((value) => value === 1)) mode = modeById.get("recovery-plan");
    else if (mean < 4 || (averageSleepiness !== null && averageSleepiness >= 4)) {
      mode = modeById.get("modified-load");
    } else mode = modeById.get("full-capacity");

    elements.burnout.dataset.zone = mode.id;
    elements.burnoutName.textContent = mode.label;
    elements.burnoutDetail.textContent = `Based on the five-score average (${mean.toFixed(1)} / 5)${averageSleepiness === null ? "" : ` and sleepiness average (${averageSleepiness.toFixed(1)} / 5)`}. Use this as a check-in aid, not a diagnosis.`;
  }

  function fillRecordFromInputs() {
    return mutateToday((record) => {
      for (const { id } of CONFIG.scoreFields) {
        const value = document.querySelector(`[data-score="${id}"]`).value;
        record.scores[id] = value === "" ? null : Number(value);
      }
      for (const time of CONFIG.sleepinessCheckpoints) {
        const value = document.querySelector(`[data-sleepiness="${time}"]`).value;
        record.sleepiness[time] = value === "" ? null : Number(value);
      }
    }, true);
  }

  function renderTrendChart(svg, values, series) {
    const width = 640;
    const height = 220;
    const margin = { top: 14, right: 12, bottom: 28, left: 34 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const today = new Date();
    const days = [];
    for (let offset = 13; offset >= 0; offset -= 1) {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
      days.push({ key: localDateKey(date), date });
    }
    svg.replaceChildren();
    svg.dataset.series = series;

    const addLine = (x1, y1, x2, y2, className) => {
      const line = document.createElementNS(SVG_NS, "line");
      line.setAttribute("x1", String(x1));
      line.setAttribute("y1", String(y1));
      line.setAttribute("x2", String(x2));
      line.setAttribute("y2", String(y2));
      line.setAttribute("class", className);
      svg.append(line);
    };
    const addText = (x, y, text, className, anchor = "middle") => {
      const node = document.createElementNS(SVG_NS, "text");
      node.setAttribute("x", String(x));
      node.setAttribute("y", String(y));
      node.setAttribute("class", className);
      node.setAttribute("text-anchor", anchor);
      node.textContent = text;
      svg.append(node);
    };

    for (let score = 1; score <= 5; score += 1) {
      const y = margin.top + ((5 - score) / 4) * plotHeight;
      addLine(margin.left, y, width - margin.right, y, "chart-grid-line");
      addText(margin.left - 10, y + 3, String(score), "chart-axis-label", "end");
    }

    const points = days.map((day, index) => {
      const x = margin.left + (index / (days.length - 1)) * plotWidth;
      const value = values(day.key);
      return {
        x,
        y: Number.isFinite(value) ? margin.top + ((5 - value) / 4) * plotHeight : null,
        value,
        date: day.date,
      };
    });

    if (!points.some((point) => point.y !== null)) {
      addText(width / 2, height / 2 + 3, "No observations recorded yet", "chart-axis-label");
      return;
    }

    let pathData = "";
    let segmentOpen = false;
    for (const point of points) {
      if (point.y === null) {
        segmentOpen = false;
      } else {
        pathData += `${segmentOpen ? "L" : "M"}${point.x},${point.y} `;
        segmentOpen = true;
      }
    }
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", pathData.trim());
    path.setAttribute("class", "chart-line");
    svg.append(path);

    points.forEach((point) => {
      if (point.y === null) return;
      const circle = document.createElementNS(SVG_NS, "circle");
      circle.setAttribute("cx", String(point.x));
      circle.setAttribute("cy", String(point.y));
      circle.setAttribute("r", "3.5");
      circle.setAttribute("class", "chart-point");
      circle.setAttribute("aria-label", `${localDateKey(point.date)}: ${point.value}`);
      svg.append(circle);
    });

    [0, 3, 6, 9, 13].forEach((index) => {
      const point = points[index];
      const label = `${String(point.date.getMonth() + 1).padStart(2, "0")}/${String(point.date.getDate()).padStart(2, "0")}`;
      addText(point.x, height - 7, label, "chart-axis-label");
    });
  }

  function averageSleepinessFor(record) {
    const values = CONFIG.sleepinessCheckpoints
      .map((time) => record.sleepiness[time])
      .filter(Number.isInteger);
    return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 10) / 10 : null;
  }

  function renderWeeklyHitMiss() {
    const weeks = new Map();
    for (const [dateKey, record] of Object.entries(state.logs)) {
      if (!record.shutdownResult) continue;
      const week = currentWeekStart(new Date(`${dateKey}T12:00:00`));
      const counts = weeks.get(week) ?? { hit: 0, miss: 0 };
      counts[record.shutdownResult] += 1;
      weeks.set(week, counts);
    }
    const rows = [...weeks.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 8)
      .map(([week, counts]) => {
        const total = counts.hit + counts.miss;
        const rate = total ? `${Math.round((counts.hit / total) * 100)}%` : "—";
        return `<tr><td>${escapeHtml(week)}</td><td>${counts.hit}</td><td>${counts.miss}</td><td>${rate}</td></tr>`;
      });
    elements.weeklyHitMiss.innerHTML = rows.length
      ? rows.join("")
      : '<tr><td colspan="4" class="table-empty">Weekly results will appear as you log them.</td></tr>';
  }

  function renderTopErrors() {
    const counts = new Map(CONFIG.errorCodes.map(({ code }) => [code, 0]));
    for (const record of Object.values(state.logs)) {
      for (const code of record.errorCodes) counts.set(code, counts.get(code) + 1);
    }
    const rows = [...counts.entries()]
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 7)
      .map(([code, count]) => `<tr><td>${code}</td><td>${escapeHtml(errorCodeById.get(code).label)}</td><td>${count}</td></tr>`);
    elements.errorCodes.innerHTML = rows.length
      ? rows.join("")
      : '<tr><td colspan="3" class="table-empty">Error patterns will appear as you log them.</td></tr>';
  }

  function renderCharts() {
    const recordsByDay = state.logs;
    renderTrendChart(elements.energyChart, (dateKey) => {
      const value = recordsByDay[dateKey]?.scores.energy;
      return Number.isInteger(value) ? value : null;
    }, "energy");
    renderTrendChart(elements.sleepinessChart, (dateKey) => {
      const record = recordsByDay[dateKey];
      return record ? averageSleepinessFor(record) : null;
    }, "sleepiness");
  }

  function renderAnalytics() {
    renderCharts();
    renderWeeklyHitMiss();
    renderTopErrors();
  }

  function addModuleEditor() {
    const wrapper = document.createElement("form");
    wrapper.className = "module-add-form";
    wrapper.innerHTML = `
      <label class="field-label" for="new-module-name">Add a module</label>
      <div class="module-add-controls">
        <input id="new-module-name" name="moduleName" type="text" maxlength="100" placeholder="e.g. Module 1" required>
        <button type="submit" class="button button-secondary">Add module</button>
      </div>`;
    elements.moduleProgress.append(wrapper);
    wrapper.addEventListener("submit", (event) => {
      event.preventDefault();
      const input = wrapper.elements.namedItem("moduleName");
      const name = input.value.trim();
      if (!name) {
        input.setCustomValidity("Enter a module name.");
        input.reportValidity();
        return;
      }
      input.setCustomValidity("");
      state.modules.push({
        id: `module-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name,
        progress: 0,
      });
      persistState();
      renderModules();
    });
    wrapper.elements.namedItem("moduleName").addEventListener("input", (event) => {
      event.currentTarget.setCustomValidity("");
    });
  }

  function renderModules() {
    elements.moduleProgress.replaceChildren();
    if (state.modules.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "Add modules to track curriculum completion.";
      elements.moduleProgress.append(empty);
    } else {
      state.modules.forEach((module) => {
        const row = document.createElement("div");
        row.className = "module-row";
        row.innerHTML = `
          <div class="module-row-heading">
            <strong>${escapeHtml(module.name)}</strong>
            <label>
              <span class="visually-hidden">Completion percentage for ${escapeHtml(module.name)}</span>
              <input class="module-progress-input" type="number" min="0" max="100" step="1" value="${module.progress}" data-module-progress="${escapeHtml(module.id)}" aria-label="Completion percentage for ${escapeHtml(module.name)}">
              <span>%</span>
            </label>
            <button type="button" class="module-remove" data-remove-module="${escapeHtml(module.id)}" aria-label="Remove ${escapeHtml(module.name)}">Remove</button>
          </div>
          <progress max="100" value="${module.progress}">${module.progress}%</progress>`;
        elements.moduleProgress.append(row);
      });
    }
    addModuleEditor();
    renderWeeklyReviewEditor();
  }

  function renderWeeklyReviewEditor() {
    let wrapper = document.getElementById("weekly-review-editor");
    if (!wrapper) {
      wrapper = document.createElement("section");
      wrapper.id = "weekly-review-editor";
      wrapper.className = "weekly-review-editor";
      elements.moduleProgress.after(wrapper);
    }
    const weekKey = currentWeekStart();
    const review = state.weeklyReviews[weekKey] ?? {
      energyDashboard: "",
      reviewNotes: "",
      nextWeekPlan: "",
      helperSync: "",
    };
    wrapper.innerHTML = `
      <div class="subsection-heading">
        <h4>Weekly review · ${escapeHtml(weekKey)}</h4>
        <span class="muted-text">Saved automatically</span>
      </div>
      <label class="field-label" for="weekly-energy-dashboard">Energy dashboard notes</label>
      <textarea id="weekly-energy-dashboard" data-weekly-review="energyDashboard" rows="2" placeholder="Weekly energy and recovery observations">${escapeHtml(review.energyDashboard)}</textarea>
      <label class="field-label" for="weekly-review-notes">Review notes</label>
      <textarea id="weekly-review-notes" data-weekly-review="reviewNotes" rows="2" placeholder="What worked? What needs adjustment?">${escapeHtml(review.reviewNotes)}</textarea>
      <label class="field-label" for="weekly-next-plan">Plan next week</label>
      <textarea id="weekly-next-plan" data-weekly-review="nextWeekPlan" rows="2" placeholder="Set the next week's priorities">${escapeHtml(review.nextWeekPlan)}</textarea>
      <label class="field-label" for="weekly-helper-sync">Helper sync</label>
      <textarea id="weekly-helper-sync" data-weekly-review="helperSync" rows="2" placeholder="Notes from the weekly check-in">${escapeHtml(review.helperSync)}</textarea>`;
  }

  function refreshDerived() {
    updateProgress();
    updateBurnoutIndicator();
    renderAnalytics();
  }

  function buildExportConfig() {
    return JSON.parse(JSON.stringify({
      version: CONFIG.version,
      categories: CONFIG.categories,
      modes: CONFIG.modes,
      errorCodes: CONFIG.errorCodes,
      scoreFields: CONFIG.scoreFields,
      sleepinessCheckpoints: CONFIG.sleepinessCheckpoints,
      modePlans: CONFIG.modePlans,
      templates: CONFIG.templates,
    }));
  }

  function exportBackup() {
    try {
      const backup = {
        schemaVersion: STATE_VERSION,
        exportedAt: new Date().toISOString(),
        config: buildExportConfig(),
        data: {
          schemaVersion: STATE_VERSION,
          logs: state.logs,
          weeklyReviews: state.weeklyReviews,
          modules: state.modules,
        },
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `fom-daily-backup-${localDateKey()}.json`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      showFeedback("Backup exported with schedule configuration and all saved records.");
    } catch (error) {
      showFeedback(`Export failed: ${error.message}`, true);
    }
  }

  async function importBackup(file) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (
        !parsed ||
        typeof parsed !== "object" ||
        parsed.schemaVersion !== STATE_VERSION ||
        !parsed.config ||
        !parsed.data
      ) {
        throw new TypeError("This file is not a supported FOM backup.");
      }
      const expectedConfig = buildExportConfig();
      const suppliedConfig = parsed.config;
      const expectedBase = { ...expectedConfig };
      const suppliedBase = { ...suppliedConfig };
      delete expectedBase.modePlans;
      delete suppliedBase.modePlans;
      if (
        JSON.stringify(suppliedBase) !== JSON.stringify(expectedBase) ||
        (suppliedConfig.modePlans !== undefined &&
          JSON.stringify(suppliedConfig.modePlans) !== JSON.stringify(expectedConfig.modePlans))
      ) {
        throw new TypeError("Backup schedule configuration differs from this fixed schedule version.");
      }
      const imported = validateData(parsed.data);
      if (!window.confirm("Import this backup and replace the records currently saved in this browser?")) return;
      const previousState = state;
      state = imported;
      readOnlyAfterStorageError = false;
      persistenceAvailable = true;
      if (!persistState()) {
        state = previousState;
        throw new Error("Imported records could not be saved to local storage.");
      }
      renderAll();
      showFeedback("Backup imported and saved on this device.");
    } catch (error) {
      showFeedback(`Import failed: ${error.message}`, true);
    } finally {
      elements.importInput.value = "";
    }
  }

  function renderAll() {
    setDateHeading();
    updateNowNext();
    renderSchedule();
    renderDailyLog();
    renderAnalytics();
    renderModules();
    renderedDateKey = localDateKey();
  }

  function attachEventHandlers() {
    document.querySelectorAll(".primary-nav .nav-link").forEach((link) => {
      link.addEventListener("click", () => {
        document.querySelectorAll(".primary-nav .nav-link").forEach((item) => {
          item.classList.toggle("is-active", item === link);
          if (item === link) item.setAttribute("aria-current", "page");
          else item.removeAttribute("aria-current");
        });
      });
    });

    elements.modeSelect.addEventListener("change", (event) => {
      mutateToday((record) => {
        record.dayMode = event.currentTarget.value;
      });
      renderDailyLog();
      renderSchedule();
    });

    elements.scheduleList.addEventListener("change", (event) => {
      const checkbox = event.target.closest("[data-block-done]");
      if (!checkbox) return;
      const id = checkbox.dataset.blockDone;
      mutateToday((record) => {
        record.blocks[id] = {
          ...(record.blocks[id] ?? { milestoneDraft: "" }),
          done: checkbox.checked,
        };
      });
      checkbox.closest(".schedule-card")?.classList.toggle("is-complete", checkbox.checked);
      updateProgress();
    });

    elements.scheduleList.addEventListener("input", (event) => {
      const input = event.target.closest("[data-milestone]");
      if (!input) return;
      const id = input.dataset.milestone;
      mutateToday((record) => {
        record.blocks[id] = {
          ...(record.blocks[id] ?? { done: false }),
          milestoneDraft: input.value,
        };
      });
    });

    document.getElementById("daily-log").addEventListener("change", (event) => {
      const target = event.target;
      if (target.matches("[data-score]") || target.matches("[data-sleepiness]")) {
        fillRecordFromInputs();
      } else if (target.matches('input[name="errorCodes"]')) {
        mutateToday((record) => {
          record.errorCodes = [...document.querySelectorAll('input[name="errorCodes"]:checked')]
            .map((input) => input.value);
        }, true);
      } else if (target.matches('input[type="number"]')) {
        const value = target.value === "" ? null : Number(target.value);
        if (value !== null && (!Number.isSafeInteger(value) || value < 0)) {
          target.setCustomValidity("Enter a non-negative whole number.");
          target.reportValidity();
          return;
        }
        target.setCustomValidity("");
        const field = target.id === "fom4-flagged"
          ? "flagged"
          : target.id === "fom4-corrected"
            ? "corrected"
            : "doubtLog";
        mutateToday((record) => {
          record.fom4[field] = value;
        }, true);
      }
    });

    document.getElementById("daily-log").addEventListener("input", (event) => {
      const target = event.target;
      if (target.id === "unfinished-items" || target.id === "hardest-minutes") {
        mutateToday((record) => {
          record[target.id === "unfinished-items" ? "unfinishedItems" : "hardestMinutes"] = target.value;
        });
      }
    });

    document.getElementById("daily-log").addEventListener("click", (event) => {
      const button = event.target.closest("[data-shutdown-result]");
      if (!button) return;
      const result = button.dataset.shutdownResult;
      mutateToday((record) => {
        record.shutdownResult = record.shutdownResult === result ? null : result;
      }, true);
      document.querySelectorAll("[data-shutdown-result]").forEach((item) => {
        item.setAttribute("aria-pressed", String(recordFor().shutdownResult === item.dataset.shutdownResult));
      });
    });

    elements.moduleProgress.addEventListener("change", (event) => {
      const input = event.target.closest("[data-module-progress]");
      if (!input) return;
      const value = Number(input.value);
      if (!Number.isInteger(value) || value < 0 || value > 100) {
        input.setCustomValidity("Enter a whole number from 0 to 100.");
        input.reportValidity();
        return;
      }
      input.setCustomValidity("");
      const module = state.modules.find((item) => item.id === input.dataset.moduleProgress);
      if (!module) return;
      module.progress = value;
      persistState();
      renderModules();
    });

    elements.moduleProgress.addEventListener("click", (event) => {
      const button = event.target.closest("[data-remove-module]");
      if (!button) return;
      const module = state.modules.find((item) => item.id === button.dataset.removeModule);
      if (!module || !window.confirm(`Remove module “${module.name}” and its progress?`)) return;
      state.modules = state.modules.filter((item) => item.id !== module.id);
      persistState();
      renderModules();
    });

    elements.moduleProgress.parentElement.addEventListener("input", (event) => {
      const field = event.target.closest("[data-weekly-review]");
      if (!field) return;
      const weekKey = currentWeekStart();
      const review = state.weeklyReviews[weekKey] ?? {
        energyDashboard: "",
        reviewNotes: "",
        nextWeekPlan: "",
        helperSync: "",
      };
      review[field.dataset.weeklyReview] = field.value;
      state.weeklyReviews[weekKey] = review;
      persistState();
    });

    elements.exportButton.addEventListener("click", exportBackup);
    elements.importInput.addEventListener("change", (event) => {
      importBackup(event.currentTarget.files?.[0]);
    });
  }

  function init() {
    loadState();
    attachEventHandlers();
    renderAll();
    window.setInterval(() => {
      if (renderedDateKey !== localDateKey()) {
        renderAll();
        return;
      }
      setDateHeading();
      updateNowNext();
    }, 60_000);
  }

  init();
})();
