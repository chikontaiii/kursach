/* ============================================================
   УТИЛИТЫ — общие вспомогательные функции
   ============================================================ */
const Utils = (() => {

    const $ = (sel, root) => (root || document).querySelector(sel);
    const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

    const escapeHtml = (str) => {
        if (str === null || str === undefined) str = '';
        return String(str).replace(/[&<>"']/g, function(c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    };

    const uid = (prefix) => (prefix || 'id') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);

    const round = (n, d) => {
        if (!Number.isFinite(n)) return 0;
        const k = Math.pow(10, d === undefined ? 2 : d);
        return Math.round(n * k) / k;
    };

    const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    const sum = (arr) => arr.reduce((a, b) => a + b, 0);

    const formatDate = (iso) => {
        if (!iso) return '—';
        const d = new Date(iso);
        if (isNaN(d.getTime())) return iso;
        return d.toLocaleDateString('ru-RU');
    };

    const debounce = (fn, ms) => {
        let t;
        return function() {
            const args = arguments;
            clearTimeout(t);
            t = setTimeout(function() { fn.apply(null, args); }, ms === undefined ? 250 : ms);
        };
    };

    const sortBy = (arr, key, dir) => {
        const m = dir === 'asc' ? 1 : -1;
        return arr.slice().sort(function(a, b) {
            const av = typeof key === 'function' ? key(a) : a[key];
            const bv = typeof key === 'function' ? key(b) : b[key];
            if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * m;
            return String(av === null || av === undefined ? '' : av)
                .localeCompare(String(bv === null || bv === undefined ? '' : bv), 'ru') * m;
        });
    };

    /* -------------------- Toast -------------------- */
    const toast = (message, type) => {
        type = type || 'success';
        const root = $('#toasts');
        if (!root) return;
        const icons = { success: '✓', error: '✕', warn: '!', info: 'i' };
        const el = document.createElement('div');
        el.className = 'toast toast--' + type;
        el.innerHTML = '<span class="toast__icon">' + (icons[type] || 'i') + '</span>' +
            '<span class="toast__msg">' + escapeHtml(message) + '</span>';
        root.appendChild(el);
        requestAnimationFrame(function() { el.classList.add('toast--in'); });
        setTimeout(function() {
            el.classList.remove('toast--in');
            setTimeout(function() { el.remove(); }, 260);
        }, 3000);
    };

    /* -------------------- Modal -------------------- */
    const modal = (opts) => {
        const root = $('#modalRoot');
        const wrap = document.createElement('div');
        wrap.className = 'modal';
        wrap.innerHTML =
            '<div class="modal__backdrop" data-close></div>' +
            '<div class="modal__panel" role="dialog" aria-modal="true">' +
            '<div class="modal__head">' +
            '<h3 class="modal__title">' + escapeHtml(opts.title) + '</h3>' +
            '<button class="icon-btn icon-btn--sm" data-close aria-label="Закрыть" type="button">✕</button>' +
            '</div>' +
            '<div class="modal__body">' + opts.body + '</div>' +
            (opts.footer ? '<div class="modal__foot">' + opts.footer + '</div>' : '') +
            '</div>';
        root.appendChild(wrap);
        requestAnimationFrame(function() { wrap.classList.add('modal--in'); });

        const close = () => {
            wrap.classList.remove('modal--in');
            setTimeout(function() { wrap.remove(); }, 220);
            document.removeEventListener('keydown', onKey);
        };
        const onKey = (e) => { if (e.key === 'Escape') close(); };
        wrap.addEventListener('click', (e) => {
            if (e.target.closest('[data-close]')) close();
        });
        document.addEventListener('keydown', onKey);

        if (opts.onMount) opts.onMount(wrap, close);
        return { el: wrap, close: close };
    };

    /* -------------------- Подтверждение -------------------- */
    const confirmDialog = (opts) => {
        const title = opts.title || 'Подтвердите действие';
        const confirmText = opts.confirmText || 'Удалить';
        const danger = opts.danger !== false;
        return new Promise(function(resolve) {
            modal({
                title: title,
                body: '<p class="confirm-text">' + escapeHtml(opts.message) + '</p>',
                footer: '<button class="btn btn--ghost" data-cancel type="button">Отмена</button>' +
                    '<button class="btn ' + (danger ? 'btn--danger' : 'btn--primary') + '" data-ok type="button">' + escapeHtml(confirmText) + '</button>',
                onMount: function(wrap, close) {
                    wrap.querySelector('[data-cancel]').onclick = function() {
                        close();
                        resolve(false);
                    };
                    wrap.querySelector('[data-ok]').onclick = function() {
                        close();
                        resolve(true);
                    };
                }
            });
        });
    };

    /* -------------------- CSV -------------------- */
    const downloadCSV = (filename, rows) => {
        const csv = rows.map(function(row) {
            return row.map(function(cell) {
                const s = String(cell === null || cell === undefined ? '' : cell);
                return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
            }).join(';');
        }).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    /* -------------------- Состояния -------------------- */
    const loading = (text) =>
        '<div class="loading"><span class="spinner"></span><span>' + escapeHtml(text || 'Загрузка…') + '</span></div>';

    const emptyState = (title, text, icon) =>
        '<div class="empty"><div class="empty__icon">' + (icon || '📭') + '</div>' +
        '<h4>' + escapeHtml(title) + '</h4><p>' + escapeHtml(text) + '</p></div>';

    /* -------------------- Статусы успеваемости -------------------- */
    const statusOf = (avgGrade) => {
        if (avgGrade >= 4.5) return { key: 'high', label: 'Высокая успеваемость', cls: 'badge--green' };
        if (avgGrade >= 3.5) return { key: 'good', label: 'Хорошая', cls: 'badge--blue' };
        if (avgGrade >= 3.0) return { key: 'warn', label: 'Требует внимания', cls: 'badge--yellow' };
        return { key: 'low', label: 'Низкая успеваемость', cls: 'badge--red' };
    };

    /* -------------------- Процент успеваемости -------------------- */
    const perfPercent = (grades) => {
        if (!grades.length) return 0;
        const ok = grades.filter(function(g) { return g.grade >= 3; }).length;
        return round(ok / grades.length * 100, 1);
    };

    const pct = (n, d) => d ? round(n / d * 100, 1) : 0;

    const initials = (name) => {
        if (!name) return '';
        return name.trim().split(/\s+/).slice(0, 2).map(function(w) { return w[0] || ''; }).join('').toUpperCase();
    };

    return {
        $: $,
        $$: $$,
        escapeHtml: escapeHtml,
        uid: uid,
        round: round,
        avg: avg,
        sum: sum,
        formatDate: formatDate,
        debounce: debounce,
        sortBy: sortBy,
        toast: toast,
        modal: modal,
        confirmDialog: confirmDialog,
        downloadCSV: downloadCSV,
        loading: loading,
        emptyState: emptyState,
        statusOf: statusOf,
        perfPercent: perfPercent,
        pct: pct,
        initials: initials
    };
})();