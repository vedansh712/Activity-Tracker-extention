// Content script for Activity Tracker extension
// Monitors page visibility and user activity

let isPageVisible = true;
let lastActivityTime = Date.now();
let cursorInWindow = true;
let windowHasFocus = true;

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

// Handle messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TIME_WARNING") {
    showTimeWarningNotification(message);
  }

  if (message.type === "REDIRECTED") {
    showRedirectionNotification(message);
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
