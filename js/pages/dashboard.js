/* ============================================================
   DASHBOARD — главная страница + личный кабинет студента/старосты
   ============================================================ */
const DashboardPage = (() => {

    /* ============================================================
       ОСНОВНОЙ DASHBOARD (admin/teacher/starosta)
       ============================================================ */
    const render = (container) => {
        const user = Store.getCurrentUser();
        if (user.role === 'student') return renderStudentView(container, user);

        const students = Store.visibleStudents();
        const groups = Store.visibleGroups();
        const grades = Store.visibleGrades();

        const avg = grades.length ? Utils.round(Utils.avg(grades.map(g => g.grade)), 2) : 0;
        const perf = Utils.perfPercent(grades);

        const risk = students.filter(s => {
            const a = Store.studentAverage(s.id);
            return a > 0 && a < 3.5;
        });

        const subjectStats = Store.subjectAverages().filter(s => s.count > 0);
        const bestSubject = subjectStats.slice().sort((a, b) => b.avg - a.avg)[0];
        const worstSubject = subjectStats.slice().sort((a, b) => a.avg - b.avg)[0];

        const semMap = {};
        grades.forEach(g => {
            if (!semMap[g.semester]) semMap[g.semester] = [];
            semMap[g.semester].push(g.grade);
        });
        const semesters = Object.keys(semMap).sort((a, b) => a - b).map(sem => ({
            semester: Number(sem),
            avg: Utils.round(Utils.avg(semMap[sem]), 2)
        }));

        const dist = Store.gradeDistribution(grades);
        const recent = Utils.sortBy(grades, 'date', 'desc').slice(0, 6);

        const headerText = user.role === 'starosta' ?
            I18n.t('dash.overview.group') :
            I18n.t('dash.overview');

        container.innerHTML =
            '<h3 class="section-title" style="margin-top:0">' + headerText + '</h3>' +

            '<div class="grid grid--stats">' +
            statCard(I18n.t('dash.card.totalStudents'), students.length, '👨‍🎓', '', I18n.t('dash.card.totalStudents.hint')) +
            statCard(I18n.t('dash.card.groups'), groups.length, '👥', '', I18n.t('dash.card.groups.hint')) +
            statCard(I18n.t('dash.card.avg'), avg.toFixed(2), '⭐', '', I18n.t('dash.card.avg.hint')) +
            statCard(I18n.t('dash.card.perf'), perf + '%', '📈', perf >= 85 ? 'green' : perf >= 70 ? 'yellow' : 'red', I18n.t('dash.card.perf.hint')) +
            statCard(I18n.t('dash.card.risk'), risk.length, '⚠️', risk.length ? 'red' : 'green', I18n.t('dash.card.risk.hint')) +
            '</div>' +

            '<div class="grid grid--2 mt-24">' +
            '<div class="card">' +
            '<div class="card__head"><div>' +
            '<h3 class="card__title">' + I18n.t('dash.chart.bySubjects') + '</h3>' +
            '<p class="card__sub">' + I18n.t('dash.chart.bySubjects.sub') + '</p>' +
            '</div></div>' +
            '<div class="chart-box"><canvas id="chartSubjects"></canvas></div>' +
            '</div>' +
            '<div class="card">' +
            '<div class="card__head"><div>' +
            '<h3 class="card__title">' + I18n.t('dash.chart.bySemesters') + '</h3>' +
            '<p class="card__sub">' + I18n.t('dash.chart.bySemesters.sub') + '</p>' +
            '</div></div>' +
            '<div class="chart-box"><canvas id="chartSemesters"></canvas></div>' +
            '</div>' +
            '</div>' +

            '<div class="grid grid--2 mt-16">' +
            '<div class="card">' +
            '<div class="card__head"><div>' +
            '<h3 class="card__title">' + I18n.t('dash.chart.distribution') + '</h3>' +
            '<p class="card__sub">' + I18n.t('dash.chart.distribution.sub') + '</p>' +
            '</div></div>' +
            '<div class="chart-box chart-box--sm"><canvas id="chartDist"></canvas></div>' +
            '</div>' +
            '<div class="card">' +
            '<div class="card__head"><div>' +
            '<h3 class="card__title">' + I18n.t('dash.chart.top5') + '</h3>' +
            '<p class="card__sub">' + I18n.t('dash.chart.top5.sub') + '</p>' +
            '</div></div>' +
            '<div class="chart-box chart-box--sm"><canvas id="chartTop"></canvas></div>' +
            '</div>' +
            '</div>' +

            '<div class="grid grid--2 mt-16">' +
            '<div class="card">' +
            '<div class="card__head"><div>' +
            '<h3 class="card__title">' + I18n.t('dash.insights.title') + '</h3>' +
            '<p class="card__sub">' + I18n.t('dash.insights.sub') + '</p>' +
            '</div></div>' +
            '<div class="insights">' + renderInsights(avg, perf, risk, bestSubject, worstSubject, semesters) + '</div>' +
            '</div>' +

            '<div class="card">' +
            '<div class="card__head"><div>' +
            '<h3 class="card__title">' + I18n.t('dash.recent.title') + '</h3>' +
            '<p class="card__sub">' + I18n.t('dash.recent.sub') + '</p>' +
            '</div></div>' +
            (recent.length ?
                '<div class="table-scroll" style="margin:-6px -20px -18px">' +
                '<table class="data" style="min-width:480px">' +
                '<thead><tr>' +
                '<th>' + I18n.t('common.student2') + '</th>' +
                '<th>' + I18n.t('common.subject') + '</th>' +
                '<th>' + I18n.t('common.grade') + '</th>' +
                '<th>' + I18n.t('common.date') + '</th>' +
                '</tr></thead>' +
                '<tbody>' +
                recent.map(g => {
                    const s = Store.getStudent(g.studentId);
                    const sub = Store.getSubject(g.subjectId);
                    return '<tr>' +
                        '<td class="cell-name">' + Utils.escapeHtml(s ? s.fullName : '—') + '</td>' +
                        '<td class="cell-muted">' + Utils.escapeHtml(sub ? sub.name : '—') + '</td>' +
                        '<td>' + gradeBadge(g.grade) + '</td>' +
                        '<td class="cell-muted">' + Utils.formatDate(g.date) + '</td>' +
                        '</tr>';
                }).join('') +
                '</tbody>' +
                '</table>' +
                '</div>' :
                Utils.emptyState(I18n.t('dash.recent.empty.title'), I18n.t('dash.recent.empty.text'))) +
            '</div>' +
            '</div>';

        setTimeout(() => {
            if (subjectStats.length) {
                Charts.bar('chartSubjects',
                    subjectStats.map(s => s.name),
                    subjectStats.map(s => s.avg),
                    Charts.palette().accent, true);
            }
            if (semesters.length) {
                Charts.line('chartSemesters',
                    semesters.map(s => I18n.format('dash.semesterN', { n: s.semester })),
                    semesters.map(s => s.avg));
            }
            Charts.doughnut('chartDist', [I18n.t('chart.grade5'), I18n.t('chart.grade4'), I18n.t('chart.grade3'), I18n.t('chart.grade2')], [dist[5], dist[4], dist[3], dist[2]]);

            const top = Store.rating(students).slice(0, 5);
            if (top.length) {
                Charts.bar('chartTop',
                    top.map(s => s.fullName.split(' ')[0] + ' ' + (s.fullName.split(' ')[1] || '')),
                    top.map(s => s.average),
                    Charts.palette().green, true);
            }
        }, 0);
    };

    /* ============================================================
       ЛИЧНЫЙ КАБИНЕТ СТУДЕНТА / СТАРОСТЫ
       ============================================================ */
    const renderStudentView = (container, user) => {
        const stats = Store.studentStats(user.studentId);
        const student = Store.getStudent(user.studentId);

        if (!student) {
            container.innerHTML = Utils.emptyState(
                I18n.t('my.profile.notFound'),
                I18n.t('my.profile.notFound.text')
            );
            return;
        }

        const semMap = {};
        stats.grades.forEach(g => {
            if (!semMap[g.semester]) semMap[g.semester] = [];
            semMap[g.semester].push(g.grade);
        });
        const semKeys = Object.keys(semMap).sort((a, b) => a - b);
        const semAvg = semKeys.map(k => Utils.round(Utils.avg(semMap[k]), 2));

        const subjMap = {};
        stats.grades.forEach(g => {
            if (!subjMap[g.subjectId]) subjMap[g.subjectId] = [];
            subjMap[g.subjectId].push(g.grade);
        });
        const subjKeys = Object.keys(subjMap);
        const subjLabels = subjKeys.map(id => {
            const s = Store.getSubject(id);
            return s ? s.name : '—';
        });
        const subjAvg = subjKeys.map(id => Utils.round(Utils.avg(subjMap[id]), 2));

        const sortedGrades = Utils.sortBy(stats.grades, 'date', 'desc');

        container.innerHTML =
            '<div class="detail-head">' +
            '<div class="avatar">' + Utils.initials(student.fullName) + '</div>' +
            '<div class="detail-head__info">' +
            '<h3 class="detail-head__name">' + Utils.escapeHtml(student.fullName) + '</h3>' +
            '<div class="detail-head__meta">' +
            '<span class="badge badge--gray">' + Utils.escapeHtml(student.group) + '</span>' +
            '<span>' + student.course + ' ' + I18n.t('students.courseSuffix') + '</span>' +
            '<span>·</span>' +
            '<span>' + Utils.escapeHtml(student.specialty) + '</span>' +
            '</div>' +
            '</div>' +
            '<span class="badge ' + stats.status.cls + '">' + I18n.t('status.' + stats.status.key) + '</span>' +
            '</div>' +

            '<div class="grid grid--stats mt-16">' +
            statCard(I18n.t('my.avg'), stats.average.toFixed(2), '⭐', '', I18n.t('my.avg.hint')) +
            statCard(I18n.t('my.perf'), stats.performance + '%', '📈', stats.performance >= 85 ? 'green' : stats.performance >= 70 ? 'yellow' : 'red', I18n.t('my.perf.hint')) +
            statCard(I18n.t('my.count'), stats.count, '📝', '', I18n.t('my.count.hint')) +
            statCard(I18n.t('my.five'), stats.byGrade[5], '🅰️', 'green', I18n.t('my.five.hint')) +
            statCard(I18n.t('my.four'), stats.byGrade[4], '🅱️', '', I18n.t('my.four.hint')) +
            statCard(I18n.t('my.three'), stats.byGrade[3], '🅲', 'yellow', I18n.t('my.three.hint')) +
            statCard(I18n.t('my.two'), stats.byGrade[2], '🅳', stats.byGrade[2] ? 'red' : '', I18n.t('my.two.hint')) +
            '</div>' +

            '<div class="grid grid--2 mt-16">' +
            '<div class="card">' +
            '<div class="card__head"><h3 class="card__title">' + I18n.t('my.chart.sem') + '</h3></div>' +
            '<div class="chart-box"><canvas id="stChartSem"></canvas></div>' +
            '</div>' +
            '<div class="card">' +
            '<div class="card__head"><h3 class="card__title">' + I18n.t('my.chart.subj') + '</h3></div>' +
            '<div class="chart-box"><canvas id="stChartSubj"></canvas></div>' +
            '</div>' +
            '</div>' +

            '<h3 class="section-title">' + I18n.t('my.grades.title') + '</h3>' +
            '<div class="table-wrap">' +
            (sortedGrades.length ?
                '<div class="table-scroll">' +
                '<table class="data">' +
                '<thead><tr>' +
                '<th>' + I18n.t('common.subject') + '</th>' +
                '<th>' + I18n.t('common.grade') + '</th>' +
                '<th>' + I18n.t('common.semester') + '</th>' +
                '<th>' + I18n.t('common.date') + '</th>' +
                '<th>' + I18n.t('common.teacher2') + '</th>' +
                '</tr></thead>' +
                '<tbody>' +
                sortedGrades.map(g => {
                    const subj = Store.getSubject(g.subjectId);
                    const teacher = Store.getUserById(g.teacherId);
                    return '<tr>' +
                        '<td class="cell-name">' + Utils.escapeHtml(subj ? subj.name : '—') + '</td>' +
                        '<td>' + gradeBadge(g.grade) + '</td>' +
                        '<td class="cell-muted">' + g.semester + '</td>' +
                        '<td class="cell-muted">' + Utils.formatDate(g.date) + '</td>' +
                        '<td class="cell-muted">' + Utils.escapeHtml(teacher ? teacher.name : (subj ? subj.teacher : '—')) + '</td>' +
                        '</tr>';
                }).join('') +
                '</tbody>' +
                '</table>' +
                '</div>' :
                Utils.emptyState(I18n.t('my.grades.empty'), I18n.t('my.grades.empty.text'))) +
            '</div>';

        setTimeout(() => {
            if (semKeys.length) {
                Charts.line('stChartSem', semKeys.map(k => I18n.format('dash.semesterN', { n: k })), semAvg);
            } else {
                Charts.line('stChartSem', [I18n.t('dash.noData')], [0]);
            }
            if (subjKeys.length) {
                Charts.bar('stChartSubj', subjLabels, subjAvg, Charts.palette().accent, true);
            }
        }, 0);
    };

    /* ============================================================
       Вспомогательные
       ============================================================ */
    const statCard = (label, value, icon, tone, hint) => {
        tone = tone || '';
        hint = hint || '';
        return '<div class="stat">' +
            '<div class="stat__top">' +
            '<span class="stat__label">' + Utils.escapeHtml(label) + '</span>' +
            '<span class="stat__icon ' + (tone ? 'stat__icon--' + tone : '') + '">' + icon + '</span>' +
            '</div>' +
            '<div class="stat__value">' + value + '</div>' +
            (hint ? '<div class="stat__hint">' + Utils.escapeHtml(hint) + '</div>' : '') +
            '</div>';
    };

    const gradeBadge = (grade) => {
        const cls = grade === 5 ? 'badge--green' : grade === 4 ? 'badge--blue' : grade === 3 ? 'badge--yellow' : 'badge--red';
        return '<span class="badge ' + cls + '">' + grade + '</span>';
    };

    const renderInsights = (avg, perf, risk, best, worst, semesters) => {
        const items = [];

        items.push({
            icon: '📊',
            cls: '',
            text: I18n.format('insight.avg', { avg: avg.toFixed(2), perf: perf })
        });

        if (best) {
            items.push({
                icon: '🏆',
                cls: 'insight--good',
                text: I18n.format('insight.best', { name: Utils.escapeHtml(best.name), avg: best.avg.toFixed(2) })
            });
        }
        if (worst && best && worst.id !== best.id) {
            items.push({
                icon: '⚠️',
                cls: 'insight--warn',
                text: I18n.format('insight.worst', { name: Utils.escapeHtml(worst.name), avg: worst.avg.toFixed(2) })
            });
        }

        if (risk.length) {
            items.push({
                icon: '🔔',
                cls: risk.length >= 3 ? 'insight--bad' : 'insight--warn',
                text: I18n.format('insight.risk', { n: risk.length })
            });
        } else {
            items.push({ icon: '✅', cls: 'insight--good', text: I18n.t('insight.noRisk') });
        }

        if (semesters.length >= 2) {
            const diff = Utils.round(semesters[semesters.length - 1].avg - semesters[0].avg, 2);
            const sign = diff > 0 ? '+' : '';
            items.push({
                icon: diff >= 0 ? '📈' : '📉',
                cls: diff >= 0 ? 'insight--good' : 'insight--warn',
                text: I18n.format('insight.progress', { diff: sign + diff.toFixed(2) })
            });
        }

        return items.map(i =>
            '<div class="insight ' + i.cls + '">' +
            '<div class="insight__icon">' + i.icon + '</div>' +
            '<div>' + i.text + '</div>' +
            '</div>'
        ).join('');
    };

    return {
        render: render,
        renderStudentView: renderStudentView
    };
})();