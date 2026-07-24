/* =========================================================
   Apple-style Calendar — single-file bundle (no ES modules)
   Works when opened directly via file:// or served over http.
   ========================================================= */
(function () {
  'use strict';

  // =======================================================
  // utils
  // =======================================================
  var MS_DAY = 86400000;
  var WEEKDAYS_ZH = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  var WEEKDAYS_ZH_SHORT = ['日', '一', '二', '三', '四', '五', '六'];
  var MONTHS_ZH = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

  function startOfDay(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function endOfDay(d) { var x = new Date(d); x.setHours(23, 59, 59, 999); return x; }
  function startOfWeek(d, weekStart) {
    weekStart = weekStart || 0;
    var x = startOfDay(d);
    var day = x.getDay();
    var diff = (day - weekStart + 7) % 7;
    x.setDate(x.getDate() - diff);
    return x;
  }
  function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
  function endOfMonth(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999); }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function addMonths(d, n) {
    var x = new Date(d);
    var day = x.getDate();
    x.setDate(1);
    x.setMonth(x.getMonth() + n);
    var dim = daysInMonth(x.getFullYear(), x.getMonth());
    x.setDate(Math.min(day, dim));
    return x;
  }
  function addYears(d, n) { var x = new Date(d); x.setFullYear(x.getFullYear() + n); return x; }
  function daysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
  function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
  function isSameMonth(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth(); }
  function isToday(d) { return isSameDay(d, new Date()); }
  function getISOWeek(date) {
    var d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    var dayNum = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - dayNum + 3);
    var firstThursday = d.getTime();
    d.setUTCMonth(0, 1);
    if (d.getUTCDay() !== 4) d.setUTCMonth(0, 1 + ((4 - d.getUTCDay()) + 7) % 7);
    return 1 + Math.ceil((firstThursday - d.getTime()) / (7 * MS_DAY));
  }
  function pad(n) { return String(n).padStart(2, '0'); }
  function toLocalInput(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function toDateInput(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function fromLocalInput(str) {
    if (!str) return null;
    var parts = str.split('T');
    var datePart = parts[0];
    var timePart = parts[1] || '00:00';
    var dp = datePart.split('-').map(Number);
    var tp = timePart.split(':').map(Number);
    return new Date(dp[0], dp[1] - 1, dp[2], tp[0] || 0, tp[1] || 0);
  }
  function formatTime(d, use24h) {
    var h = d.getHours();
    var m = d.getMinutes();
    if (use24h) return pad(h) + ':' + pad(m);
    var ap = h >= 12 ? '下午' : '上午';
    h = h % 12; if (h === 0) h = 12;
    return ap + h + ':' + pad(m);
  }
  function overlapsDay(evStart, evEnd, day) {
    var s = startOfDay(day).getTime();
    var e = endOfDay(day).getTime();
    return evStart.getTime() <= e && evEnd.getTime() >= s;
  }
  function uid() { return 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function debounce(fn, wait) {
    var t; wait = wait || 200;
    return function () {
      var args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(null, args); }, wait);
    };
  }
  function buildMonthGrid(viewDate, weekStart) {
    var first = startOfMonth(viewDate);
    var gridStart = startOfWeek(first, weekStart || 0);
    var cells = [];
    for (var i = 0; i < 42; i++) cells.push(addDays(gridStart, i));
    return cells;
  }
  function orderedWeekdays(weekStart) {
    var arr = [];
    for (var i = 0; i < 7; i++) arr.push((weekStart + i) % 7);
    return arr;
  }

  // =======================================================
  // lunar (Chinese calendar 1900-2100)
  // =======================================================
  var LUNAR_INFO = [
    0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
    0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
    0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
    0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
    0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
    0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0,
    0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
    0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6,
    0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
    0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x055c0, 0x0ab60, 0x096d5, 0x092e0,
    0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
    0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
    0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
    0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
    0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0,
    0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0,
    0x0a2e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4,
    0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0,
    0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160,
    0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a2d0, 0x0d150, 0x0f252,
    0x0d520
  ];
  var LUNAR_MONTHS = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];
  var LUNAR_DAYS_1 = ['初', '十', '廿', '卅'];
  var LUNAR_DAYS_2 = ['十', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  var HEAVENLY = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  var EARTHLY = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  var ZODIAC = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
  var SOLAR_TERMS = ['小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨', '立夏', '小满', '芒种', '夏至',
    '小暑', '大暑', '立秋', '处暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至'];
  var TERM_INFO = [0, 21208, 42467, 63836, 85337, 107014, 128867, 150921, 173149, 195551, 218072, 240693,
    263343, 285989, 308563, 331033, 353350, 375494, 397447, 419210, 440795, 462224, 483532, 504758];

  function lunarYearDays(y) {
    var sum = 348;
    for (var i = 0x8000; i > 0x8; i >>= 1) sum += (LUNAR_INFO[y - 1900] & i) ? 1 : 0;
    return sum + leapDays(y);
  }
  function leapMonth(y) { return LUNAR_INFO[y - 1900] & 0xf; }
  function leapDays(y) {
    if (leapMonth(y)) return (LUNAR_INFO[y - 1900] & 0x10000) ? 30 : 29;
    return 0;
  }
  function monthDays(y, m) { return (LUNAR_INFO[y - 1900] & (0x10000 >> m)) ? 30 : 29; }
  function startOfDayMs(date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime(); }

  function solarToLunar(date) {
    var baseDate = new Date(1900, 0, 31);
    var offset = Math.floor((startOfDayMs(date) - startOfDayMs(baseDate)) / 86400000);
    var temp = 0, year, month;
    for (year = 1900; year < 2101 && offset > 0; year++) {
      temp = lunarYearDays(year);
      offset -= temp;
    }
    if (offset < 0) { offset += temp; year--; }

    var isLeapYear = leapMonth(year);
    var isLeap = false;
    for (month = 1; month < 13 && offset > 0; month++) {
      if (isLeapYear > 0 && month === isLeapYear + 1 && !isLeap) {
        month--; isLeap = true; temp = leapDays(year);
      } else {
        temp = monthDays(year, month);
      }
      if (isLeap && month === isLeapYear + 1) isLeap = false;
      offset -= temp;
    }
    if (offset === 0 && isLeapYear > 0 && month === isLeapYear + 1) {
      if (isLeap) { isLeap = false; } else { isLeap = true; month--; }
    }
    if (offset < 0) { offset += temp; month--; }

    var day = offset + 1;
    return {
      year: year, month: month, day: day, isLeap: isLeap,
      zodiac: ZODIAC[(year - 4) % 12],
      yearGanZhi: HEAVENLY[(year - 4) % 10] + EARTHLY[(year - 4) % 12],
      monthName: (isLeap ? '闰' : '') + LUNAR_MONTHS[month - 1] + '月',
      dayName: lunarDayName(day)
    };
  }
  function lunarDayName(day) {
    if (day === 10) return '初十';
    if (day === 20) return '二十';
    if (day === 30) return '三十';
    var tens = Math.floor(day / 10);
    var units = day % 10;
    return LUNAR_DAYS_1[tens] + LUNAR_DAYS_2[units];
  }
  function solarTermDay(year, n) {
    var base = new Date(Date.UTC(1900, 0, 6, 2, 5, 0));
    var ms = 31556925974.7 * (year - 1900) + TERM_INFO[n] * 60000;
    var target = new Date(base.getTime() + ms);
    return target.getUTCDate();
  }
  function getSolarTerm(date) {
    var y = date.getFullYear(), d = date.getDate(), m = date.getMonth();
    for (var i = 0; i < 2; i++) {
      var termIndex = m * 2 + i;
      if (solarTermDay(y, termIndex) === d) return SOLAR_TERMS[termIndex];
    }
    return null;
  }
  var SOLAR_FESTIVALS = {
    '1-1': '元旦', '2-14': '情人节', '3-8': '妇女节', '3-12': '植树节', '4-1': '愚人节',
    '5-1': '劳动节', '5-4': '青年节', '6-1': '儿童节', '7-1': '建党节', '8-1': '建军节',
    '9-10': '教师节', '10-1': '国庆节', '12-24': '平安夜', '12-25': '圣诞节'
  };
  var LUNAR_FESTIVALS = {
    '1-1': '春节', '1-15': '元宵节', '2-2': '龙抬头', '5-5': '端午节', '7-7': '七夕',
    '7-15': '中元节', '8-15': '中秋节', '9-9': '重阳节', '12-8': '腊八节'
  };
  function getFestival(date, lunar) {
    var solarKey = (date.getMonth() + 1) + '-' + date.getDate();
    if (SOLAR_FESTIVALS[solarKey]) return SOLAR_FESTIVALS[solarKey];
    if (!lunar.isLeap) {
      var lunarKey = lunar.month + '-' + lunar.day;
      if (LUNAR_FESTIVALS[lunarKey]) return LUNAR_FESTIVALS[lunarKey];
      if (lunar.month === 12) {
        var y = solarToLunar(new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1));
        if (y.month === 1 && y.day === 1) return '除夕';
      }
    }
    return null;
  }
  function getLunarLabel(date) {
    var lunar = solarToLunar(date);
    var festival = getFestival(date, lunar);
    if (festival) return { text: festival, kind: 'festival' };
    var term = getSolarTerm(date);
    if (term) return { text: term, kind: 'term' };
    if (lunar.day === 1) return { text: lunar.monthName, kind: 'month' };
    return { text: lunar.dayName, kind: 'day' };
  }
  function fullLunarString(date) {
    var l = solarToLunar(date);
    return l.yearGanZhi + l.zodiac + '年 ' + l.monthName + l.dayName;
  }
  // Label for a lunar month/day pair, e.g. (8,15) -> "八月十五".
  function lunarLabelMD(m, d) {
    return LUNAR_MONTHS[m - 1] + '月' + lunarDayName(d);
  }
  
  // Convert lunar date to solar date for a given year
  // Returns null if lunar date is invalid for that year
  function lunarToSolar(year, lunarMonth, lunarDay, isLeap) {
    if (year < 1900 || year > 2100) return null;
    var baseDate = new Date(1900, 0, 31);
    var offset = 0;
    
    // Calculate days from 1900 to the target year
    for (var y = 1900; y < year; y++) {
      offset += lunarYearDays(y);
    }
    
    // Add days for months in the target year
    var leap = leapMonth(year);
    for (var m = 1; m < lunarMonth; m++) {
      offset += monthDays(year, m);
      if (m === leap) offset += leapDays(year);
    }
    
    // If this is a leap month
    if (isLeap && leap === lunarMonth) {
      offset += monthDays(year, lunarMonth);
    }
    
    // Add the days
    offset += lunarDay - 1;
    
    var result = new Date(baseDate.getTime() + offset * 86400000);
    return result;
  }
  
  // Find the next occurrence of a lunar date (starting from today)
  function findNextLunarDate(lunarMonth, lunarDay) {
    var today = new Date();
    var thisYear = today.getFullYear();
    
    // Try this year first
    var thisYearDate = lunarToSolar(thisYear, lunarMonth, lunarDay, false);
    if (thisYearDate && thisYearDate >= today) return thisYearDate;
    
    // Try next year
    var nextYearDate = lunarToSolar(thisYear + 1, lunarMonth, lunarDay, false);
    return nextYearDate || new Date(thisYear + 1, 0, 1);
  }

  // =======================================================
  // store (localStorage)
  // =======================================================
  var KEY = 'apple-calendar:v1';
  var DEFAULT_CATEGORIES = [
    { id: 'work', name: '工作', color: '#ff3b30', visible: true },
    { id: 'personal', name: '个人', color: '#007aff', visible: true },
    { id: 'family', name: '家庭', color: '#34c759', visible: true },
    { id: 'travel', name: '旅行', color: '#ff9500', visible: true }
  ];
  var DEFAULT_SETTINGS = { theme: 'auto', weekStart: 0, showLunar: true, showWeekNumbers: false, use24h: false, showHolidays: true };
  var listeners = [];
  var state;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function loadStore() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        var cats = (parsed.categories && parsed.categories.length) ? parsed.categories : clone(DEFAULT_CATEGORIES);
        var st = Object.assign({}, DEFAULT_SETTINGS, parsed.settings || {});
        return { events: parsed.events || [], categories: cats, settings: st, holidays: parsed.holidays || {}, specialDays: parsed.specialDays || [] };
      }
    } catch (e) { /* ignore, fall through to seed */ }
    return seed();
  }
  function seed() {
    var now = new Date();
    function at(dayOffset, h, m) {
      var d = addDays(startOfDay(now), dayOffset);
      d.setHours(h, m || 0, 0, 0);
      return d.toISOString();
    }
    return {
      events: [
        { id: uid(), title: '欢迎使用日历 👋', location: '', notes: '双击任意日期即可创建事件。', categoryId: 'personal', start: at(0, 10), end: at(0, 11), allDay: false, repeat: 'none', alert: 'none' },
        { id: uid(), title: '团队周会', location: '会议室 A', notes: '', categoryId: 'work', start: at(1, 14), end: at(1, 15), allDay: false, repeat: 'weekly', alert: '15' },
        { id: uid(), title: '生日', location: '', notes: '', categoryId: 'family', start: at(3, 0), end: at(3, 0), allDay: true, repeat: 'yearly', alert: '1440' }
      ],
      categories: clone(DEFAULT_CATEGORIES),
      settings: Object.assign({}, DEFAULT_SETTINGS),
      holidays: {},
      specialDays: [
        { id: uid(), name: '示例·纪念日', emoji: '🎉', month: now.getMonth() + 1, day: now.getDate(), yearly: true, color: '#ff2d55' }
      ]
    };
  }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode / file:// quota */ }
    listeners.forEach(function (fn) { fn(state); });
  }
  function subscribe(fn) { listeners.push(fn); }

  // UI/view state (current view + date + scroll target) — kept separate from data
  // so saving it never triggers a data re-render.
  var UIKEY = 'apple-calendar:ui';
  function loadUI() {
    try { var raw = localStorage.getItem(UIKEY); if (raw) return JSON.parse(raw); } catch (e) {}
    return null;
  }
  function saveUI(ui) {
    try { localStorage.setItem(UIKEY, JSON.stringify(ui)); } catch (e) {}
  }

  function getSettings() { return Object.assign({}, state.settings); }
  function updateSettings(patch) { state.settings = Object.assign({}, state.settings, patch); persist(); }

  function getCategories() { return state.categories.map(function (c) { return Object.assign({}, c); }); }
  function getCategory(id) { return state.categories.filter(function (c) { return c.id === id; })[0]; }
  function addCategory(name, color) {
    var cat = { id: uid(), name: name, color: color, visible: true };
    state.categories.push(cat); persist(); return cat;
  }
  function toggleCategory(id) {
    var c = getCategory(id); if (c) c.visible = !c.visible; persist();
  }
  function deleteCategory(id) {
    state.categories = state.categories.filter(function (c) { return c.id !== id; });
    state.events = state.events.filter(function (e) { return e.categoryId !== id; });
    persist();
  }

  function getRawEvents() { return state.events.map(function (e) { return Object.assign({}, e); }); }
  function addEvent(ev) {
    var event = Object.assign({ id: uid(), repeat: 'none', alert: 'none' }, ev);
    state.events.push(event); persist(); return event;
  }
  function updateEvent(id, patch) {
    var e = state.events.filter(function (x) { return x.id === id; })[0];
    if (e) Object.assign(e, patch); persist();
  }
  function deleteEvent(id) {
    state.events = state.events.filter(function (e) { return e.id !== id; }); persist();
  }
  function importEvents(events) {
    events.forEach(function (ev) {
      if (!getCategory(ev.categoryId)) ev.categoryId = 'personal';
      ev.id = ev.id || uid();
    });
    state.events = state.events.concat(events); persist();
  }
  function clearAll() { state = seed(); persist(); }

  // ---- Special days (custom festivals / anniversaries) ----
  function getSpecialDays() {
    return (state.specialDays || []).map(function (s) { return Object.assign({}, s); });
  }
  function addSpecialDay(obj) {
    var s = Object.assign({ id: uid(), name: '', emoji: '', yearly: true, color: '#ff2d55' }, obj);
    if (!state.specialDays) state.specialDays = [];
    state.specialDays.push(s); persist(); return s;
  }
  function updateSpecialDay(id, patch) {
    var s = (state.specialDays || []).filter(function (x) { return x.id === id; })[0];
    if (s) Object.assign(s, patch); persist();
  }
  function deleteSpecialDay(id) {
    state.specialDays = (state.specialDays || []).filter(function (x) { return x.id !== id; }); persist();
  }
  function getSpecialDaysForDate(date) {
    var m = date.getMonth() + 1, d = date.getDate(), y = date.getFullYear();
    var lunarCache = null;
    return (state.specialDays || []).filter(function (s) {
      if (s.calendar === 'lunar') {
        if (!lunarCache) lunarCache = solarToLunar(date);
        return lunarCache.month === s.lunarMonth && lunarCache.day === s.lunarDay && !lunarCache.isLeap;
      }
      return s.month === m && s.day === d && (s.yearly || s.year === y);
    });
  }

  // ---- Holidays (online API) ----
  function getHoliday(date) {
    if (!state.holidays) return null;
    return state.holidays[toDateInput(date)] || null;
  }
  function setHolidays(map) {
    state.holidays = Object.assign({}, state.holidays || {}, map);
    persist();
  }
  function getHolidayYears() {
    var years = {};
    Object.keys(state.holidays || {}).forEach(function (k) { years[k.slice(0, 4)] = true; });
    return Object.keys(years);
  }
  // Fetch mainland-China statutory holidays for a year.
  // Data source: NateScarlet/holiday-cn (public, CORS-enabled). Rephrased for compliance.
  function fetchHolidays(year) {
    var sources = [
      'https://cdn.jsdelivr.net/gh/NateScarlet/holiday-cn@master/' + year + '.json',
      'https://raw.githubusercontent.com/NateScarlet/holiday-cn/master/' + year + '.json'
    ];
    function tryNext(i) {
      if (i >= sources.length) return Promise.reject(new Error('all sources failed'));
      return fetch(sources[i], { mode: 'cors' })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .catch(function () { return tryNext(i + 1); });
    }
    return tryNext(0).then(function (data) {
      var map = {};
      (data.days || []).forEach(function (d) {
        map[d.date] = { name: d.name, off: !!d.isOffDay };
      });
      setHolidays(map);
      return (data.days || []).length;
    });
  }

  function stepOccurrence(date, repeat) {
    switch (repeat) {
      case 'daily': return addDays(date, 1);
      case 'weekly': return addDays(date, 7);
      case 'monthly': return addMonths(date, 1);
      case 'yearly': return addYears(date, 1);
      default: return addDays(date, 1);
    }
  }
  function makeInstance(ev, start, end, isRecurring) {
    var cat = getCategory(ev.categoryId);
    return Object.assign({}, ev, {
      start: start, end: end, isRecurring: !!isRecurring,
      color: (cat && cat.color) || '#007aff',
      categoryName: (cat && cat.name) || ''
    });
  }
  function getEventsInRange(rangeStart, rangeEnd) {
    var visible = {};
    state.categories.forEach(function (c) { if (c.visible) visible[c.id] = true; });
    var results = [];
    state.events.forEach(function (ev) {
      if (!visible[ev.categoryId]) return;
      var start = new Date(ev.start);
      var end = new Date(ev.end);
      var durationMs = Math.max(0, end - start);

      if (!ev.repeat || ev.repeat === 'none') {
        if (end >= rangeStart && start <= rangeEnd) results.push(makeInstance(ev, start, end, false));
        return;
      }
      var occStart = new Date(start);
      var guard = 0;
      while (occStart < rangeStart && guard < 4000) {
        var next = stepOccurrence(occStart, ev.repeat);
        if (next <= occStart) break;
        if (new Date(occStart.getTime() + durationMs) >= rangeStart) break;
        occStart = next; guard++;
      }
      guard = 0;
      while (occStart <= rangeEnd && guard < 1000) {
        var occEnd = new Date(occStart.getTime() + durationMs);
        if (occEnd >= rangeStart) results.push(makeInstance(ev, new Date(occStart), occEnd, true));
        occStart = stepOccurrence(occStart, ev.repeat); guard++;
      }
    });
    return results.sort(function (a, b) {
      if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
      return a.start - b.start;
    });
  }
  function searchEvents(query) {
    var q = query.trim().toLowerCase();
    if (!q) return [];
    return state.events.filter(function (e) {
      return e.title.toLowerCase().indexOf(q) !== -1 ||
        (e.location || '').toLowerCase().indexOf(q) !== -1 ||
        (e.notes || '').toLowerCase().indexOf(q) !== -1;
    }).map(function (e) {
      return makeInstance(e, new Date(e.start), new Date(e.end), false);
    }).sort(function (a, b) { return a.start - b.start; }).slice(0, 30);
  }

  var store = {
    subscribe: subscribe, getSettings: getSettings, updateSettings: updateSettings,
    getCategories: getCategories, getCategory: getCategory, addCategory: addCategory,
    toggleCategory: toggleCategory, deleteCategory: deleteCategory,
    getRawEvents: getRawEvents, addEvent: addEvent, updateEvent: updateEvent,
    deleteEvent: deleteEvent, importEvents: importEvents, clearAll: clearAll,
    getEventsInRange: getEventsInRange, searchEvents: searchEvents,
    getHoliday: getHoliday, setHolidays: setHolidays, fetchHolidays: fetchHolidays,
    getHolidayYears: getHolidayYears,
    loadUI: loadUI, saveUI: saveUI,
    getSpecialDays: getSpecialDays, addSpecialDay: addSpecialDay,
    updateSpecialDay: updateSpecialDay, deleteSpecialDay: deleteSpecialDay,
    getSpecialDaysForDate: getSpecialDaysForDate
  };

  // =======================================================
  // ICS import / export
  // =======================================================
  function toICSDate(d, allDay) {
    if (allDay) return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
    var u = new Date(d);
    return u.getUTCFullYear() + pad(u.getUTCMonth() + 1) + pad(u.getUTCDate()) + 'T' +
      pad(u.getUTCHours()) + pad(u.getUTCMinutes()) + pad(u.getUTCSeconds()) + 'Z';
  }
  function escICS(s) {
    return (s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  }
  function unescICS(s) {
    return (s || '').replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
  }
  var RRULE = { daily: 'DAILY', weekly: 'WEEKLY', monthly: 'MONTHLY', yearly: 'YEARLY' };
  var RRULE_REV = { DAILY: 'daily', WEEKLY: 'weekly', MONTHLY: 'monthly', YEARLY: 'yearly' };

  function exportICS(events, categories) {
    function catName(id) { var c = categories.filter(function (x) { return x.id === id; })[0]; return c ? c.name : ''; }
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//AppleStyleCalendar//ZH//CN', 'CALSCALE:GREGORIAN'];
    events.forEach(function (ev) {
      var start = new Date(ev.start), end = new Date(ev.end);
      lines.push('BEGIN:VEVENT');
      lines.push('UID:' + ev.id + '@apple-calendar');
      lines.push('DTSTAMP:' + toICSDate(new Date(), false));
      if (ev.allDay) {
        lines.push('DTSTART;VALUE=DATE:' + toICSDate(start, true));
        var dayAfter = new Date(end); dayAfter.setDate(dayAfter.getDate() + 1);
        lines.push('DTEND;VALUE=DATE:' + toICSDate(dayAfter, true));
      } else {
        lines.push('DTSTART:' + toICSDate(start, false));
        lines.push('DTEND:' + toICSDate(end, false));
      }
      lines.push('SUMMARY:' + escICS(ev.title || ''));
      if (ev.location) lines.push('LOCATION:' + escICS(ev.location));
      if (ev.notes) lines.push('DESCRIPTION:' + escICS(ev.notes));
      if (catName(ev.categoryId)) lines.push('CATEGORIES:' + escICS(catName(ev.categoryId)));
      if (ev.repeat && ev.repeat !== 'none' && RRULE[ev.repeat]) lines.push('RRULE:FREQ=' + RRULE[ev.repeat]);
      lines.push('END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }
  function parseICSDate(v) {
    var m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?(Z)?$/.exec(v.trim());
    if (!m) return new Date(v);
    var y = +m[1], mo = +m[2], d = +m[3], hh = m[4], mm = m[5], ss = m[6], z = m[7];
    if (hh == null) return new Date(y, mo - 1, d);
    if (z) return new Date(Date.UTC(y, mo - 1, d, +hh, +mm, +ss));
    return new Date(y, mo - 1, d, +hh, +mm, +ss);
  }
  function parseICS(text) {
    var raw = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    var unfolded = raw.replace(/\n[ \t]/g, '');
    var lines = unfolded.split('\n');
    var events = [], cur = null;
    lines.forEach(function (line) {
      if (line === 'BEGIN:VEVENT') { cur = {}; return; }
      if (line === 'END:VEVENT') { if (cur && cur.start) events.push(finalizeICS(cur)); cur = null; return; }
      if (!cur) return;
      var idx = line.indexOf(':');
      if (idx === -1) return;
      var keyPart = line.slice(0, idx);
      var value = line.slice(idx + 1);
      var segs = keyPart.split(';');
      var key = segs[0];
      var params = segs.slice(1);
      var isDate = params.some(function (p) { return p.toUpperCase().indexOf('VALUE=DATE') !== -1 && p.toUpperCase().indexOf('DATE-TIME') === -1; });
      switch (key.toUpperCase()) {
        case 'SUMMARY': cur.title = unescICS(value); break;
        case 'LOCATION': cur.location = unescICS(value); break;
        case 'DESCRIPTION': cur.notes = unescICS(value); break;
        case 'DTSTART': cur.start = parseICSDate(value); cur.allDay = isDate; break;
        case 'DTEND': cur.end = parseICSDate(value); break;
        case 'CATEGORIES': cur.categoryName = unescICS(value); break;
        case 'RRULE':
          var mm = /FREQ=([A-Z]+)/.exec(value);
          cur.repeat = mm ? (RRULE_REV[mm[1]] || 'none') : 'none';
          break;
      }
    });
    return events;
  }
  function finalizeICS(cur) {
    var end = cur.end || new Date(cur.start.getTime() + 3600000);
    if (cur.allDay) {
      end = new Date(end.getTime() - 86400000);
      if (end < cur.start) end = new Date(cur.start);
    }
    return {
      title: cur.title || '（无标题）', location: cur.location || '', notes: cur.notes || '',
      start: cur.start.toISOString(), end: end.toISOString(), allDay: !!cur.allDay,
      repeat: cur.repeat || 'none', alert: 'none', categoryId: 'personal'
    };
  }
  function downloadICS(content, filename) {
    var blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename || 'calendar.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // =======================================================
  // DOM helper
  // =======================================================
  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }

  // =======================================================
  // views
  // =======================================================
  // Build one day cell (shared by continuous month view).
  function buildDayCell(date, focusMonthDate, settings, events, handlers) {
    var cell = el('div', 'day-cell');
    cell.dataset.date = date.toISOString();
    if (focusMonthDate && !isSameMonth(date, focusMonthDate)) cell.classList.add('is-muted');
    if (isToday(date)) cell.classList.add('is-today');
    var dw = date.getDay();
    if (dw === 0 || dw === 6) cell.classList.add('is-weekend');

    var head = el('div', 'day-cell__head');
    head.appendChild(el('span', 'day-cell__num', String(date.getDate())));
    var specials = getSpecialDaysForDate(date);
    if (specials.length) {
      var sp = specials[0];
      var slab = el('span', 'day-cell__lunar day-cell__special', (sp.emoji ? sp.emoji + ' ' : '') + sp.name);
      slab.style.color = sp.color;
      slab.title = specials.map(function (s) { return s.name; }).join('、');
      head.appendChild(slab);
    } else if (settings.showLunar) {
      var lbl = getLunarLabel(date);
      head.appendChild(el('span', 'day-cell__lunar is-' + lbl.kind, lbl.text));
    }
    if (settings.showHolidays) {
      var hol = getHoliday(date);
      if (hol) {
        var badge = el('span', 'day-cell__badge ' + (hol.off ? 'is-off' : 'is-work'), hol.off ? '休' : '班');
        badge.title = hol.name;
        head.appendChild(badge);
      }
    }
    cell.appendChild(head);

    var evWrap = el('div', 'day-cell__events');
    var dayEvents = events.filter(function (e) { return overlapsDay(e.start, e.end, date); });
    var MAX = 3;
    dayEvents.slice(0, MAX).forEach(function (ev) { evWrap.appendChild(monthChip(ev, settings, handlers)); });
    if (dayEvents.length > MAX) evWrap.appendChild(el('div', 'day-cell__more', '还有 ' + (dayEvents.length - MAX) + ' 项'));
    cell.appendChild(evWrap);

    (function (d) {
      cell.addEventListener('click', function () { handlers.onDayClick(d); });
      cell.addEventListener('dblclick', function (e) { e.stopPropagation(); handlers.onDayCreate(d); });
    })(date);
    return cell;
  }

  // Continuous, infinitely-scrolling calendar of week rows (Apple-style).
  // Every date appears exactly once — no duplicated days across month edges.
  function createMonthScroller(settings, handlers, focusDate) {
    var root = el('div', 'month-cont');
    var scroll = el('div', 'month-scroll');
    root.appendChild(scroll);

    var hasWeekNum = !!settings.showWeekNumbers;

    // weekday header (sticky inside the scroll so columns align with day cells)
    var dow = el('div', 'month__dow');
    if (hasWeekNum) { dow.classList.add('has-weeknum'); dow.appendChild(el('div', 'month__dow-spacer')); }
    orderedWeekdays(settings.weekStart).forEach(function (d) {
      var c = el('div', 'month__dow-cell', WEEKDAYS_ZH_SHORT[d]);
      if (d === 0 || d === 6) c.classList.add('is-weekend');
      dow.appendChild(c);
    });
    scroll.appendChild(dow);

    var grid = el('div', 'weeks-grid');
    if (hasWeekNum) grid.classList.add('has-weeknum');
    scroll.appendChild(grid);

    var weekStarts = [];          // Date[] of week-start dates currently in the grid
    var currentFocusKey = null;

    function mk(y, m) { return y + '_' + m; }
    function dowHeight() { return dow.offsetHeight || 40; }

    function buildWeek(frag, weekStart) {
      var events = getEventsInRange(startOfDay(weekStart), endOfDay(addDays(weekStart, 6)));
      if (hasWeekNum) frag.appendChild(el('div', 'week-num', String(getISOWeek(weekStart))));
      for (var i = 0; i < 7; i++) {
        var date = addDays(weekStart, i);
        var cell = buildDayCell(date, null, settings, events, handlers);
        cell.dataset.mk = mk(date.getFullYear(), date.getMonth());
        if (date.getDate() === 1) {
          cell.classList.add('is-month-first');
          var head = cell.querySelector('.day-cell__head');
          var tag = el('span', 'day-cell__month', (date.getMonth() === 0 ? date.getFullYear() + '年 ' : '') + MONTHS_ZH[date.getMonth()]);
          head.insertBefore(tag, head.firstChild);
        }
        frag.appendChild(cell);
      }
    }

    function rebuildAround(centerDate, monthsEachSide) {
      grid.replaceChildren();
      weekStarts = [];
      var firstMonth = startOfMonth(addMonths(centerDate, -monthsEachSide));
      var lastEnd = endOfMonth(addMonths(centerDate, monthsEachSide));
      var ws = startOfWeek(firstMonth, settings.weekStart);
      var frag = document.createDocumentFragment();
      while (ws <= lastEnd) {
        buildWeek(frag, ws);
        weekStarts.push(ws);
        ws = addDays(ws, 7);
      }
      grid.appendChild(frag);
    }
    function extendDown(n) {
      var frag = document.createDocumentFragment();
      var ws = addDays(weekStarts[weekStarts.length - 1], 7);
      for (var i = 0; i < n; i++) { buildWeek(frag, ws); weekStarts.push(ws); ws = addDays(ws, 7); }
      grid.appendChild(frag);
    }
    function extendUp(n) {
      var prev = scroll.scrollTop;
      var beforeH = grid.offsetHeight;
      var frag = document.createDocumentFragment();
      var starts = [];
      var ws = addDays(weekStarts[0], -7 * n);
      for (var i = 0; i < n; i++) { buildWeek(frag, ws); starts.push(ws); ws = addDays(ws, 7); }
      grid.insertBefore(frag, grid.firstChild);
      weekStarts = starts.concat(weekStarts);
      scroll.scrollTop = prev + (grid.offsetHeight - beforeH);
    }
    function findFirst(key) { return grid.querySelector('.is-month-first[data-mk="' + key + '"]'); }

    function applyEmphasis(focusKey) {
      var cells = grid.querySelectorAll('.day-cell');
      for (var i = 0; i < cells.length; i++) {
        if (cells[i].dataset.mk === focusKey) cells[i].classList.remove('is-muted');
        else cells[i].classList.add('is-muted');
      }
    }
    function scrollToMonth(date, smooth) {
      var monthStart = startOfMonth(date);
      var key = mk(monthStart.getFullYear(), monthStart.getMonth());
      var cell = findFirst(key);
      if (!cell) { rebuildAround(monthStart, 8); cell = findFirst(key); }
      if (cell) scroll.scrollTo({ top: Math.max(0, cell.offsetTop - dowHeight()), behavior: smooth ? 'smooth' : 'auto' });
      updateFocus();
    }
    // The focused month is whichever month occupies the most visible cells,
    // so emphasis switches as soon as a month dominates the viewport (not only
    // when its first row is scrolled to the very top).
    function updateFocus() {
      var cells = grid.querySelectorAll('.day-cell');
      var top = scroll.scrollTop + dowHeight();
      var bottom = scroll.scrollTop + scroll.clientHeight;
      var counts = {}, order = [];
      for (var i = 0; i < cells.length; i++) {
        var c = cells[i];
        var ct = c.offsetTop, cb = ct + c.offsetHeight;
        if (cb <= top) continue;      // above the visible area
        if (ct >= bottom) break;      // below it (remaining cells are lower)
        var k = c.dataset.mk;
        if (!k) continue;
        if (counts[k] === undefined) { counts[k] = 0; order.push(k); }
        counts[k]++;
      }
      var best = null, bestN = -1;
      for (var j = 0; j < order.length; j++) {
        if (counts[order[j]] > bestN) { bestN = counts[order[j]]; best = order[j]; }
      }
      if (best && best !== currentFocusKey) {
        currentFocusKey = best;
        applyEmphasis(best);
        var p = best.split('_');
        handlers.onFocusMonth(new Date(Number(p[0]), Number(p[1]), 1));
      }
    }

    var scheduled = false;
    scroll.addEventListener('scroll', function () {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(function () {
        scheduled = false;
        updateFocus();
        if (scroll.scrollTop < 600) extendUp(6);
        if (scroll.scrollTop + scroll.clientHeight > scroll.scrollHeight - 600) extendDown(6);
      });
    });

    rebuildAround(startOfMonth(focusDate), 6);

    return {
      root: root,
      scrollToMonth: scrollToMonth,
      focusedMonth: function () {
        if (!currentFocusKey) return startOfMonth(focusDate);
        var p = currentFocusKey.split('_');
        return new Date(Number(p[0]), Number(p[1]), 1);
      }
    };
  }

  function monthChip(ev, settings, handlers) {
    var chip = el('div', 'chip ' + (ev.allDay ? 'chip--allday' : 'chip--timed'));
    if (ev.allDay) {
      chip.style.background = ev.color;
    } else {
      var dot = el('span', 'chip__dot'); dot.style.background = ev.color; chip.appendChild(dot);
      chip.appendChild(el('span', 'chip__time', formatTime(ev.start, settings.use24h)));
    }
    chip.appendChild(el('span', 'chip__title', ev.title || '（无标题）'));
    chip.addEventListener('click', function (e) { e.stopPropagation(); handlers.onEventClick(ev); });
    return chip;
  }

  function renderTimeGrid(container, viewDate, settings, handlers, dates) {
    var use24h = settings.use24h;
    var cols = dates.length;
    var colTemplate = '56px repeat(' + cols + ', 1fr)';
    var rangeStart = startOfDay(dates[0]);
    var rangeEnd = endOfDay(dates[dates.length - 1]);
    var allEvents = getEventsInRange(rangeStart, rangeEnd);

    var root = el('div', 'timegrid');
    var scroll = el('div', 'timegrid__scroll');

    var header = el('div', 'timegrid__header');
    header.style.gridTemplateColumns = colTemplate;
    header.appendChild(el('div', 'timegrid__corner'));
    dates.forEach(function (d) {
      var h = el('div', 'tg-dayhead');
      if (isToday(d)) h.classList.add('is-today');
      h.appendChild(el('div', 'tg-dayhead__dow', WEEKDAYS_ZH_SHORT[d.getDay()]));
      h.appendChild(el('div', 'tg-dayhead__num', String(d.getDate())));
      var sps = getSpecialDaysForDate(d);
      if (sps.length) {
        var sl = el('div', 'tg-dayhead__lunar', (sps[0].emoji ? sps[0].emoji + ' ' : '') + sps[0].name);
        sl.style.color = sps[0].color;
        h.appendChild(sl);
      } else if (settings.showLunar) {
        h.appendChild(el('div', 'tg-dayhead__lunar', getLunarLabel(d).text));
      }
      if (settings.showHolidays) {
        var hd = getHoliday(d);
        if (hd) { var hb = el('span', 'tg-dayhead__badge ' + (hd.off ? 'is-off' : 'is-work'), hd.off ? '休' : '班'); hb.title = hd.name; h.appendChild(hb); }
      }
      h.addEventListener('click', function () { handlers.onDayHeadClick(d); });
      header.appendChild(h);
    });
    scroll.appendChild(header);

    var alldayEvents = allEvents.filter(function (e) { return e.allDay; });
    if (alldayEvents.length) {
      var row = el('div', 'timegrid__allday-row');
      row.style.gridTemplateColumns = colTemplate;
      row.appendChild(el('div', 'tg-allday-labelcol', '全天'));
      dates.forEach(function (d) {
        var cell = el('div', 'tg-allday-cell');
        alldayEvents.filter(function (e) { return overlapsDay(e.start, e.end, d); }).forEach(function (ev) {
          var chip = el('div', 'chip chip--allday');
          chip.style.background = ev.color;
          chip.appendChild(el('span', 'chip__title', ev.title || '（无标题）'));
          chip.addEventListener('click', function (e) { e.stopPropagation(); handlers.onEventClick(ev); });
          cell.appendChild(chip);
        });
        row.appendChild(cell);
      });
      scroll.appendChild(row);
    }

    var body = el('div', 'timegrid__body');
    body.style.gridTemplateColumns = colTemplate;

    var hoursCol = el('div', 'tg-hours');
    for (var h = 0; h < 24; h++) hoursCol.appendChild(el('div', 'tg-hour-label', hourLabel(h, use24h)));
    body.appendChild(hoursCol);

    var HOUR_H = 52;
    var timed = allEvents.filter(function (e) { return !e.allDay; });

    dates.forEach(function (d) {
      var col = el('div', 'tg-col');
      var dw = d.getDay();
      if (dw === 0 || dw === 6) col.classList.add('is-weekend');
      for (var hh = 0; hh < 24; hh++) col.appendChild(el('div', 'tg-hourline'));

      col.addEventListener('dblclick', function (e) {
        var rect = col.getBoundingClientRect();
        var hour = Math.floor((e.clientY - rect.top) / HOUR_H);
        var start = new Date(d); start.setHours(Math.max(0, Math.min(23, hour)), 0, 0, 0);
        handlers.onTimeCreate(start);
      });

      var dayEvents = timed.filter(function (e) { return overlapsDay(e.start, e.end, d); })
        .map(function (e) { return clampToDay(e, d); });
      layoutOverlaps(dayEvents).forEach(function (ev) { col.appendChild(timedEvent(ev, HOUR_H, use24h, handlers)); });

      if (isToday(d)) {
        var now = new Date();
        var top = (now.getHours() + now.getMinutes() / 60) * HOUR_H;
        var line = el('div', 'now-line'); line.style.top = top + 'px'; col.appendChild(line);
      }
      body.appendChild(col);
    });

    scroll.appendChild(body);
    root.appendChild(scroll);
    container.replaceChildren(root);

    requestAnimationFrame(function () {
      var now = new Date();
      var focusHour = dates.some(isToday) ? Math.max(0, now.getHours() - 1) : 7;
      var headerH = header.offsetHeight || 0;
      scroll.scrollTop = Math.max(0, (body.offsetTop - headerH) + focusHour * HOUR_H);
    });
  }
  function clampToDay(ev, day) {
    var s = new Date(Math.max(ev.start, startOfDay(day)));
    var e = new Date(Math.min(ev.end, endOfDay(day)));
    return Object.assign({}, ev, { dispStart: s, dispEnd: e });
  }
  function timedEvent(ev, HOUR_H, use24h, handlers) {
    var startMin = ev.dispStart.getHours() * 60 + ev.dispStart.getMinutes();
    var endMin = ev.dispEnd.getHours() * 60 + ev.dispEnd.getMinutes();
    if (endMin <= startMin) endMin = startMin + 30;
    var top = (startMin / 60) * HOUR_H;
    var height = Math.max(18, ((endMin - startMin) / 60) * HOUR_H - 2);
    var node = el('div', 'tg-event');
    node.style.top = top + 'px';
    node.style.height = height + 'px';
    node.style.background = ev.color;
    node.style.borderLeftColor = 'rgba(255,255,255,0.65)';
    if (ev._cols > 1) {
      var w = 100 / ev._cols;
      node.style.left = 'calc(' + (w * ev._col) + '% + 2px)';
      node.style.right = 'auto';
      node.style.width = 'calc(' + w + '% - 4px)';
    }
    node.appendChild(el('div', 'tg-event__title', ev.title || '（无标题）'));
    if (height > 30) node.appendChild(el('div', 'tg-event__time', formatTime(ev.start, use24h)));
    node.addEventListener('click', function (e) { e.stopPropagation(); handlers.onEventClick(ev); });
    return node;
  }
  function layoutOverlaps(events) {
    var sorted = events.slice().sort(function (a, b) { return (a.dispStart - b.dispStart) || (b.dispEnd - a.dispEnd); });
    var active = [], cluster = [];
    function flush() {
      var maxCols = 1;
      cluster.forEach(function (e) { if (e._col + 1 > maxCols) maxCols = e._col + 1; });
      cluster.forEach(function (e) { e._cols = maxCols; });
      cluster = [];
    }
    sorted.forEach(function (ev) {
      for (var i = active.length - 1; i >= 0; i--) if (active[i].dispEnd <= ev.dispStart) active.splice(i, 1);
      if (active.length === 0 && cluster.length) flush();
      var used = {};
      active.forEach(function (e) { used[e._col] = true; });
      var c = 0; while (used[c]) c++;
      ev._col = c; active.push(ev); cluster.push(ev);
    });
    if (cluster.length) flush();
    return sorted;
  }
  function hourLabel(h, use24h) {
    if (h === 0) return use24h ? '00:00' : '';
    if (use24h) return String(h).padStart(2, '0') + ':00';
    if (h < 12) return h + ' 上午';
    if (h === 12) return '12 下午';
    return (h - 12) + ' 下午';
  }

  function renderYear(container, viewDate, settings, handlers) {
    var year = viewDate.getFullYear();
    var root = el('div', 'year');
    var events = getEventsInRange(new Date(year, 0, 1), new Date(year, 11, 31, 23, 59, 59));
    var eventDays = {};
    events.forEach(function (e) { eventDays[startOfDay(e.start).toDateString()] = true; });

    for (var m = 0; m < 12; m++) {
      var monthDate = new Date(year, m, 1);
      var mBox = el('div', 'year-month');
      var title = el('div', 'year-month__title', MONTHS_ZH[m]);
      if (isSameMonth(monthDate, new Date())) title.style.color = 'var(--accent)';
      mBox.appendChild(title);

      var g = el('div', 'year-month__grid');
      orderedWeekdays(settings.weekStart).forEach(function (d) { g.appendChild(el('div', 'year-month__dow', WEEKDAYS_ZH_SHORT[d])); });

      var cells = buildMonthGrid(monthDate, settings.weekStart);
      (function (monthDate) {
        cells.forEach(function (date) {
          var cell = el('div', 'year-day', String(date.getDate()));
          if (!isSameMonth(date, monthDate)) cell.classList.add('is-muted');
          else {
            if (isToday(date)) cell.classList.add('is-today');
            if (eventDays[startOfDay(date).toDateString()]) cell.classList.add('has-event');
          }
          g.appendChild(cell);
        });
      })(monthDate);
      mBox.appendChild(g);
      (function (monthDate) { mBox.addEventListener('click', function () { handlers.onMonthClick(monthDate); }); })(monthDate);
      root.appendChild(mBox);
    }
    container.replaceChildren(root);
  }

  function renderMiniCalendar(container, viewMonth, selectedDate, settings, handlers) {
    var root = el('div');
    var head = el('div', 'mini-cal__head');
    head.appendChild(el('div', 'mini-cal__title', viewMonth.getFullYear() + '年 ' + MONTHS_ZH[viewMonth.getMonth()]));
    var nav = el('div', 'mini-cal__nav');
    var prev = el('button', 'icon-btn', '‹'); prev.style.width = prev.style.height = '26px';
    var next = el('button', 'icon-btn', '›'); next.style.width = next.style.height = '26px';
    prev.addEventListener('click', function () { handlers.onMiniNav(-1); });
    next.addEventListener('click', function () { handlers.onMiniNav(1); });
    nav.appendChild(prev); nav.appendChild(next);
    head.appendChild(nav);
    root.appendChild(head);

    var grid = el('div', 'mini-cal__grid');
    orderedWeekdays(settings.weekStart).forEach(function (d) { grid.appendChild(el('div', 'mini-cal__dow', WEEKDAYS_ZH_SHORT[d])); });

    var cells = buildMonthGrid(viewMonth, settings.weekStart);
    var events = getEventsInRange(startOfDay(cells[0]), endOfDay(cells[cells.length - 1]));
    var eventDays = {};
    events.forEach(function (e) { eventDays[startOfDay(e.start).toDateString()] = true; });

    cells.forEach(function (date) {
      var cell = el('div', 'mini-cal__day', String(date.getDate()));
      if (!isSameMonth(date, viewMonth)) cell.classList.add('is-muted');
      if (isToday(date)) cell.classList.add('is-today');
      if (selectedDate && isSameDay(date, selectedDate)) cell.classList.add('is-selected');
      if (eventDays[startOfDay(date).toDateString()]) cell.classList.add('has-event');
      cell.addEventListener('click', function () { handlers.onMiniPick(date); });
      grid.appendChild(cell);
    });
    root.appendChild(grid);
    container.replaceChildren(root);
  }

  // =======================================================
  // app controller
  // =======================================================
  function $(sel) { return document.querySelector(sel); }

  function boot() {
    state = loadStore();
    var app = $('#app');

    var appState = {
      view: 'month',
      viewDate: new Date(),
      selectedDate: new Date(),
      miniMonth: startOfMonth(new Date()),
      editingId: null,
      monthScroller: null
    };

    // Restore the last view + date from a previous session.
    (function restoreUI() {
      var ui = loadUI();
      if (!ui) return;
      var validViews = { day: 1, week: 1, month: 1, year: 1 };
      if (ui.view && validViews[ui.view]) appState.view = ui.view;
      var vd = ui.viewDate ? new Date(ui.viewDate) : null;
      if (vd && !isNaN(vd.getTime())) appState.viewDate = vd;
      var sd = ui.selectedDate ? new Date(ui.selectedDate) : null;
      if (sd && !isNaN(sd.getTime())) appState.selectedDate = sd;
      appState.miniMonth = startOfMonth(appState.viewDate);
    })();

    var persistUI = debounce(function () {
      saveUI({
        view: appState.view,
        viewDate: appState.viewDate.toISOString(),
        selectedDate: appState.selectedDate.toISOString()
      });
    }, 250);

    var settings = getSettings();

    var media = window.matchMedia('(prefers-color-scheme: dark)');
    function applyTheme() {
      var mode = settings.theme;
      var dark = mode === 'dark' || (mode === 'auto' && media.matches);
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    }
    if (media.addEventListener) media.addEventListener('change', function () { if (settings.theme === 'auto') applyTheme(); });

    var viewContainer = $('#viewContainer');
    var periodTitle = $('#periodTitle');
    var eventModal = $('#eventModal');
    var settingsModal = $('#settingsModal');
    var specialModal = $('#specialModal');

    var handlers = {
      onDayClick: function (date) { appState.selectedDate = date; appState.miniMonth = startOfMonth(date); syncMini(); persistUI(); },
      onDayCreate: function (date) { openEventModal(null, defaultTimesFor(date)); },
      onEventClick: function (ev) { openEventModal(ev); },
      onTimeCreate: function (start) { openEventModal(null, { start: start, end: new Date(start.getTime() + 3600000), allDay: false }); },
      onDayHeadClick: function (date) { appState.view = 'day'; appState.viewDate = date; appState.selectedDate = date; syncViewSwitch(); render(); },
      onMonthClick: function (monthDate) { appState.view = 'month'; appState.viewDate = monthDate; syncViewSwitch(); render(); },
      onMiniNav: function (dir) { appState.miniMonth = addMonths(appState.miniMonth, dir); syncMini(); },
      onMiniPick: function (date) {
        appState.selectedDate = date; appState.viewDate = date;
        if (appState.view === 'month' && appState.monthScroller) {
          appState.monthScroller.scrollToMonth(date, true); syncMini(); closeSidebarOnMobile(); return;
        }
        if (appState.view === 'year') { appState.view = 'month'; syncViewSwitch(); }
        render(); closeSidebarOnMobile();
      },
      // Called by the continuous month scroller as the visible month changes.
      onFocusMonth: function (monthDate) {
        appState.viewDate = monthDate;
        appState.miniMonth = startOfMonth(monthDate);
        updateTitle();
        syncMini();
        persistUI();
      }
    };

    function render() {
      app.dataset.view = appState.view;
      if (appState.view !== 'month') appState.monthScroller = null;
      if (appState.view === 'month') {
        appState.monthScroller = createMonthScroller(settings, handlers, appState.viewDate);
        viewContainer.replaceChildren(appState.monthScroller.root);
        var target = appState.viewDate;
        requestAnimationFrame(function () { if (appState.monthScroller) appState.monthScroller.scrollToMonth(target, false); });
      } else if (appState.view === 'week') {
        var start = startOfWeek(appState.viewDate, settings.weekStart);
        var days = [];
        for (var i = 0; i < 7; i++) days.push(addDays(start, i));
        renderTimeGrid(viewContainer, appState.viewDate, settings, handlers, days);
      } else if (appState.view === 'day') {
        renderTimeGrid(viewContainer, appState.viewDate, settings, handlers, [appState.viewDate]);
      } else if (appState.view === 'year') {
        renderYear(viewContainer, appState.viewDate, settings, handlers);
      }
      updateTitle();
      syncMini();
      persistUI();
    }

    function updateTitle() {
      var d = appState.viewDate;
      if (appState.view === 'year') periodTitle.textContent = d.getFullYear() + '年';
      else if (appState.view === 'month') periodTitle.textContent = d.getFullYear() + '年 ' + MONTHS_ZH[d.getMonth()];
      else if (appState.view === 'week') {
        var s = startOfWeek(d, settings.weekStart);
        var e = addDays(s, 6);
        var wk = getISOWeek(d);
        if (isSameMonth(s, e)) periodTitle.textContent = s.getFullYear() + '年 ' + MONTHS_ZH[s.getMonth()] + ' · 第' + wk + '周';
        else periodTitle.textContent = MONTHS_ZH[s.getMonth()] + ' – ' + MONTHS_ZH[e.getMonth()] + ' · 第' + wk + '周';
      } else {
        periodTitle.textContent = d.getFullYear() + '年 ' + MONTHS_ZH[d.getMonth()] + d.getDate() + '日 ' + WEEKDAYS_ZH[d.getDay()];
      }
    }
    function syncMini() { renderMiniCalendar($('#miniCalendar'), appState.miniMonth, appState.selectedDate, settings, handlers); }
    function syncViewSwitch() {
      var items = document.querySelectorAll('#viewSwitch .segmented__item');
      Array.prototype.forEach.call(items, function (b) { b.classList.toggle('is-active', b.dataset.view === appState.view); });
    }

    function navigate(dir) {
      if (appState.view === 'month') {
        if (appState.monthScroller) {
          var f = appState.monthScroller.focusedMonth();
          appState.monthScroller.scrollToMonth(addMonths(f, dir), true);
        }
        return;
      }
      if (appState.view === 'week') appState.viewDate = addDays(appState.viewDate, 7 * dir);
      else if (appState.view === 'day') appState.viewDate = addDays(appState.viewDate, dir);
      else if (appState.view === 'year') appState.viewDate = addYears(appState.viewDate, dir);
      appState.miniMonth = startOfMonth(appState.viewDate);
      render();
    }
    function goToday() {
      var now = new Date();
      appState.selectedDate = now;
      if (appState.view === 'month' && appState.monthScroller) {
        appState.viewDate = now;
        appState.monthScroller.scrollToMonth(now, true);
        return;
      }
      appState.view = 'month';
      appState.viewDate = now; appState.miniMonth = startOfMonth(now);
      syncViewSwitch(); render();
    }

    function defaultTimesFor(date) {
      var now = new Date();
      var start = new Date(date);
      start.setHours(now.getHours() + 1, 0, 0, 0);
      return { start: start, end: new Date(start.getTime() + 3600000), allDay: false };
    }
    function openEventModal(ev, defaults) {
      appState.editingId = (ev && ev.id) || null;
      $('#eventModalTitle').textContent = ev ? '编辑事件' : '新建事件';
      $('#saveEventBtn').textContent = ev ? '完成' : '添加';
      $('#deleteEventBtn').hidden = !ev;

      var start = ev ? new Date(ev.start) : defaults.start;
      var end = ev ? new Date(ev.end) : defaults.end;
      var allDay = ev ? !!ev.allDay : !!defaults.allDay;

      $('#evTitle').value = (ev && ev.title) || '';
      $('#evLocation').value = (ev && ev.location) || '';
      $('#evNotes').value = (ev && ev.notes) || '';
      $('#evAllDay').checked = allDay;
      updateAllDayUI();
      $('#evStart').value = allDay ? toDateInput(start) : toLocalInput(start);
      $('#evEnd').value = allDay ? toDateInput(end) : toLocalInput(end);
      $('#evRepeat').value = (ev && ev.repeat) || 'none';
      $('#evAlert').value = (ev && ev.alert) || 'none';

      showModal(eventModal);
      setTimeout(function () { $('#evTitle').focus(); }, 60);
    }
    function updateAllDayUI() {
      var allDay = $('#evAllDay').checked;
      $('#evStart').type = allDay ? 'date' : 'datetime-local';
      $('#evEnd').type = allDay ? 'date' : 'datetime-local';
    }
    function saveEvent() {
      var title = $('#evTitle').value.trim() || '（无标题）';
      var allDay = $('#evAllDay').checked;
      var start = fromLocalInput($('#evStart').value);
      var end = fromLocalInput($('#evEnd').value);
      if (!start) start = new Date();
      if (!end || end < start) end = allDay ? new Date(start) : new Date(start.getTime() + 3600000);
      if (allDay) { start = startOfDay(start); end = endOfDay(end); }

      var data = {
        title: title,
        location: $('#evLocation').value.trim(),
        notes: $('#evNotes').value.trim(),
        allDay: allDay,
        start: start.toISOString(),
        end: end.toISOString(),
        repeat: $('#evRepeat').value,
        alert: $('#evAlert').value
      };
      if (data.alert && data.alert !== 'none' && ('Notification' in window) && Notification.permission === 'default') {
        try { Notification.requestPermission(); } catch (e) {}
      }
      if (appState.editingId) { updateEvent(appState.editingId, data); toast('已更新'); }
      else { data.categoryId = 'personal'; addEvent(data); toast('已添加'); }
      hideModal(eventModal);
      render();
    }
    function deleteCurrentEvent() {
      if (!appState.editingId) return;
      deleteEvent(appState.editingId);
      hideModal(eventModal); toast('已删除'); render();
    }

    function showModal(modal) { modal.hidden = false; }
    function hideModal(modal) { modal.hidden = true; }
    Array.prototype.forEach.call(document.querySelectorAll('[data-close]'), function (btn) {
      btn.addEventListener('click', function () { hideModal(btn.closest('.modal')); });
    });

    var PALETTE = ['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#00c7be', '#007aff', '#5856d6', '#af52de', '#ff2d55', '#a2845e'];
    function renderCategories() {
      var list = $('#categoryList'); list.innerHTML = '';
      getCategories().forEach(function (c) {
        var li = document.createElement('li');
        li.className = 'cal-item ' + (c.visible ? 'is-on' : 'is-off');
        li.style.setProperty('--dot', c.color);
        var check = el('span', 'cal-item__check');
        var name = el('span', 'cal-item__name', c.name);
        var del = el('span', 'cal-item__del', '🗑'); del.title = '删除分类';
        li.appendChild(check); li.appendChild(name); li.appendChild(del);
        li.addEventListener('click', function (e) { if (e.target === del) return; toggleCategory(c.id); });
        del.addEventListener('click', function (e) {
          e.stopPropagation();
          if (confirm('删除分类「' + c.name + '」及其所有事件？')) { deleteCategory(c.id); toast('已删除分类'); }
        });
        list.appendChild(li);
      });
    }
    $('#addCategoryBtn').addEventListener('click', function () {
      var name = prompt('新日历名称：');
      if (!name) return;
      addCategory(name.trim(), PALETTE[getCategories().length % PALETTE.length]);
      toast('已添加分类');
    });

    // ---------- Special days (custom festivals / anniversaries) ----------
    var SP_PALETTE = ['#ff2d55', '#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#00c7be', '#007aff', '#5856d6', '#af52de', '#8e8e93'];
    var spEditingId = null;
    var spColor = SP_PALETTE[0];
    var spCalType = 'solar';

    function fmtMD(m, d) { return m + '月' + d + '日'; }
    function spDateText(sp) {
      if (sp.calendar === 'lunar') return '农历 ' + lunarLabelMD(sp.lunarMonth, sp.lunarDay) + ' · 每年';
      return fmtMD(sp.month, sp.day) + (sp.yearly ? ' · 每年' : (sp.year ? ' · ' + sp.year + '年' : ''));
    }
    function buildLunarSelects() {
      var mSel = $('#spLunarMonth'); mSel.innerHTML = '';
      for (var m = 1; m <= 12; m++) {
        var o = document.createElement('option'); o.value = m; o.textContent = LUNAR_MONTHS[m - 1] + '月'; mSel.appendChild(o);
      }
      var dSel = $('#spLunarDay'); dSel.innerHTML = '';
      for (var d = 1; d <= 30; d++) {
        var o2 = document.createElement('option'); o2.value = d; o2.textContent = lunarDayName(d); dSel.appendChild(o2);
      }
    }
    function setCalType(type) {
      spCalType = type;
      Array.prototype.forEach.call($('#spCalType').children, function (b) { b.classList.toggle('is-active', b.dataset.cal === type); });
      var lunar = type === 'lunar';
      $('#spSolarRow').hidden = lunar;
      $('#spYearlyRow').hidden = lunar;   // lunar anniversaries always repeat yearly
      $('#spLunarRow').hidden = !lunar;
    }

    function nextOccurrence(sp) {
      var today = startOfDay(new Date());
      
      // 农历纪念日
      if (sp.calendar === 'lunar') {
        return findNextLunarDate(sp.lunarMonth, sp.lunarDay);
      }
      
      // 公历纪念日
      if (!sp.yearly && sp.year) return new Date(sp.year, sp.month - 1, sp.day);
      var cand = new Date(today.getFullYear(), sp.month - 1, sp.day);
      if (cand < today) cand = new Date(today.getFullYear() + 1, sp.month - 1, sp.day);
      return cand;
    }

    function renderSpecialMiniList() {
      var ul = $('#specialMiniList'); ul.innerHTML = '';
      getSpecialDays().sort(function (a, b) { return nextOccurrence(a) - nextOccurrence(b); }).slice(0, 8).forEach(function (sp) {
        var li = el('li', 'special-mini-item');
        var dot = el('span', 'dot'); dot.style.background = sp.color;
        li.appendChild(dot);
        li.appendChild(el('span', 'nm', (sp.emoji ? sp.emoji + ' ' : '') + sp.name));
        
        // 显示日期：农历或公历
        var dateStr;
        if (sp.calendar === 'lunar') {
          dateStr = '农历' + lunarLabelMD(sp.lunarMonth, sp.lunarDay);
        } else {
          dateStr = fmtMD(sp.month, sp.day);
        }
        li.appendChild(el('span', 'dt', dateStr));
        
        li.addEventListener('click', function () {
          var occ = nextOccurrence(sp);
          appState.selectedDate = occ; appState.viewDate = occ; appState.miniMonth = startOfMonth(occ);
          if (appState.view === 'month' && appState.monthScroller) appState.monthScroller.scrollToMonth(occ, true);
          else { if (appState.view === 'year') { appState.view = 'month'; syncViewSwitch(); } render(); }
          closeSidebarOnMobile();
        });
        ul.appendChild(li);
      });
    }

    function buildColorSwatches() {
      var wrap = $('#spColors'); wrap.innerHTML = '';
      SP_PALETTE.forEach(function (c) {
        var sw = el('span', 'swatch'); sw.style.background = c; sw.style.color = c;
        if (c === spColor) sw.classList.add('is-selected');
        sw.addEventListener('click', function () {
          spColor = c;
          Array.prototype.forEach.call(wrap.children, function (x) { x.classList.remove('is-selected'); });
          sw.classList.add('is-selected');
        });
        wrap.appendChild(sw);
      });
    }

    function resetSpecialForm() {
      spEditingId = null;
      spColor = SP_PALETTE[0];
      spCalType = 'solar';
      $('#spFormTitle').textContent = '添加纪念日';
      $('#spName').value = '';
      $('#spEmoji').value = '';
      $('#spDate').value = toDateInput(appState.selectedDate || new Date());
      $('#spYearly').checked = true;
      $('#spSaveBtn').textContent = '添加';
      $('#spCancelBtn').hidden = true;
      setCalType('solar');
      buildColorSwatches();
    }

    function renderSpecialList() {
      var ul = $('#specialList'); ul.innerHTML = '';
      getSpecialDays().sort(function (a, b) {
        if (a.calendar === 'lunar' && b.calendar !== 'lunar') return 1;
        if (a.calendar !== 'lunar' && b.calendar === 'lunar') return -1;
        if (a.calendar === 'lunar') return (a.lunarMonth - b.lunarMonth) || (a.lunarDay - b.lunarDay);
        return (a.month - b.month) || (a.day - b.day);
      }).forEach(function (sp) {
        var li = el('li', 'special-item');
        li.style.setProperty('--dot', sp.color);
        li.appendChild(el('span', 'special-item__emoji', sp.emoji || '📌'));
        var info = el('div', 'special-item__info');
        info.appendChild(el('div', 'special-item__name', sp.name || '（未命名）'));
        info.appendChild(el('div', 'special-item__date', spDateText(sp)));
        li.appendChild(info);
        var btns = el('div', 'special-item__btns');
        var edit = el('button', 'icon-btn', '✎'); edit.title = '编辑';
        var del = el('button', 'icon-btn', '🗑'); del.title = '删除';
        edit.addEventListener('click', function () { loadSpecialIntoForm(sp); });
        del.addEventListener('click', function () { if (confirm('删除「' + sp.name + '」？')) { deleteSpecialDay(sp.id); toast('已删除'); } });
        btns.appendChild(edit); btns.appendChild(del);
        li.appendChild(btns);
        ul.appendChild(li);
      });
    }

    function loadSpecialIntoForm(sp) {
      spEditingId = sp.id;
      spColor = sp.color;
      $('#spFormTitle').textContent = '编辑纪念日';
      $('#spName').value = sp.name;
      $('#spEmoji').value = sp.emoji || '';
      
      if (sp.calendar === 'lunar') {
        setCalType('lunar');
        $('#spLunarMonth').value = sp.lunarMonth || 1;
        $('#spLunarDay').value = sp.lunarDay || 1;
      } else {
        setCalType('solar');
        var y = sp.yearly ? new Date().getFullYear() : (sp.year || new Date().getFullYear());
        $('#spDate').value = toDateInput(new Date(y, sp.month - 1, sp.day));
        $('#spYearly').checked = !!sp.yearly;
      }
      
      $('#spSaveBtn').textContent = '更新';
      $('#spCancelBtn').hidden = false;
      buildColorSwatches();
    }

    function saveSpecial() {
      var name = $('#spName').value.trim();
      if (!name) { toast('请输入名称'); $('#spName').focus(); return; }
      
      var data = { name: name, emoji: $('#spEmoji').value.trim(), color: spColor };
      
      if (spCalType === 'lunar') {
        // 农历纪念日
        data.calendar = 'lunar';
        data.lunarMonth = Number($('#spLunarMonth').value);
        data.lunarDay = Number($('#spLunarDay').value);
        data.yearly = true;  // 农历纪念日总是每年重复
      } else {
        // 公历纪念日
        var dv = fromLocalInput($('#spDate').value) || new Date();
        var yearly = $('#spYearly').checked;
        data.month = dv.getMonth() + 1;
        data.day = dv.getDate();
        data.yearly = yearly;
        if (!yearly) data.year = dv.getFullYear();
      }
      
      if (spEditingId) { updateSpecialDay(spEditingId, data); toast('已更新'); }
      else { addSpecialDay(data); toast('已添加'); }
      resetSpecialForm();
    }

    function openSpecialModal() {
      buildLunarSelects();  // 初始化农历选择器
      resetSpecialForm();
      renderSpecialList();
      
      // 绑定历法类型切换按钮
      Array.prototype.forEach.call($('#spCalType').children, function (btn) {
        btn.onclick = function () { setCalType(btn.dataset.cal); };
      });
      
      showModal($('#specialModal'));
      setTimeout(function () { $('#spName').focus(); }, 60);
    }

    $('#editSpecialBtn').addEventListener('click', openSpecialModal);
    $('#spSaveBtn').addEventListener('click', saveSpecial);
    $('#spCancelBtn').addEventListener('click', resetSpecialForm);

    var searchInput = $('#searchInput');
    var searchResults = $('#searchResults');
    var doSearch = debounce(function () {
      var q = searchInput.value;
      if (!q.trim()) { searchResults.hidden = true; searchResults.innerHTML = ''; return; }
      var results = searchEvents(q);
      searchResults.hidden = false; searchResults.innerHTML = '';
      if (!results.length) { searchResults.appendChild(el('div', 'search-empty', '没有找到事件')); return; }
      results.forEach(function (ev) {
        var item = el('div', 'search-result');
        item.style.borderLeftColor = ev.color;
        item.appendChild(el('div', 'search-result__title', ev.title));
        var d = new Date(ev.start);
        var meta = d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate() + (ev.location ? ' · ' + ev.location : '');
        item.appendChild(el('div', 'search-result__meta', meta));
        item.addEventListener('click', function () {
          if (appState.view === 'year') { appState.view = 'month'; }
          appState.viewDate = new Date(ev.start);
          appState.selectedDate = new Date(ev.start);
          appState.miniMonth = startOfMonth(new Date(ev.start));
          syncViewSwitch(); render();
          var raw = getRawEvents().filter(function (x) { return x.id === ev.id; })[0];
          openEventModal(raw);
        });
        searchResults.appendChild(item);
      });
    }, 180);
    searchInput.addEventListener('input', doSearch);

    $('#exportBtn').addEventListener('click', function () {
      var ics = exportICS(getRawEvents(), getCategories());
      downloadICS(ics, 'calendar-' + new Date().toISOString().slice(0, 10) + '.ics');
      toast('已导出 .ics');
    });
    $('#importBtn').addEventListener('click', function () { $('#importFile').click(); });
    $('#importFile').addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var events = parseICS(String(reader.result));
          if (!events.length) { toast('未找到事件'); return; }
          importEvents(events); toast('已导入 ' + events.length + ' 个事件'); render();
        } catch (err) { console.error(err); toast('导入失败'); }
      };
      reader.readAsText(file);
      e.target.value = '';
    });

    function openSettings() {
      $('#setTheme').value = settings.theme;
      $('#setWeekStart').value = String(settings.weekStart);
      $('#setLunar').checked = settings.showLunar;
      $('#setWeekNumbers').checked = settings.showWeekNumbers;
      $('#set24h').checked = settings.use24h;
      $('#setHolidays').checked = settings.showHolidays;
      showModal(settingsModal);
    }
    $('#settingsBtn').addEventListener('click', openSettings);
    $('#setTheme').addEventListener('change', function (e) { updateSettings({ theme: e.target.value }); });
    $('#setWeekStart').addEventListener('change', function (e) { updateSettings({ weekStart: Number(e.target.value) }); });
    $('#setLunar').addEventListener('change', function (e) { updateSettings({ showLunar: e.target.checked }); });
    $('#setWeekNumbers').addEventListener('change', function (e) { updateSettings({ showWeekNumbers: e.target.checked }); });
    $('#set24h').addEventListener('change', function (e) { updateSettings({ use24h: e.target.checked }); });
    $('#setHolidays').addEventListener('change', function (e) { updateSettings({ showHolidays: e.target.checked }); });
    $('#syncHolidayBtn').addEventListener('click', function () {
      var btn = $('#syncHolidayBtn');
      if (btn.disabled) return;
      var orig = btn.textContent;
      btn.disabled = true; btn.textContent = '同步中…';
      var y = new Date().getFullYear();
      Promise.all([
        fetchHolidays(y),
        fetchHolidays(y + 1).catch(function () { return 0; })
      ]).then(function () {
        if (!settings.showHolidays) updateSettings({ showHolidays: true });
        toast('已同步 ' + y + ' 年节假日');
      }).catch(function () {
        toast('同步失败，请检查网络连接');
      }).then(function () {
        btn.disabled = false; btn.textContent = orig;
      });
    });
    $('#clearDataBtn').addEventListener('click', function () {
      if (confirm('确定要清除所有事件和分类吗？此操作无法撤销。')) { clearAll(); hideModal(settingsModal); toast('已清除所有数据'); }
    });

    $('#todayBtn').addEventListener('click', goToday);
    $('#prevBtn').addEventListener('click', function () { navigate(-1); });
    $('#nextBtn').addEventListener('click', function () { navigate(1); });
    $('#newEventBtn').addEventListener('click', function () { openEventModal(null, defaultTimesFor(appState.selectedDate)); });
    $('#saveEventBtn').addEventListener('click', saveEvent);
    $('#deleteEventBtn').addEventListener('click', deleteCurrentEvent);
    $('#evAllDay').addEventListener('change', updateAllDayUI);
    $('#themeBtn').addEventListener('click', function () {
      var order = ['auto', 'light', 'dark'];
      var next = order[(order.indexOf(settings.theme) + 1) % 3];
      updateSettings({ theme: next });
      toast(next === 'auto' ? '跟随系统' : next === 'dark' ? '深色' : '浅色');
    });

    Array.prototype.forEach.call(document.querySelectorAll('#viewSwitch .segmented__item'), function (btn) {
      btn.addEventListener('click', function () { appState.view = btn.dataset.view; syncViewSwitch(); render(); });
    });

    var newBtn = $('#newEventBtn');
    newBtn.innerHTML = '＋';

    function isMobile() { return window.matchMedia('(max-width: 768px)').matches; }
    $('#menuBtn').addEventListener('click', function () {
      if (isMobile()) app.classList.toggle('sidebar-open');
      else app.classList.toggle('sidebar-collapsed');
    });
    $('#sidebarClose').addEventListener('click', function () {
      if (isMobile()) app.classList.remove('sidebar-open');
      else app.classList.add('sidebar-collapsed');
    });
    $('#scrim').addEventListener('click', function () { app.classList.remove('sidebar-open'); });
    function closeSidebarOnMobile() {
      if (isMobile()) app.classList.remove('sidebar-open');
    }

    document.addEventListener('keydown', function (e) {
      var inField = ['INPUT', 'TEXTAREA', 'SELECT'].indexOf(e.target.tagName) !== -1;
      var modalOpen = !eventModal.hidden || !settingsModal.hidden || !specialModal.hidden;
      if (e.key === 'Escape') {
        if (!eventModal.hidden) hideModal(eventModal);
        else if (!settingsModal.hidden) hideModal(settingsModal);
        else if (!specialModal.hidden) hideModal(specialModal);
        else app.classList.remove('sidebar-open');
        return;
      }
      if (modalOpen) {
        if (e.key === 'Enter' && !eventModal.hidden && e.target.id !== 'evNotes') saveEvent();
        else if (e.key === 'Enter' && !specialModal.hidden && (e.target.id === 'spName' || e.target.id === 'spEmoji')) saveSpecial();
        return;
      }
      if (inField) { if (e.key === 'Enter' && e.target === searchInput) searchInput.blur(); return; }
      switch (e.key) {
        case 'ArrowLeft': navigate(-1); break;
        case 'ArrowRight': navigate(1); break;
        case 't': case 'T': goToday(); break;
        case 'n': case 'N': openEventModal(null, defaultTimesFor(appState.selectedDate)); break;
        case '1': appState.view = 'day'; syncViewSwitch(); render(); break;
        case '2': appState.view = 'week'; syncViewSwitch(); render(); break;
        case '3': appState.view = 'month'; syncViewSwitch(); render(); break;
        case '4': appState.view = 'year'; syncViewSwitch(); render(); break;
        case '/': e.preventDefault(); searchInput.focus(); break;
      }
    });

    var toastTimer;
    function toast(msg) {
      var t = $('#toast');
      t.textContent = msg; t.hidden = false;
      requestAnimationFrame(function () { t.classList.add('is-visible'); });
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () {
        t.classList.remove('is-visible');
        setTimeout(function () { t.hidden = true; }, 300);
      }, 1800);
    }

    // in-session reminders
    var notified = {};
    function checkReminders() {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      var now = Date.now();
      var events = getEventsInRange(new Date(now - 60000), new Date(now + 2 * 3600000));
      events.forEach(function (ev) {
        if (!ev.alert || ev.alert === 'none') return;
        var fireAt = ev.start.getTime() - Number(ev.alert) * 60000;
        var key = ev.id + ':' + ev.start.getTime();
        if (!notified[key] && fireAt <= now && ev.start.getTime() > now - 60000) {
          notified[key] = true;
          try { new Notification(ev.title, { body: ev.location || '', tag: key }); } catch (e) {}
        }
      });
    }

    // store subscription: re-apply settings + re-render on any data change
    subscribe(function () {
      settings = getSettings();
      applyTheme();
      renderCategories();
      renderSpecialMiniList();
      renderSpecialList();
      render();
    });

    // ---- initial paint ----
    applyTheme();
    renderCategories();
    renderSpecialMiniList();
    syncViewSwitch();
    render();
    setInterval(checkReminders, 30000);

    window.__cal = { store: store, state: appState };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
