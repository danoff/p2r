const DATA_URL = import.meta.env.BASE_URL + 'data.json';

async function loadData() {
  const res = await fetch(DATA_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtTime(ts) {
  try {
    return new Date(ts).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
    });
  } catch { return ts; }
}

function typeIcon(type) {
  return type === 'human' ? '&#128100;' : '&#129302;';
}

function attestBadge(r) {
  return r.sovereignty_attestation === true
    ? `<span class="badge verified" title="${esc(r.attestation_text)}">&#10003; Sovereign</span>`
    : `<span class="badge unverified">&#9888; Not Attested</span>`;
}

function tags(list, cls = '') {
  return (list ?? []).map(t => `<span class="tag ${cls}">${esc(t)}</span>`).join('');
}

function patternRefs(refs) {
  if (!refs) return '';
  const parts = [];
  if (refs.selected?.length) parts.push(`<span class="tag-group"><b>Selected:</b> ${tags(refs.selected)}</span>`);
  if (refs.revised?.length)  parts.push(`<span class="tag-group"><b>Revised:</b> ${tags(refs.revised, 'revised')}</span>`);
  if (refs.proposed?.length) parts.push(`<span class="tag-group"><b>Proposed:</b> ${tags(refs.proposed, 'proposed')}</span>`);
  return parts.join('');
}

function precisionBlock(pu) {
  if (!pu) return '';
  const fmt = v => v != null ? (v >= 0 ? `+${v}` : `${v}`) : 'N/A';
  const cls = v => v >= 0 ? 'positive' : 'negative';
  return `
    <div class="precision">
      <div class="pstat">
        <span class="pstat-label">Breadth &#916;</span>
        <span class="pstat-val ${cls(pu.breadth_delta)}">${esc(fmt(pu.breadth_delta))}</span>
      </div>
      <div class="pstat">
        <span class="pstat-label">Reliability &#916;</span>
        <span class="pstat-val ${cls(pu.reliability_delta)}">${esc(fmt(pu.reliability_delta))}</span>
      </div>
      ${pu.rationale ? `<p class="pratio">${esc(pu.rationale)}</p>` : ''}
    </div>`;
}

function linkList(items) {
  return (items ?? []).map(it => {
    const u = it.uri ?? it;
    return `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer" class="elink">${esc(u)}</a>`;
  }).join('');
}

function timelineCard(r) {
  return `
  <article class="p2r-card" data-type="${esc(r.type)}">
    <header class="card-header">
      <div class="pinfo">
        <span class="picon">${typeIcon(r.type)}</span>
        <div>
          <strong class="dname">${esc(r.display_name)}</strong>
          <span class="pid">@${esc(r.partaker_id)}</span>
        </div>
      </div>
      <div class="card-meta">
        ${attestBadge(r)}
        <span class="ts">${fmtTime(r.timestamp)}</span>
      </div>
    </header>
    <div class="card-body">
      <div class="fg"><label>Role</label><p>${esc(r.role_this_cycle)}</p></div>
      <div class="fg"><label>Intent</label><p>${esc(r.intent)}</p></div>
      <div class="fg"><label>Contribution</label><p>${esc(r.contribution_summary)}</p></div>
      <div class="fg"><label>Learning</label><p class="sovereign">${esc(r.learning)}</p></div>
      ${r.pattern_refs ? `<div class="fg"><label>Patterns</label><div class="prefs">${patternRefs(r.pattern_refs)}</div></div>` : ''}
      ${r.precision_update ? `<div class="fg"><label>Precision Update</label>${precisionBlock(r.precision_update)}</div>` : ''}
      ${r.artifact_produced?.uri ? `<div class="fg"><label>Artifact</label><a href="${esc(r.artifact_produced.uri)}" target="_blank" rel="noopener noreferrer" class="elink">${esc(r.artifact_produced.uri)}</a></div>` : ''}
      ${r.evidence?.length ? `<div class="fg"><label>Evidence</label><div class="elinks">${linkList(r.evidence)}</div></div>` : ''}
    </div>
  </article>`;
}

function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    (acc[item[key]] = acc[item[key]] ?? []).push(item);
    return acc;
  }, {});
}

function renderTimeline(reports) {
  if (!reports.length) return '<p class="empty">No reports yet.</p>';
  const groups = groupBy(reports, 'cycle_id');
  return Object.entries(groups).map(([cid, rs]) => `
    <section class="cycle-group">
      <h2 class="cycle-heading">${esc(cid)}</h2>
      <div class="cycle-cards">${rs.map(timelineCard).join('')}</div>
    </section>`).join('');
}

function renderMatrix(reports, activeCycle) {
  const cycles = [...new Set(reports.map(r => r.cycle_id))];
  const cycle = activeCycle ?? cycles[0];
  const filtered = cycle ? reports.filter(r => r.cycle_id === cycle) : reports;

  const sel = `
    <div class="matrix-controls">
      <label for="cycle-sel">Cycle:</label>
      <select id="cycle-sel">
        ${cycles.map(c => `<option value="${esc(c)}" ${c === cycle ? 'selected' : ''}>${esc(c)}</option>`).join('')}
      </select>
    </div>`;

  const cols = filtered.map(r => `
    <div class="matrix-col" data-type="${esc(r.type)}">
      <div class="matrix-col-header">
        <span class="picon">${typeIcon(r.type)}</span>
        <strong>${esc(r.display_name)}</strong>
        <span class="pid">@${esc(r.partaker_id)}</span>
        ${attestBadge(r)}
      </div>
      <div class="sovereign-container">
        <div class="mf"><label>Learning</label><p>${esc(r.learning)}</p></div>
        <div class="mf"><label>Precision Update</label>${precisionBlock(r.precision_update)}</div>
      </div>
    </div>`).join('');

  return sel + `<div class="matrix-grid">${cols || '<p class="empty">No reports for this cycle.</p>'}</div>`;
}

let allReports = [];
let view = 'timeline';
let activeCycle = null;

function render() {
  const app = document.getElementById('app');
  app.innerHTML = view === 'timeline'
    ? renderTimeline(allReports)
    : renderMatrix(allReports, activeCycle);

  if (view === 'matrix') {
    document.getElementById('cycle-sel')?.addEventListener('change', e => {
      activeCycle = e.target.value;
      render();
    });
  }
}

async function init() {
  const app = document.getElementById('app');
  try {
    allReports = await loadData();
  } catch (e) {
    app.innerHTML = `<p class="error">Failed to load reports: ${esc(e.message)}</p>`;
    return;
  }
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      view = btn.dataset.view;
      render();
    });
  });
  render();
}

init();
