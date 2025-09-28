// Content script for Activity Tracker extension
// Monitors page visibility and user activity

let isPageVisible = true;
let lastActivityTime = Date.now();
let cursorInWindow = true;
let windowHasFocus = true;

// Rest reminder side popup variables
let restReminderPopup = null;
let countdownInterval = null;
let restTimeRemaining = 30 * 60; // 30 minutes in seconds
let isRestTimerActive = false;

// Rest messages for the popup
const restMessages = [
  "⏱ Time for a quick break! Try looking away from the screen for 20 seconds.",
  "🙆 Stretch your arms and shoulders!",
  "👀 Roll your eyes gently to relax eye muscles.",
  "🚶 Take a short walk or stand up for a minute.",
  "💧 Stay hydrated! Grab a glass of water.",
  "🧘 Take 5 deep breaths to relax your mind.",
  "🤸 Do some neck stretches to relieve tension.",
  "☀️ Look outside or at something far away to rest your eyes.",
];

// Check if page is currently visible and active
function updatePageVisibility() {
  const documentVisible = !document.hidden;
  const actuallyActive = documentVisible && windowHasFocus && cursorInWindow;

  if (actuallyActive !== isPageVisible) {
    isPageVisible = actuallyActive;

    // Send message to background script
    chrome.runtime.sendMessage({
      type: "PAGE_VISIBILITY_CHANGED",
      visible: actuallyActive,
      timestamp: Date.now(),
      reason: getVisibilityReason(
        documentVisible,
        windowHasFocus,
        cursorInWindow
      ),
    });

    console.log(
      `Page activity changed: ${
        actuallyActive ? "active" : "inactive"
      } - ${getVisibilityReason(
        documentVisible,
        windowHasFocus,
        cursorInWindow
      )}`
    );
  }
}

// Get reason for visibility change
function getVisibilityReason(docVisible, winFocus, cursorIn) {
  if (!docVisible) return "document_hidden";
  if (!winFocus) return "window_blur";
  if (!cursorIn) return "cursor_outside";
  return "active";
}

// Track user activity (mouse movement, clicks, keyboard, scroll)
function trackUserActivity(event) {
  lastActivityTime = Date.now();

  // Update cursor position tracking for better accuracy
  if (event.type === "mousemove") {
    cursorInWindow = true;
    updatePageVisibility();
  }
}

// Track window focus changes
function handleWindowFocus() {
  windowHasFocus = true;
  updatePageVisibility();
}

function handleWindowBlur() {
  windowHasFocus = false;
  updatePageVisibility();
}

// Track cursor entering/leaving window
function handleMouseEnter() {
  cursorInWindow = true;
  updatePageVisibility();
}

function handleMouseLeave() {
  cursorInWindow = false;
  updatePageVisibility();
}

// Initialize tracking
document.addEventListener("visibilitychange", updatePageVisibility);

// Window focus/blur events
window.addEventListener("focus", handleWindowFocus);
window.addEventListener("blur", handleWindowBlur);

// Mouse enter/leave events for cursor tracking
document.addEventListener("mouseenter", handleMouseEnter);
document.addEventListener("mouseleave", handleMouseLeave);

// Track user interactions for activity detection
document.addEventListener("mousemove", trackUserActivity, { passive: true });
document.addEventListener("click", trackUserActivity, { passive: true });
document.addEventListener("keypress", trackUserActivity, { passive: true });
document.addEventListener("scroll", trackUserActivity, { passive: true });

// Video-specific events for better YouTube tracking
document.addEventListener("play", trackUserActivity, {
  passive: true,
  capture: true,
});
document.addEventListener("pause", trackUserActivity, {
  passive: true,
  capture: true,
});
document.addEventListener("seeked", trackUserActivity, {
  passive: true,
  capture: true,
});

// Initial state setup
updatePageVisibility();

// Enhanced activity check (every 15 seconds for better accuracy)
setInterval(() => {
  const timeSinceActivity = Date.now() - lastActivityTime;
  const isUserActive = timeSinceActivity < 60000; // Increased to 60 seconds for video watching

  // More sophisticated activity detection
  const documentVisible = !document.hidden;
  const shouldBeActive =
    documentVisible && windowHasFocus && cursorInWindow && isUserActive;

  if (shouldBeActive !== isPageVisible) {
    chrome.runtime.sendMessage({
      type: "PAGE_VISIBILITY_CHANGED",
      visible: shouldBeActive,
      timestamp: Date.now(),
      reason: shouldBeActive
        ? "periodic_check_active"
        : "periodic_check_inactive",
    });
    isPageVisible = shouldBeActive;
  }
}, 15000);

// Create rest reminder side popup
function createRestReminderPopup() {
  if (restReminderPopup) return; // Already exists

  restReminderPopup = document.createElement("div");
  restReminderPopup.id = "activity-tracker-rest-reminder";
  restReminderPopup.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 280px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    transform: translateX(100%);
    transition: transform 0.3s ease-out;
    overflow: hidden;
  `;

  restReminderPopup.innerHTML = `
    <div style="padding: 20px;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
        <h3 style="margin: 0; font-size: 16px; font-weight: 600;">🕒 Rest Reminder</h3>
        <button id="rest-reminder-close" style="background: none; border: none; color: white; font-size: 18px; cursor: pointer; padding: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; opacity: 0.7;" title="Minimize">−</button>
      </div>
      
      <div id="countdown-display" style="text-align: center; margin-bottom: 15px;">
        <div style="font-size: 32px; font-weight: bold; margin-bottom: 5px;" id="countdown-time">30:00</div>
        <div style="font-size: 12px; opacity: 0.8;">until your next break</div>
      </div>
      
      <div id="break-message" style="display: none; text-align: center; padding: 10px 0;">
        <div style="font-size: 24px; margin-bottom: 10px;">🎉</div>
        <div style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">Time for a break!</div>
        <div id="encouragement-text" style="font-size: 14px; line-height: 1.4; opacity: 0.9;"></div>
        <button id="break-taken" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 8px 16px; border-radius: 6px; cursor: pointer; margin-top: 15px; font-size: 14px; transition: background 0.2s;">I took a break!</button>
      </div>
      
      <div style="height: 4px; background: rgba(255,255,255,0.2); border-radius: 2px; margin-top: 15px;">
        <div id="progress-bar" style="height: 100%; background: rgba(255,255,255,0.6); border-radius: 2px; width: 0%; transition: width 1s ease;"></div>
      </div>
    </div>
  `;

  document.body.appendChild(restReminderPopup);

  // Show popup with animation
  setTimeout(() => {
    restReminderPopup.style.transform = "translateX(0)";
  }, 100);

  // Add event listeners
  setupRestReminderEventListeners();
}

// Setup event listeners for rest reminder popup
function setupRestReminderEventListeners() {
  const closeBtn = document.getElementById("rest-reminder-close");
  const breakTakenBtn = document.getElementById("break-taken");

  if (closeBtn) {
    closeBtn.addEventListener("click", minimizeRestReminder);
  }

  if (breakTakenBtn) {
    breakTakenBtn.addEventListener("click", handleBreakTaken);
  }
}

// Format seconds to MM:SS format
function formatCountdownTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

// Update countdown display
function updateCountdownDisplay() {
  const countdownElement = document.getElementById("countdown-time");
  const progressBar = document.getElementById("progress-bar");

  if (countdownElement) {
    countdownElement.textContent = formatCountdownTime(restTimeRemaining);
  }

  if (progressBar) {
    const totalTime = 30 * 60; // 30 minutes
    const progress = ((totalTime - restTimeRemaining) / totalTime) * 100;
    progressBar.style.width = `${progress}%`;
  }
}

// Show break message when countdown reaches zero
function showBreakMessage() {
  const countdownDisplay = document.getElementById("countdown-display");
  const breakMessage = document.getElementById("break-message");
  const encouragementText = document.getElementById("encouragement-text");

  if (countdownDisplay && breakMessage && encouragementText) {
    countdownDisplay.style.display = "none";
    breakMessage.style.display = "block";

    // Show random encouraging message
    const randomMessage =
      restMessages[Math.floor(Math.random() * restMessages.length)];
    encouragementText.textContent = randomMessage;
  }
}

// Handle break taken button click
function handleBreakTaken() {
  resetRestTimer();
  hideBreakMessage();
}

// Hide break message and show countdown again
function hideBreakMessage() {
  const countdownDisplay = document.getElementById("countdown-display");
  const breakMessage = document.getElementById("break-message");

  if (countdownDisplay && breakMessage) {
    breakMessage.style.display = "none";
    countdownDisplay.style.display = "block";
  }
}

// Reset rest timer
function resetRestTimer() {
  restTimeRemaining = 30 * 60; // Reset to 30 minutes
  updateCountdownDisplay();
}

// Minimize rest reminder (hide but keep running)
function minimizeRestReminder() {
  if (restReminderPopup) {
    restReminderPopup.style.transform = "translateX(calc(100% - 40px))";

    // Add a small indicator
    if (!document.getElementById("rest-reminder-indicator")) {
      const indicator = document.createElement("div");
      indicator.id = "rest-reminder-indicator";
      indicator.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        width: 40px;
        height: 40px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 50%;
        z-index: 999999;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 18px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      `;
      indicator.textContent = "🕒";
      indicator.title = "Rest Timer - Click to expand";
      indicator.addEventListener("click", expandRestReminder);
      document.body.appendChild(indicator);
    }
  }
}

// Expand rest reminder from minimized state
function expandRestReminder() {
  if (restReminderPopup) {
    restReminderPopup.style.transform = "translateX(0)";

    const indicator = document.getElementById("rest-reminder-indicator");
    if (indicator) {
      indicator.remove();
    }
  }
}

// Start the rest timer countdown
function startRestTimer() {
  if (isRestTimerActive) return;

  isRestTimerActive = true;
  createRestReminderPopup();

  countdownInterval = setInterval(() => {
    if (restTimeRemaining > 0) {
      restTimeRemaining--;
      updateCountdownDisplay();
    } else {
      // Time reached zero, show break message
      showBreakMessage();
      // Continue counting but don't reset until user clicks "I took a break"
    }
  }, 1000);
}

// Stop the rest timer
function stopRestTimer() {
  isRestTimerActive = false;

  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }

  if (restReminderPopup) {
    restReminderPopup.remove();
    restReminderPopup = null;
  }

  const indicator = document.getElementById("rest-reminder-indicator");
  if (indicator) {
    indicator.remove();
  }
}

// Handle messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TIME_WARNING") {
    showTimeWarningNotification(message);
  }

  if (message.type === "REDIRECTED") {
    showRedirectionNotification(message);
  }

  if (message.type === "START_REST_TIMER") {
    startRestTimer();
  }

  if (message.type === "STOP_REST_TIMER") {
    stopRestTimer();
  }

  if (message.type === "UPDATE_REST_TIME") {
    restTimeRemaining = message.timeRemaining;
    if (isRestTimerActive) {
      updateCountdownDisplay();
    }
  }
});

// Show time warning notification
function showTimeWarningNotification(data) {
  // Remove existing warning if any
  const existingWarning = document.getElementById("activity-tracker-warning");
  if (existingWarning) {
    existingWarning.remove();
  }

  // Create warning notification
  const warning = document.createElement("div");
  warning.id = "activity-tracker-warning";
  warning.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #ff6b6b, #ffa726);
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    max-width: 300px;
    animation: slideIn 0.3s ease-out;
  `;

  warning.innerHTML = `
    <div style="display: flex; align-items: center; margin-bottom: 8px;">
      <span style="font-size: 18px; margin-right: 8px;">⏰</span>
      <strong>Time Limit Warning</strong>
    </div>
    <div style="margin-bottom: 8px;">
      You have <strong>${data.minutes} minute${
    data.minutes > 1 ? "s" : ""
  }</strong> left on <strong>${data.domain}</strong>
    </div>
    <div style="font-size: 12px; opacity: 0.9;">
      You'll be redirected to: ${new URL(data.redirectTo).hostname}
    </div>
  `;

  // Add animation styles
  const style = document.createElement("style");
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(warning);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (warning.parentNode) {
      warning.style.animation = "slideIn 0.3s ease-out reverse";
      setTimeout(() => warning.remove(), 300);
    }
  }, 5000);
}

// Show redirection notification
function showRedirectionNotification(data) {
  const notification = document.createElement("div");
  notification.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    padding: 30px;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    text-align: center;
    max-width: 400px;
  `;

  notification.innerHTML = `
    <div style="font-size: 24px; margin-bottom: 15px;">🚀</div>
    <h3 style="margin: 0 0 10px 0; font-size: 18px;">Time Limit Reached!</h3>
    <p style="margin: 0 0 15px 0; opacity: 0.9;">
      You've spent enough time on <strong>${data.fromDomain}</strong> today.
    </p>
    <p style="margin: 0; font-size: 14px; opacity: 0.8;">
      Redirecting to a more productive site...
    </p>
  `;

  document.body.appendChild(notification);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

console.log("Activity Tracker content script loaded");

// Initialize rest timer when page loads
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
      startRestTimer();
    }, 1000); // Small delay to ensure page is fully loaded
  });
} else {
  // Page already loaded
  setTimeout(() => {
    startRestTimer();
  }, 1000);
}
