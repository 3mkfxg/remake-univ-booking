/* ============================================================
   Security Module — DevTools prevention & anti-tampering
   ============================================================ */

(function() {
  'use strict';

  // ── Disable right-click context menu ──
  document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    return false;
  });

  // ── Disable keyboard shortcuts ──
  document.addEventListener('keydown', function(e) {
    // F12
    if (e.key === 'F12' || e.keyCode === 123) {
      e.preventDefault();
      return false;
    }
    
    // Ctrl+Shift+I (Inspector)
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.keyCode === 73)) {
      e.preventDefault();
      return false;
    }
    
    // Ctrl+Shift+J (Console)
    if (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j' || e.keyCode === 74)) {
      e.preventDefault();
      return false;
    }
    
    // Ctrl+Shift+C (Element picker)
    if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c' || e.keyCode === 67)) {
      e.preventDefault();
      return false;
    }
    
    // Ctrl+U (View source)
    if (e.ctrlKey && (e.key === 'U' || e.key === 'u' || e.keyCode === 85)) {
      e.preventDefault();
      return false;
    }
    
    // Ctrl+S (Save page)
    if (e.ctrlKey && (e.key === 'S' || e.key === 's' || e.keyCode === 83)) {
      e.preventDefault();
      return false;
    }
  });

  // ── Detect DevTools opening via window size ──
  let devToolsOpen = false;
  const threshold = 160;

  function checkDevTools() {
    const widthDiff = window.outerWidth - window.innerWidth > threshold;
    const heightDiff = window.outerHeight - window.innerHeight > threshold;
    
    if (widthDiff || heightDiff) {
      if (!devToolsOpen) {
        devToolsOpen = true;
        onDevToolsOpen();
      }
    } else {
      devToolsOpen = false;
    }
  }

  function onDevToolsOpen() {
    // Clear console and show warning
    console.clear();
    console.log(
      '%c⛔ تحذير أمني — Security Warning',
      'color: red; font-size: 24px; font-weight: bold;'
    );
    console.log(
      '%cهذا المتصفح مخصص لاستخدام نظام حجز ملاعب جامعة الإسراء فقط.\nأي محاولة للعبث بالنظام ستتم تسجيلها ومتابعتها.',
      'color: #800000; font-size: 14px;'
    );
  }

  setInterval(checkDevTools, 1000);

  // ── Debugger trap ──
  (function antiDebug() {
    setInterval(function() {
      const start = performance.now();
      debugger;
      const end = performance.now();
      if (end - start > 100) {
        // Debugger was paused — devtools likely open
        onDevToolsOpen();
      }
    }, 3000);
  })();

  // ── Disable text selection on protected elements ──
  document.addEventListener('DOMContentLoaded', function() {
    const style = document.createElement('style');
    style.textContent = `
      .no-select,
      .qr-container,
      .verify-card,
      .confirmation-card {
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
      }
    `;
    document.head.appendChild(style);
  });

  // ── Disable drag on images ──
  document.addEventListener('dragstart', function(e) {
    if (e.target.tagName === 'IMG') {
      e.preventDefault();
    }
  });

  // ── Console warning styling ──
  console.clear();
  console.log(
    '%c🏟️ نظام حجز ملاعب جامعة الإسراء',
    'color: #800000; font-size: 18px; font-weight: bold; font-family: Cairo;'
  );
  console.log(
    '%c⚠️ هذا القسم مخصص للمطورين فقط. إذا طلب منك شخص نسخ/لصق شيء هنا، فهذا احتيال.',
    'color: #d32f2f; font-size: 12px;'
  );

})();
