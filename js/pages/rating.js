/* ============================================================
   СТРАНИЦА: РЕЙТИНГ
   ============================================================ */
const RatingPage = (() => {
    const render = (container) => {
        const user = Store.getCurrentUser();
        const students = Store.visibleStudents();
        const rating = Store.rating(students);

        if (!rating.length) {
            container.innerHTML = Utils.emptyState(I18n.t('rating.empty'), I18n.t('rating.empty.text'), '🏆');
            return;
        }

        const top3 = rating.slice(0, 3);
        let myPlace = null;
        if (user.role === 'student' && user.studentId) {
            const idx = rating.findIndex(s => s.id === user.studentId);
            if (idx >= 0) myPlace = { place: idx + 1, data: rating[idx] };
        }

        container.innerHTML =
            (myPlace ?
                '<div class="card mt-16" style="border-left:4px solid var(--accent)">' +
                '<div class="card__head"><div>' +
                '<h3 class="card__title">' + I18n.t('rating.yourPlace') + '</h3>' +
                '<p class="card__sub">' + I18n.t('rating.yourPlace.sub') + '</p>' +
                '</div><span class="badge badge--blue" style="font-size:14px;padding:6px 12px">' + myPlace.place + ' ' + I18n.t('rating.place') + '</span></div>' +
                '<div class="row gap-8">' +
                '<span class="muted">' + I18n.t('rating.table.avg') + ':</span>' +
                '<b style="font-size:20px">' + myPlace.data.average.toFixed(2) + '</b>' +
                '<span class="muted">·</span>' +
                '<span class="muted">' + I18n.t('rating.table.perf') + ':</span>' +
                '<b>' + myPlace.data.performance + '%</b>' +
                '</div>' +
                '</div>' : '') +
            '<h3 class="section-title">' + I18n.t('rating.top3') + '</h3>' +
            '<div class="podium">' + podium(top3[1], 2) + podium(top3[0], 1) + podium(top3[2], 3) + '</div>' +
            '<h3 class="section-title">' + I18n.t('rating.full') + '</h3>' +
            '<div class="table-wrap"><div class="table-scroll"><table class="data"><thead><tr>' +
            '<th style="width:70px">' + I18n.t('rating.table.place') + '</th>' +
            '<th>' + I18n.t('rating.table.student') + '</th>' +
            '<th>' + I18n.t('rating.table.group') + '</th>' +
            '<th>' + I18n.t('rating.table.course') + '</th>' +
            '<th>' + I18n.t('rating.table.avg') + '</th>' +
            '<th>' + I18n.t('rating.table.perf') + '</th>' +
            '<th>' + I18n.t('rating.table.status') + '</th>' +
            '</tr></thead><tbody>' +
            rating.map((s, i) => {
                const place = i + 1;
                const status = Utils.statusOf(s.average);
                const bg = place <= 3 ? 'style="background:' + (place === 1 ? 'rgba(251,191,36,.10)' : place === 2 ? 'rgba(148,163,184,.08)' : 'rgba(251,146,60,.08)') + '"' : '';
                return '<tr ' + bg + '>' +
                    '<td><b style="font-size:15px">' + place + '</b></td>' +
                    '<td class="cell-name">' + Utils.escapeHtml(s.fullName) + '</td>' +
                    '<td>' + Utils.escapeHtml(s.group) + '</td>' +
                    '<td class="cell-muted">' + s.course + '</td>' +
                    '<td><b>' + s.average.toFixed(2) + '</b></td>' +
                    '<td>' + s.performance + '%</td>' +
                    '<td><span class="badge ' + status.cls + '">' + I18n.t('status.' + status.key) + '</span></td>' +
                    '</tr>';
            }).join('') +
            '</tbody></table></div></div>' +
            '<div class="row gap-8 mt-16" style="justify-content:flex-end">' +
            '<button class="btn btn--ghost" id="ratingExport" type="button">' + I18n.t('rating.export') + '</button>' +
            '</div>';

        Utils.$('#ratingExport').addEventListener('click', () => {
            const rows = [
                [I18n.t('rating.table.place'), I18n.t('students.table.name'), I18n.t('rating.table.group'), I18n.t('rating.table.course'), I18n.t('rating.table.avg'), I18n.t('rating.table.perf') + ', %', I18n.t('rating.table.status')]
            ];
            rating.forEach((s, i) => rows.push([i + 1, s.fullName, s.group, s.course, s.average.toFixed(2), s.performance, I18n.t('status.' + Utils.statusOf(s.average).key)]));
            Utils.downloadCSV('rating.csv', rows);
            Utils.toast(I18n.t('rating.exportToast'), 'success');
        });

        container.addEventListener('click', (e) => {
            const row = e.target.closest('tr');
            if (!row) return;
            const nc = row.querySelector('.cell-name');
            if (!nc) return;
            const found = rating.find(s => s.fullName === nc.textContent);
            if (found && user.role !== 'student') location.hash = '#/student/' + found.id;
        });
    };

    const podium = (s, place) => {
        if (!s) return '<div class="podium__item"><div class="podium__medal">—</div><div class="podium__name">—</div></div>';
        const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
        return '<div class="podium__item podium__item--' + place + '">' +
            '<div class="podium__medal">' + medals[place] + '</div>' +
            '<div class="podium__name">' + Utils.escapeHtml(s.fullName) + '</div>' +
            '<div class="podium__avg">' + s.average.toFixed(2) + '</div>' +
            '<div class="podium__group">' + Utils.escapeHtml(s.group) + '</div>' +
            '</div>';
    };

    return { render };
})();