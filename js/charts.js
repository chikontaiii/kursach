/* ============================================================
   CHARTS — обёртка над Chart.js.
   Все графики автоматически адаптируются под тему.
   ============================================================ */
const Charts = (() => {
    const instances = {};

    const palette = () => {
        const dark = document.documentElement.getAttribute('data-theme') === 'dark';
        return {
            accent: '#4f6ef7',
            green: '#10b981',
            yellow: '#f59e0b',
            red: '#ef4444',
            purple: '#7c5cff',
            grid: dark ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.06)',
            ticks: dark ? '#a3b1c9' : '#64748b'
        };
    };

    const destroy = (id) => {
        if (instances[id]) {
            try { instances[id].destroy(); } catch (e) {}
            delete instances[id];
        }
    };

    const destroyAll = () => {
        Object.keys(instances).forEach(destroy);
    };

    const make = (id, config) => {
        const canvas = document.getElementById(id);
        if (!canvas || typeof Chart === 'undefined') return null;
        destroy(id);
        instances[id] = new Chart(canvas, config);
        return instances[id];
    };

    const baseOptions = (showLegend = false) => {
        const p = palette();
        return {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 450, easing: 'easeOutQuart' },
            plugins: {
                legend: {
                    display: showLegend,
                    position: 'bottom',
                    labels: {
                        color: p.ticks,
                        font: { size: 12, family: 'Inter' },
                        padding: 14,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        boxWidth: 8
                    }
                },
                tooltip: {
                    padding: 10,
                    cornerRadius: 8,
                    titleFont: { family: 'Inter', size: 12 },
                    bodyFont: { family: 'Inter', size: 12 }
                }
            }
        };
    };

    /* ---------------- Bar ---------------- */
    const bar = (id, labels, data, color = null, horizontal = false) => {
        const p = palette();
        const c = color || p.accent;
        const o = baseOptions(false);
        o.scales = horizontal ? {
            x: { beginAtZero: true, grid: { color: p.grid }, ticks: { color: p.ticks, font: { size: 11 } } },
            y: { grid: { display: false }, ticks: { color: p.ticks, font: { size: 11 } } }
        } : {
            x: { grid: { display: false }, ticks: { color: p.ticks, font: { size: 11 } } },
            y: { beginAtZero: true, grid: { color: p.grid }, ticks: { color: p.ticks, font: { size: 11 } } }
        };
        return make(id, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: c,
                    borderRadius: 8,
                    maxBarThickness: 38,
                    borderSkipped: false
                }]
            },
            options: {...o, indexAxis: horizontal ? 'y' : 'x' }
        });
    };

    /* ---------------- Line ---------------- */
    const line = (id, labels, data, color = null) => {
        const p = palette();
        const c = color || p.accent;
        const o = baseOptions(false);
        o.scales = {
            x: { grid: { display: false }, ticks: { color: p.ticks, font: { size: 11 } } },
            y: { beginAtZero: false, grid: { color: p.grid }, ticks: { color: p.ticks, font: { size: 11 } } }
        };
        return make(id, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    data,
                    borderColor: c,
                    backgroundColor: c + '22',
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.35,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: c,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: o
        });
    };

    /* ---------------- Doughnut ---------------- */
    const doughnut = (id, labels, data, colors) => {
        const p = palette();
        const o = baseOptions(true);
        o.cutout = '65%';
        return make(id, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors || [p.green, p.accent, p.yellow, p.red],
                    borderWidth: 0,
                    hoverOffset: 6
                }]
            },
            options: o
        });
    };

    return { bar, line, doughnut, destroy, destroyAll, palette };
})();