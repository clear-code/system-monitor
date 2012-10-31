pref("extensions.system-monitor@clear-code.com.lifetime.cpu", 1000);
pref("extensions.system-monitor@clear-code.com.lifetime.memory", 1000);
pref("extensions.system-monitor@clear-code.com.lifetime.network", 1000);

// pref("extensions.system-monitor@clear-code.com.defaultTargetToolbar", "...");
pref("extensions.system-monitor@clear-code.com.platform.default.defaultTargetToolbar", "toolbar-menubar,nav-bar,mail-toolbar-menubar2,mail-bar3");
pref("extensions.system-monitor@clear-code.com.platform.Darwin.defaultTargetToolbar", "nav-bar,mail-bar3");

pref("extensions.system-monitor@clear-code.com.cpu-usage.initialShow", false);
pref("extensions.system-monitor@clear-code.com.cpu-usage.size", 48);
pref("extensions.system-monitor@clear-code.com.cpu-usage.interval", 1000);
pref("extensions.system-monitor@clear-code.com.cpu-usage.color.background", "#000000");
pref("extensions.system-monitor@clear-code.com.cpu-usage.color.backgroundStartAlpha", "0.7");
pref("extensions.system-monitor@clear-code.com.cpu-usage.color.backgroundEndAlpha", "0.95");
pref("extensions.system-monitor@clear-code.com.cpu-usage.color.foreground", "#33FF33");
pref("extensions.system-monitor@clear-code.com.cpu-usage.color.foregroundStartAlpha", "0.4");
pref("extensions.system-monitor@clear-code.com.cpu-usage.color.foregroundEndAlpha", "1");
pref("extensions.system-monitor@clear-code.com.cpu-usage.color.foregroundMinAlpha", "0.2");
// style flag
//   1 = bar graph
//   2 = polygonal graph
// extra flags for multiplex values:
//   128 = unified
//   256 = stacked
//   512 = layered
//   1024 = separated
pref("extensions.system-monitor@clear-code.com.cpu-usage.style", 513);

pref("extensions.system-monitor@clear-code.com.memory-usage.initialShow", false);
pref("extensions.system-monitor@clear-code.com.memory-usage.size", 48);
pref("extensions.system-monitor@clear-code.com.memory-usage.interval", 1000);
pref("extensions.system-monitor@clear-code.com.memory-usage.color.background", "#000000");
pref("extensions.system-monitor@clear-code.com.memory-usage.color.backgroundStartAlpha", "0.7");
pref("extensions.system-monitor@clear-code.com.memory-usage.color.backgroundEndAlpha", "0.95");
pref("extensions.system-monitor@clear-code.com.memory-usage.color.foreground", "#33FFFF");
pref("extensions.system-monitor@clear-code.com.memory-usage.color.foregroundStartAlpha", "0.4");
pref("extensions.system-monitor@clear-code.com.memory-usage.color.foregroundEndAlpha", "1");
pref("extensions.system-monitor@clear-code.com.memory-usage.color.foregroundMinAlpha", "0.4");
pref("extensions.system-monitor@clear-code.com.memory-usage.color.self", "#FFCC00");
pref("extensions.system-monitor@clear-code.com.memory-usage.color.selfStartAlpha", "0.6");
pref("extensions.system-monitor@clear-code.com.memory-usage.color.selfEndAlpha", "1");
pref("extensions.system-monitor@clear-code.com.memory-usage.color.selfGlobalAlpha", "1");
pref("extensions.system-monitor@clear-code.com.memory-usage.style", 129);

pref("extensions.system-monitor@clear-code.com.network-usage.initialShow", false);
pref("extensions.system-monitor@clear-code.com.network-usage.size", 48);
pref("extensions.system-monitor@clear-code.com.network-usage.interval", 3000);
pref("extensions.system-monitor@clear-code.com.network-usage.color.background", "#000000");
pref("extensions.system-monitor@clear-code.com.network-usage.color.backgroundStartAlpha", "0.7");
pref("extensions.system-monitor@clear-code.com.network-usage.color.backgroundEndAlpha", "0.95");
pref("extensions.system-monitor@clear-code.com.network-usage.color.foreground", "#FFCC99");
pref("extensions.system-monitor@clear-code.com.network-usage.color.foregroundStartAlpha", "0.4");
pref("extensions.system-monitor@clear-code.com.network-usage.color.foregroundEndAlpha", "1");
pref("extensions.system-monitor@clear-code.com.network-usage.color.foregroundMinAlpha", "0.2");
pref("extensions.system-monitor@clear-code.com.network-usage.color.scalableMaxValue.min", "#FF0000");
pref("extensions.system-monitor@clear-code.com.network-usage.scalableMaxValue.min", 65536); // 64 * 1024 (64kbps)
pref("extensions.system-monitor@clear-code.com.network-usage.logscale", true);
