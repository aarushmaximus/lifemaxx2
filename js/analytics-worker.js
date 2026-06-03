// Web Worker for Lifemaxx Analytics & SVG Radar Chart Coordinates
self.onmessage = function (e) {
  const { type, xplog, macros } = e.data;
  if (type === 'calculate') {
    const correlations = calculateCorrelations(xplog, macros);
    const radarData = calculateRadarCoordinates(macros);
    self.postMessage({ correlations, radarData });
  }
};

function calculateCorrelations(xplog, macros) {
  // Group log by date
  const daysData = {};

  xplog.forEach(entry => {
    const dateStr = new Date(entry.timestamp).toDateString();
    if (!daysData[dateStr]) {
      daysData[dateStr] = {
        focusMinutes: 0,
        xpGains: {}
      };
      macros.forEach(m => {
        daysData[dateStr].xpGains[m.id] = 0;
      });
    }

    const isFocus = entry.reason && (entry.reason.includes('Timer') || entry.reason.includes('Tracker'));
    if (isFocus) {
      daysData[dateStr].focusMinutes += 20; // Default estimate per focus entry
    }

    if (daysData[dateStr].xpGains[entry.macroId] !== undefined) {
      daysData[dateStr].xpGains[entry.macroId] += Math.abs(entry.delta);
    }
  });

  const dayList = Object.values(daysData);
  if (dayList.length < 2) {
    const result = {};
    macros.forEach(m => { result[m.id] = 0; });
    return result;
  }

  const correlations = {};
  macros.forEach(m => {
    const x = dayList.map(d => d.focusMinutes);
    const y = dayList.map(d => d.xpGains[m.id] || 0);
    correlations[m.id] = pearsonCorrelation(x, y);
  });

  return correlations;
}

function pearsonCorrelation(x, y) {
  const n = x.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
    sumY2 += y[i] * y[i];
  }

  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (den === 0) return 0;
  return num / den;
}

function calculateRadarCoordinates(macros) {
  const cx = 150;
  const cy = 150;
  const maxR = 100;
  const n = macros.length;

  if (n < 3) return { axes: [], polygonPoints: "" };

  const levels = macros.map(m => m.currentLevel || 1);
  const maxL = Math.max(...levels, 1);

  const axes = [];
  const points = [];

  macros.forEach((m, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    const level = m.currentLevel || 1;
    const pct = Math.max(0.15, level / maxL);
    const r = pct * maxR;

    const ax = cx + maxR * Math.cos(angle);
    const ay = cy + maxR * Math.sin(angle);

    const px = cx + r * Math.cos(angle);
    const py = cy + r * Math.sin(angle);

    axes.push({
      id: m.id,
      name: m.name,
      color: m.accentColor || '#7c3aed',
      x1: cx,
      y1: cy,
      x2: ax,
      y2: ay,
      labelX: cx + (maxR + 24) * Math.cos(angle),
      labelY: cy + (maxR + 12) * Math.sin(angle)
    });

    points.push(`${px},${py}`);
  });

  return {
    cx,
    cy,
    maxR,
    axes,
    polygonPoints: points.join(' ')
  };
}
