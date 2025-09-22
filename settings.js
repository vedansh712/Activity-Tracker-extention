// Settings page script for Activity Tracker extension
// Handles redirection rule management

document.addEventListener("DOMContentLoaded", function () {
  loadRedirectionRules();
  loadDailyStats();

  // Add event listeners
  document
    .getElementById("addRuleBtn")
    .addEventListener("click", addRedirectionRule);
  document
    .getElementById("clearAllRulesBtn")
    .addEventListener("click", clearAllRules);
});

// Format time from milliseconds to readable format
function formatTime(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return `${seconds}s`;
  }
}

// Extract domain from URL
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace("www.", "");
  } catch (error) {
    return url;
  }
}

// Load and display redirection rules
async function loadRedirectionRules() {
  const rulesContainer = document.getElementById("rulesContainer");
  const noRulesMessage = document.getElementById("noRulesMessage");

  try {
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "GET_REDIRECTION_RULES" }, resolve);
    });

    const redirectionRules = response.redirectionRules || {};
    const domains = Object.keys(redirectionRules);

    rulesContainer.innerHTML = "";

    if (domains.length === 0) {
      noRulesMessage.style.display = "block";
      return;
    }

    noRulesMessage.style.display = "none";

    domains.forEach((domain) => {
      const rule = redirectionRules[domain];
      const ruleElement = createRuleElement(domain, rule);
      rulesContainer.appendChild(ruleElement);
    });
  } catch (error) {
    console.error("Error loading redirection rules:", error);
    rulesContainer.innerHTML = '<div class="loading">Error loading rules</div>';
  }
}

// Create rule element
function createRuleElement(domain, rule) {
  const ruleItem = document.createElement("div");
  ruleItem.className = "rule-item";
  ruleItem.dataset.domain = domain;

  const timeLimitHours = Math.floor(rule.timeLimit / 3600000);
  const timeLimitMinutes = Math.floor((rule.timeLimit % 3600000) / 60000);
  const warningMinutes = Math.floor(rule.warningTime / 60000);

  ruleItem.innerHTML = `
    <div class="rule-header">
      <div class="rule-title">${domain}</div>
      <div class="rule-status">
        <span class="status-badge ${
          rule.enabled ? "status-enabled" : "status-disabled"
        }">
          ${rule.enabled ? "Enabled" : "Disabled"}
        </span>
        <label class="toggle-switch">
          <input type="checkbox" ${
            rule.enabled ? "checked" : ""
          } class="rule-toggle" data-domain="${domain}">
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>
    <div class="rule-details">
      <div class="rule-detail">
        <div class="rule-detail-label">Redirect To</div>
        <div class="rule-detail-value">${extractDomain(rule.redirectTo)}</div>
      </div>
      <div class="rule-detail">
        <div class="rule-detail-label">Time Limit</div>
        <div class="rule-detail-value">${
          timeLimitHours > 0 ? timeLimitHours + "h " : ""
        }${timeLimitMinutes}m</div>
      </div>
      <div class="rule-detail">
        <div class="rule-detail-label">Warning Time</div>
        <div class="rule-detail-value">${warningMinutes}m before</div>
      </div>
      <div class="rule-detail">
        <div class="rule-detail-label">Full URL</div>
        <div class="rule-detail-value" style="font-size: 12px; word-break: break-all;">${
          rule.redirectTo
        }</div>
      </div>
    </div>
    <div class="rule-actions">
      <button class="btn btn-secondary btn-small rule-edit-btn" data-domain="${domain}">Edit</button>
      <button class="btn btn-danger btn-small rule-delete-btn" data-domain="${domain}">Delete</button>
    </div>
  `;

  // Add event listeners
  const toggleInput = ruleItem.querySelector(".rule-toggle");
  const editBtn = ruleItem.querySelector(".rule-edit-btn");
  const deleteBtn = ruleItem.querySelector(".rule-delete-btn");

  toggleInput.addEventListener("change", (e) => {
    toggleRule(domain, e.target.checked);
  });

  editBtn.addEventListener("click", () => {
    editRule(domain);
  });

  deleteBtn.addEventListener("click", () => {
    deleteRule(domain);
  });

  return ruleItem;
}

// Add new redirection rule
async function addRedirectionRule() {
  const sourceDomain = document.getElementById("sourceDomain").value.trim();
  const targetUrl = document.getElementById("targetUrl").value.trim();
  const timeLimit = parseInt(document.getElementById("timeLimit").value);
  const warningTime =
    parseInt(document.getElementById("warningTime").value) || 5;

  // Validation
  if (!sourceDomain) {
    alert("Please enter a source domain");
    return;
  }

  if (!targetUrl) {
    alert("Please enter a target URL");
    return;
  }

  if (!timeLimit || timeLimit < 1) {
    alert("Please enter a valid time limit (minimum 1 minute)");
    return;
  }

  try {
    new URL(targetUrl);
  } catch (error) {
    alert("Please enter a valid URL for redirection target");
    return;
  }

  // Clean domain (remove protocol, www, etc.)
  const cleanDomain = sourceDomain
    .replace(/^(https?:\/\/)?(www\.)?/, "")
    .split("/")[0];

  try {
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          type: "SAVE_REDIRECTION_RULE",
          domain: cleanDomain,
          timeLimit: timeLimit * 60000, // Convert minutes to milliseconds
          redirectTo: targetUrl,
          enabled: true,
          warningTime: warningTime * 60000, // Convert minutes to milliseconds
        },
        resolve
      );
    });

    if (response.success) {
      // Clear form
      document.getElementById("sourceDomain").value = "";
      document.getElementById("targetUrl").value = "";
      document.getElementById("timeLimit").value = "";
      document.getElementById("warningTime").value = "";

      // Reload rules
      loadRedirectionRules();

      // Show success message
      showNotification("Rule added successfully!", "success");
    } else {
      alert("Error adding rule. Please try again.");
    }
  } catch (error) {
    console.error("Error adding rule:", error);
    alert("Error adding rule. Please try again.");
  }
}

// Toggle rule enabled/disabled
async function toggleRule(domain, enabled) {
  try {
    // Get current rule
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "GET_REDIRECTION_RULES" }, resolve);
    });

    const rule = response.redirectionRules[domain];
    if (!rule) return;

    // Update rule
    await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          type: "SAVE_REDIRECTION_RULE",
          domain: domain,
          timeLimit: rule.timeLimit,
          redirectTo: rule.redirectTo,
          enabled: enabled,
          warningTime: rule.warningTime,
        },
        resolve
      );
    });

    // Reload rules
    loadRedirectionRules();

    showNotification(
      `Rule ${enabled ? "enabled" : "disabled"} for ${domain}`,
      "info"
    );
  } catch (error) {
    console.error("Error toggling rule:", error);
  }
}

// Delete rule
async function deleteRule(domain) {
  const confirmed = confirm(
    `Are you sure you want to delete the rule for ${domain}?`
  );

  if (confirmed) {
    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          {
            type: "DELETE_REDIRECTION_RULE",
            domain: domain,
          },
          resolve
        );
      });

      if (response.success) {
        loadRedirectionRules();
        showNotification(`Rule deleted for ${domain}`, "success");
      }
    } catch (error) {
      console.error("Error deleting rule:", error);
      alert("Error deleting rule. Please try again.");
    }
  }
}

// Edit rule (simplified - just delete and let user re-add)
function editRule(domain) {
  alert(
    `To edit this rule, please delete it and create a new one with updated settings.`
  );
}

// Clear all rules
async function clearAllRules() {
  const confirmed = confirm(
    "Are you sure you want to delete ALL redirection rules? This action cannot be undone."
  );

  if (confirmed) {
    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "GET_REDIRECTION_RULES" }, resolve);
      });

      const domains = Object.keys(response.redirectionRules || {});

      for (const domain of domains) {
        await new Promise((resolve) => {
          chrome.runtime.sendMessage(
            {
              type: "DELETE_REDIRECTION_RULE",
              domain: domain,
            },
            resolve
          );
        });
      }

      loadRedirectionRules();
      showNotification("All rules cleared successfully!", "success");
    } catch (error) {
      console.error("Error clearing rules:", error);
      alert("Error clearing rules. Please try again.");
    }
  }
}

// Load daily statistics
async function loadDailyStats() {
  const dailyStatsContainer = document.getElementById("dailyStatsContainer");

  try {
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "GET_REDIRECTION_RULES" }, resolve);
    });

    const dailyTimeTracking = response.dailyTimeTracking || {};
    const redirectionRules = response.redirectionRules || {};
    const today = new Date().toISOString().split("T")[0];
    const todayData = dailyTimeTracking[today] || {};

    dailyStatsContainer.innerHTML = "";

    const domains = Object.keys(todayData);
    if (domains.length === 0) {
      dailyStatsContainer.innerHTML =
        '<div class="loading">No activity today yet</div>';
      return;
    }

    domains.forEach((domain) => {
      const timeSpent = todayData[domain];
      const rule = redirectionRules[domain];
      const statElement = createDailyStatElement(domain, timeSpent, rule);
      dailyStatsContainer.appendChild(statElement);
    });
  } catch (error) {
    console.error("Error loading daily stats:", error);
    dailyStatsContainer.innerHTML =
      '<div class="loading">Error loading stats</div>';
  }
}

// Create daily stat element
function createDailyStatElement(domain, timeSpent, rule) {
  const statItem = document.createElement("div");
  statItem.className = "daily-stat-item";

  const timeFormatted = formatTime(timeSpent);
  let progressHtml = "";

  if (rule && rule.enabled) {
    const percentage = Math.min((timeSpent / rule.timeLimit) * 100, 100);
    const limitFormatted = formatTime(rule.timeLimit);

    progressHtml = `
      <div class="stat-progress">
        <div class="stat-progress-bar" style="width: ${percentage}%"></div>
      </div>
      <div style="font-size: 12px; color: #666; margin-top: 4px;">
        ${timeFormatted} / ${limitFormatted} (${Math.round(percentage)}%)
      </div>
    `;
  }

  statItem.innerHTML = `
    <div>
      <div class="stat-domain">${domain}</div>
      ${progressHtml || `<div class="stat-time">${timeFormatted}</div>`}
    </div>
    ${
      rule && rule.enabled
        ? `<div style="font-size: 12px; color: ${
            timeSpent >= rule.timeLimit ? "#e53e3e" : "#667eea"
          };">
        ${timeSpent >= rule.timeLimit ? "🚫 Limit Exceeded" : "✅ Within Limit"}
      </div>`
        : ""
    }
  `;

  return statItem;
}

// Show notification
function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 8px;
    color: white;
    font-weight: 600;
    z-index: 999999;
    animation: slideIn 0.3s ease-out;
  `;

  const colors = {
    success: "background: linear-gradient(135deg, #48bb78, #38a169);",
    error: "background: linear-gradient(135deg, #e53e3e, #c53030);",
    info: "background: linear-gradient(135deg, #667eea, #764ba2);",
  };

  notification.style.cssText += colors[type] || colors.info;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Functions are now properly attached via event listeners, no need for global window functions
