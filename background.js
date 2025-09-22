// Background script for Activity Tracker extension
// Handles tab tracking, time measurement, and data storage

let currentTab = null;
let startTime = null;
let isActive = true;

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log("Activity Tracker extension installed");
  initializeStorage();
});

// Initialize storage with default values
async function initializeStorage() {
  const result = await chrome.storage.local.get([
    "activityData",
    "redirectionRules",
    "dailyTimeTracking",
  ]);
  if (!result.activityData) {
    await chrome.storage.local.set({
      activityData: {},
      totalTime: 0,
      lastActive: Date.now(),
    });
  }
  if (!result.redirectionRules) {
    await chrome.storage.local.set({
      redirectionRules: {},
    });
  }
  if (!result.dailyTimeTracking) {
    await chrome.storage.local.set({
      dailyTimeTracking: {},
    });
  }
}

// Extract domain from URL
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace("www.", "");
  } catch (error) {
    console.error("Error extracting domain:", error);
    return "unknown";
  }
}

// Get today's date key for daily tracking
function getTodayKey() {
  const today = new Date();
  return today.toISOString().split("T")[0]; // YYYY-MM-DD format
}

// Check if domain should be redirected based on time limits
async function checkRedirectionRules(domain, currentTime) {
  const result = await chrome.storage.local.get([
    "redirectionRules",
    "dailyTimeTracking",
  ]);
  const redirectionRules = result.redirectionRules || {};
  const dailyTimeTracking = result.dailyTimeTracking || {};

  const todayKey = getTodayKey();
  const rule = redirectionRules[domain];

  if (!rule || !rule.enabled) {
    return null;
  }

  // Initialize daily tracking for today if not exists
  if (!dailyTimeTracking[todayKey]) {
    dailyTimeTracking[todayKey] = {};
  }

  const todayTime = dailyTimeTracking[todayKey][domain] || 0;
  const timeWithCurrent = todayTime + (currentTime || 0);

  if (timeWithCurrent >= rule.timeLimit) {
    return {
      shouldRedirect: true,
      redirectTo: rule.redirectTo,
      timeSpent: timeWithCurrent,
      timeLimit: rule.timeLimit,
    };
  }

  // Check if warning should be shown (5 minutes before limit)
  const warningTime = rule.warningTime || 300000; // 5 minutes default
  if (
    timeWithCurrent >= rule.timeLimit - warningTime &&
    timeWithCurrent < rule.timeLimit
  ) {
    return {
      shouldWarn: true,
      timeRemaining: rule.timeLimit - timeWithCurrent,
      redirectTo: rule.redirectTo,
    };
  }

  return null;
}

// Update daily time tracking
async function updateDailyTimeTracking(domain, timeSpent) {
  const result = await chrome.storage.local.get(["dailyTimeTracking"]);
  const dailyTimeTracking = result.dailyTimeTracking || {};
  const todayKey = getTodayKey();

  if (!dailyTimeTracking[todayKey]) {
    dailyTimeTracking[todayKey] = {};
  }

  dailyTimeTracking[todayKey][domain] =
    (dailyTimeTracking[todayKey][domain] || 0) + timeSpent;

  await chrome.storage.local.set({ dailyTimeTracking });
}

// Save time spent on current domain
async function saveTimeSpent() {
  if (!currentTab || !startTime) return;

  const timeSpent = Date.now() - startTime;
  const domain = extractDomain(currentTab.url);

  if (timeSpent > 1000) {
    // Only save if more than 1 second
    const result = await chrome.storage.local.get(["activityData"]);
    const activityData = result.activityData || {};

    if (!activityData[domain]) {
      activityData[domain] = {
        totalTime: 0,
        visits: 0,
        lastVisit: Date.now(),
        favicon: currentTab.favIconUrl || null,
      };
    }

    activityData[domain].totalTime += timeSpent;
    activityData[domain].visits += 1;
    activityData[domain].lastVisit = Date.now();

    // Update daily time tracking
    await updateDailyTimeTracking(domain, timeSpent);

    await chrome.storage.local.set({ activityData });

    console.log(`Saved ${timeSpent}ms for ${domain}`);

    // Check redirection rules
    const redirectionCheck = await checkRedirectionRules(domain, timeSpent);
    if (redirectionCheck) {
      if (redirectionCheck.shouldRedirect) {
        console.log(`Redirecting ${domain} to ${redirectionCheck.redirectTo}`);
        await performRedirection(
          currentTab.id,
          redirectionCheck.redirectTo,
          domain
        );
      } else if (redirectionCheck.shouldWarn) {
        console.log(
          `Warning for ${domain}: ${redirectionCheck.timeRemaining}ms remaining`
        );
        await showTimeWarning(
          currentTab.id,
          domain,
          redirectionCheck.timeRemaining,
          redirectionCheck.redirectTo
        );
      }
    }
  }
}

// Perform redirection to target URL
async function performRedirection(tabId, redirectTo, fromDomain) {
  try {
    // Update the tab URL
    await chrome.tabs.update(tabId, { url: redirectTo });

    // Send notification to content script
    chrome.tabs.sendMessage(tabId, {
      type: "REDIRECTED",
      fromDomain: fromDomain,
      redirectTo: redirectTo,
      reason: "Time limit exceeded",
    });

    console.log(
      `Successfully redirected tab ${tabId} from ${fromDomain} to ${redirectTo}`
    );
  } catch (error) {
    console.error("Error performing redirection:", error);
  }
}

// Show time warning notification
async function showTimeWarning(tabId, domain, timeRemaining, redirectTo) {
  try {
    const minutes = Math.ceil(timeRemaining / 60000);
    chrome.tabs.sendMessage(tabId, {
      type: "TIME_WARNING",
      domain: domain,
      timeRemaining: timeRemaining,
      minutes: minutes,
      redirectTo: redirectTo,
    });

    console.log(`Showed warning for ${domain}: ${minutes} minutes remaining`);
  } catch (error) {
    console.error("Error showing time warning:", error);
  }
}

// Start tracking new tab
function startTracking(tab) {
  if (
    tab &&
    tab.url &&
    !tab.url.startsWith("chrome://") &&
    !tab.url.startsWith("chrome-extension://")
  ) {
    currentTab = tab;
    startTime = Date.now();
    console.log(`Started tracking: ${extractDomain(tab.url)}`);
  }
}

// Tab activation handler
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await saveTimeSpent();

  const tab = await chrome.tabs.get(activeInfo.tabId);
  startTracking(tab);
});

// Tab update handler (URL changes)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.active) {
    await saveTimeSpent();
    startTracking(tab);
  }
});

// Window focus handler
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Browser lost focus
    await saveTimeSpent();
    isActive = false;
    currentTab = null;
    startTime = null;
  } else {
    // Browser gained focus
    isActive = true;
    const tabs = await chrome.tabs.query({ active: true, windowId: windowId });
    if (tabs[0]) {
      startTracking(tabs[0]);
    }
  }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "PAGE_VISIBILITY_CHANGED") {
    if (message.visible) {
      // Page became visible
      if (sender.tab) {
        startTracking(sender.tab);
      }
    } else {
      // Page became hidden
      saveTimeSpent();
      currentTab = null;
      startTime = null;
    }
  }

  if (message.type === "GET_ACTIVITY_DATA") {
    chrome.storage.local.get(["activityData"]).then((result) => {
      sendResponse({ activityData: result.activityData || {} });
    });
    return true; // Will respond asynchronously
  }

  if (message.type === "GET_REDIRECTION_RULES") {
    chrome.storage.local
      .get(["redirectionRules", "dailyTimeTracking"])
      .then((result) => {
        sendResponse({
          redirectionRules: result.redirectionRules || {},
          dailyTimeTracking: result.dailyTimeTracking || {},
        });
      });
    return true;
  }

  if (message.type === "SAVE_REDIRECTION_RULE") {
    chrome.storage.local.get(["redirectionRules"]).then(async (result) => {
      const redirectionRules = result.redirectionRules || {};
      redirectionRules[message.domain] = {
        timeLimit: message.timeLimit,
        redirectTo: message.redirectTo,
        enabled: message.enabled !== false,
        warningTime: message.warningTime || 300000,
      };
      await chrome.storage.local.set({ redirectionRules });
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === "DELETE_REDIRECTION_RULE") {
    chrome.storage.local.get(["redirectionRules"]).then(async (result) => {
      const redirectionRules = result.redirectionRules || {};
      delete redirectionRules[message.domain];
      await chrome.storage.local.set({ redirectionRules });
      sendResponse({ success: true });
    });
    return true;
  }
});

// Periodic save (every 10 seconds)
setInterval(async () => {
  if (isActive && currentTab && startTime) {
    const tempStartTime = startTime;
    startTime = Date.now(); // Reset start time to avoid double counting

    const timeSpent = startTime - tempStartTime;
    const domain = extractDomain(currentTab.url);

    if (timeSpent > 0) {
      const result = await chrome.storage.local.get(["activityData"]);
      const activityData = result.activityData || {};

      if (!activityData[domain]) {
        activityData[domain] = {
          totalTime: 0,
          visits: 0,
          lastVisit: Date.now(),
          favicon: currentTab.favIconUrl || null,
        };
      }

      activityData[domain].totalTime += timeSpent;
      activityData[domain].lastVisit = Date.now();

      // IMPORTANT: Also update daily time tracking for consistency
      await updateDailyTimeTracking(domain, timeSpent);

      await chrome.storage.local.set({ activityData });

      console.log(`Periodic save: ${timeSpent}ms for ${domain}`);
    }
  }
}, 10000);

// Initialize tracking for current active tab
chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
  if (tabs[0]) {
    startTracking(tabs[0]);
  }
});
