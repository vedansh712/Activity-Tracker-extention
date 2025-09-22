// Popup script for Activity Tracker extension
// Handles UI interactions and data display

document.addEventListener("DOMContentLoaded", function () {
  loadActivityData();

  // Add event listeners
  document
    .getElementById("refreshBtn")
    .addEventListener("click", loadActivityData);
  document
    .getElementById("settingsBtn")
    .addEventListener("click", openSettings);
  document.getElementById("clearBtn").addEventListener("click", clearAllData);
});

// Format time from milliseconds to readable format
function formatTime(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

// Format relative time (last visit)
function formatRelativeTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days > 0) {
    return `${days} day${days > 1 ? "s" : ""} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  } else {
    return "Just now";
  }
}

// Get favicon URL for domain
function getFaviconUrl(domain, storedFavicon) {
  if (storedFavicon) {
    return storedFavicon;
  }
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

// Load and display activity data
async function loadActivityData() {
  const loadingMessage = document.getElementById("loadingMessage");
  const noDataMessage = document.getElementById("noDataMessage");
  const activityContainer = document.getElementById("activityContainer");

  loadingMessage.style.display = "block";
  noDataMessage.style.display = "none";
  activityContainer.innerHTML = "";

  try {
    // Get both activity data and daily tracking for comparison
    const [activityResponse, dailyResponse] = await Promise.all([
      new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "GET_ACTIVITY_DATA" }, resolve);
      }),
      new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "GET_REDIRECTION_RULES" }, resolve);
      }),
    ]);

    const activityData = activityResponse.activityData || {};
    const dailyTimeTracking = dailyResponse.dailyTimeTracking || {};
    const today = new Date().toISOString().split("T")[0];
    const todayData = dailyTimeTracking[today] || {};

    const domains = Object.keys(activityData);

    loadingMessage.style.display = "none";

    if (domains.length === 0) {
      noDataMessage.style.display = "block";
      updateOverviewStats(0, 0);
      return;
    }

    // Sort domains by total time spent (descending)
    const sortedDomains = domains.sort((a, b) => {
      return activityData[b].totalTime - activityData[a].totalTime;
    });

    // Calculate totals
    let totalTime = 0;
    let totalSites = domains.length;

    domains.forEach((domain) => {
      totalTime += activityData[domain].totalTime;
    });

    updateOverviewStats(totalSites, totalTime);

    // Create activity items
    sortedDomains.forEach((domain) => {
      const data = activityData[domain];
      const todayTime = todayData[domain] || 0;
      const activityItem = createActivityItem(domain, data, todayTime);
      activityContainer.appendChild(activityItem);
    });
  } catch (error) {
    console.error("Error loading activity data:", error);
    loadingMessage.textContent = "Error loading data";
  }
}

// Update overview statistics
function updateOverviewStats(totalSites, totalTime) {
  document.getElementById("totalSites").textContent = totalSites;
  document.getElementById("totalTime").textContent = formatTime(totalTime);
}

// Create activity item element
function createActivityItem(domain, data, todayTime = 0) {
  const item = document.createElement("div");
  item.className = "activity-item";

  const faviconUrl = getFaviconUrl(domain, data.favicon);
  const totalTimeSpent = formatTime(data.totalTime);
  const todayTimeSpent = formatTime(todayTime);
  const lastVisit = formatRelativeTime(data.lastVisit);
  const visits = data.visits || 1;

  // Show both today's time and total time for better clarity
  const timeDisplay =
    todayTime > 0
      ? `<div class="time-spent">${todayTimeSpent}</div>
     <div class="time-total">Total: ${totalTimeSpent}</div>`
      : `<div class="time-spent">${totalTimeSpent}</div>`;

  item.innerHTML = `
    <div class="site-favicon">
      <img src="${faviconUrl}" alt="${domain}" onerror="this.style.display='none'; this.parentElement.textContent='🌐';">
    </div>
    <div class="site-info">
      <div class="site-domain">${domain}</div>
      <div class="site-stats">${visits} visit${
    visits > 1 ? "s" : ""
  } • Last: ${lastVisit}</div>
    </div>
    <div class="time-container">
      ${timeDisplay}
    </div>
  `;

  return item;
}

// Open settings page
function openSettings() {
  chrome.runtime.openOptionsPage();
}

// Clear all activity data
async function clearAllData() {
  const confirmed = confirm(
    "Are you sure you want to clear all activity data? This action cannot be undone."
  );

  if (confirmed) {
    try {
      await chrome.storage.local.clear();
      await chrome.storage.local.set({
        activityData: {},
        totalTime: 0,
        lastActive: Date.now(),
      });

      // Reload the display
      loadActivityData();

      // Show confirmation
      const container = document.getElementById("activityContainer");
      container.innerHTML =
        '<div class="loading">Data cleared successfully!</div>';

      setTimeout(() => {
        loadActivityData();
      }, 1500);
    } catch (error) {
      console.error("Error clearing data:", error);
      alert("Error clearing data. Please try again.");
    }
  }
}
