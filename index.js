(function() {

  // dscc = Data Studio Community Components helper
  // It's loaded by Looker Studio automatically, available as window.dscc
  var dscc = window.dscc;

  function drawViz(data) {
    var container = document.getElementById('funnel-wrap');
    container.innerHTML = '';

    // --- Style options ---
    var styleData = data.style;
    var barColor = (styleData.barColor && styleData.barColor.value && styleData.barColor.value.color)
      ? styleData.barColor.value.color
      : '#378ADD';
    var showDelta = (styleData.showDelta && styleData.showDelta.value !== undefined)
      ? styleData.showDelta.value
      : true;

    // --- Parse rows ---
    // Each row: { dimension: [event_name, period], metric: [count] }
    var rows = data.tables.DEFAULT;
    var fields = data.fields;

    // Find field indices
    var dimIdx = 0;   // event_name
    var metricIdx = 0; // users/events
    var periodIdx = 1; // current / previous

    // Build map: event_name -> { current: N, previous: N }
    var eventMap = {};
    var eventOrder = []; // preserve order as they appear for "current"

    rows.forEach(function(row) {
      var eventName = row.dimID[dimIdx];
      var period    = row.dimID[periodIdx];
      var count     = row.metricID[metricIdx];

      if (!eventMap[eventName]) {
        eventMap[eventName] = { current: 0, previous: 0 };
      }
      if (period === 'current') {
        eventMap[eventName].current = count;
        if (eventOrder.indexOf(eventName) === -1) eventOrder.push(eventName);
      } else {
        eventMap[eventName].previous = count;
      }
    });

    if (eventOrder.length === 0) {
      container.innerHTML = '<p style="color:#80868b;font-size:12px;padding:16px">No data</p>';
      return;
    }

    // Sort by current value desc (funnel order)
    eventOrder.sort(function(a, b) {
      return eventMap[b].current - eventMap[a].current;
    });

    var maxVal = eventMap[eventOrder[0]].current;

    // --- Render ---
    eventOrder.forEach(function(eventName, i) {
      var cur  = eventMap[eventName].current;
      var prev = eventMap[eventName].previous;

      var widthPct = maxVal > 0 ? Math.round(cur / maxVal * 100) : 0;

      var dropPct = null;
      var dropAbs = null;
      if (i > 0) {
        var prevStep = eventMap[eventOrder[i - 1]].current;
        dropPct = prevStep > 0 ? Math.round((1 - cur / prevStep) * 100) : 0;
        dropAbs = prevStep - cur;
      }

      var deltaAbs = cur - prev;
      var deltaPct = prev > 0 ? Math.round(deltaAbs / prev * 100) : 0;
      var deltaClass = deltaPct > 0 ? 'delta-pos' : deltaPct < 0 ? 'delta-neg' : 'delta-neu';
      var deltaSign  = deltaPct > 0 ? '+' : '';

      // Row
      var row = document.createElement('div');
      row.className = 'funnel-row';

      var label = document.createElement('div');
      label.className = 'step-label';
      label.title = eventName;
      label.textContent = eventName;

      var barArea = document.createElement('div');
      barArea.className = 'bar-area';

      var barFill = document.createElement('div');
      barFill.className = 'bar-fill';
      barFill.style.width = widthPct + '%';
      barFill.style.background = barColor;
      barFill.style.opacity = '0.7';

      var barVal = document.createElement('span');
      barVal.className = 'bar-val';
      barVal.textContent = cur.toLocaleString();
      barFill.appendChild(barVal);

      var meta = document.createElement('div');
      meta.className = 'meta';

      if (i > 0) {
        var dp = document.createElement('div');
        dp.className = 'drop-pct';
        dp.textContent = '\u25BC ' + dropPct + '%';
        meta.appendChild(dp);

        var da = document.createElement('div');
        da.className = 'drop-abs';
        da.textContent = '-' + dropAbs.toLocaleString() + ' events';
        meta.appendChild(da);
      } else {
        var top = document.createElement('div');
        top.className = 'drop-abs';
        top.textContent = 'top of funnel';
        meta.appendChild(top);
      }

      if (showDelta && prev > 0) {
        var badge = document.createElement('span');
        badge.className = 'delta-badge ' + deltaClass;
        badge.textContent = deltaSign + deltaPct + '% vs prev';
        meta.appendChild(badge);
      }

      barArea.appendChild(barFill);
      barArea.appendChild(meta);
      row.appendChild(label);
      row.appendChild(barArea);
      container.appendChild(row);

      // Connector line between steps
      if (i < eventOrder.length - 1) {
        var conn = document.createElement('div');
        conn.className = 'connector';
        var line = document.createElement('div');
        line.className = 'conn-line';
        conn.appendChild(line);
        container.appendChild(conn);
      }
    });
  }

  // Subscribe to data updates from Looker Studio
  dscc.subscribeToData(drawViz, { transform: dscc.objectTransform });

})();
