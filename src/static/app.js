document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const form = document.getElementById("signup-form");
  const messageEl = document.getElementById("message");

  function showMessage(text, type = "info") {
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    messageEl.classList.remove("hidden");
    clearTimeout(messageEl._timer);
    messageEl._timer = setTimeout(() => messageEl.classList.add("hidden"), 4000);
  }

  function escapeHtml(str = "") {
    return String(str).replace(/[&<>"']/g, (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])
    );
  }

  function createParticipantList(activityName, participants) {
    if (!participants || participants.length === 0) {
      return '<p class="participant-empty">No participants yet.</p>';
    }
    return `<ul class="participants">${participants.map(p => `
      <li class="participant-item">
        <span class="participant-email">${escapeHtml(p)}</span>
        <button class="remove-participant" data-activity="${escapeHtml(activityName)}" data-email="${escapeHtml(p)}" aria-label="Remove ${escapeHtml(p)}">✕</button>
      </li>`).join('')}
    </ul>`;
  }

  function renderActivities(data) {
    activitiesList.innerHTML = "";
    activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';
    Object.entries(data).forEach(([name, info]) => {
      const card = document.createElement("div");
      card.className = "activity-card";
      card.innerHTML = `
        <h4>${escapeHtml(name)}</h4>
        <p class="desc">${escapeHtml(info.description)}</p>
        <p class="schedule"><strong>Schedule:</strong> ${escapeHtml(info.schedule)}</p>
        <p class="participant-count"><strong>Participants (${info.participants.length}):</strong></p>
        ${createParticipantList(name, info.participants)}
      `;
      activitiesList.appendChild(card);

      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      activitySelect.appendChild(opt);
    });
  }

  function fetchAndRender() {
    fetch("/activities")
      .then(r => { if (!r.ok) throw new Error("Failed to load activities"); return r.json(); })
      .then(renderActivities)
      .catch(err => showMessage(err.message || "Unable to load activities", "error"));
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const activity = document.getElementById("activity").value;
    if (!email || !activity) {
      showMessage("Please provide an email and select an activity", "error");
      return;
    }
    fetch(`/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`, {
      method: "POST"
    })
      .then(async r => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) {
          showMessage(body.detail || "Signup failed", "error");
          return;
        }
        showMessage(body.message || "Signed up successfully", "success");
        form.reset();
        fetchAndRender();
      })
      .catch(() => showMessage("Network error", "error"));
  });

  // Delegate click events for remove buttons
  activitiesList.addEventListener('click', (e) => {
    const btn = e.target.closest('.remove-participant');
    if (!btn) return;

    const activity = btn.getAttribute('data-activity');
    const email = btn.getAttribute('data-email');

    if (!activity || !email) return;

    // Confirm before removing
    if (!confirm(`Remove ${email} from ${activity}?`)) return;

    fetch(`/activities/${encodeURIComponent(activity)}/participants?email=${encodeURIComponent(email)}`, {
      method: 'DELETE'
    })
      .then(async r => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) {
          showMessage(body.detail || 'Failed to remove participant', 'error');
          return;
        }
        showMessage(body.message || 'Participant removed', 'success');
        fetchAndRender();
      })
      .catch(() => showMessage('Network error', 'error'));
  });

  fetchAndRender();
});
