/* ============================================================
   СТРАНИЦА: АНАЛИТИКА
   ============================================================ */
const AnalyticsPage = (() => {
    const render = (container) => {
        const user = Store.getCurrentUser();
        if (user.role === 'student') { container.innerHTML = Utils.emptyState('—', '—', '🔒'); return; }

        const state = { group: 'all', course: 'all', semester: 'all', subject: 'all', periodFrom: '', periodTo: '' };
        const groups = Store.visibleGroups();
        const courses = [].concat.apply([], groups.map(g => g.course)).filter((v, i, a) => a.indexOf(v) === i).sort();
        const semesters = [].concat.apply([], Store.visibleGrades().map(g => g.semester)).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);
        const subjects = Store.getSubjects();

        container.innerHTML =
            '<div class="card">' +
            '<div class="card__head"><div>' +
            '<h3 class="card__title">' + I18n.t('analytics.filters') + '</h3>' +
            '<p class="card__sub">' + I18n.t('analytics.filters.sub') + '</p>' +
            '</div></div>' +
            '<div class="grid grid--3">' +
            '<label class="field"><span class="field__label">' + I18n.t('analytics.group') + '</span>' +
            '<select class="select" id="anGroup"><option value="all">' + I18n.t('analytics.allGroups') + '</option>' +
            groups.map(g => '<option value="' + Utils.escapeHtml(g.name) + '">' + Utils.escapeHtml(g.name) + '</option>').join('') + '</select></label>' +
            '<label class="field"><span class="field__label">' + I18n.t('analytics.course') + '</span>' +
            '<select class="select" id="anCourse"><option value="all">' + I18n.t('analytics.allCourses') + '</option>' +
            courses.map(c => '<option value="' + c + '">' + c + ' ' + I18n.t('groups.card.course') + '</option>').join('') + '</select></label>' +
            '<label class="field"><span class="field__label">' + I18n.t('analytics.semester') + '</span>' +
            '<select class="select" id="anSemester"><option value="all">' + I18n.t('analytics.allSemesters') + '</option>' +
            semesters.map(s => '<option value="' + s + '">' + s + ' ' + I18n.t('common.semester').toLowerCase() + '</option>').join('') + '</select></label>' +
            '<label class="field"><span class="field__label">' + I18n.t('analytics.subject') + '</span>' +
            '<select class="select" id="anSubject"><option value="all">' + I18n.t('analytics.allSubjects') + '</option>' +
            subjects.map(s => '<option value="' + s.id + '">' + Utils.escapeHtml(s.name) + '</option>').join('') + '</select></label>' +
            '<label class="field"><span class="field__label">' + I18n.t('analytics.periodFrom') + '</span><input class="input" type="date" id="anFrom"></label>' +
            '<label class="field"><span class="field__label">' + I18n.t('analytics.periodTo') + '</span><input class="input" type="date" id="anTo"></label>' +
            '</div>' +
            '<div class="row gap-8 mt-16">' +
            '<button class="btn btn--ghost btn--sm" id="anReset" type="button">' + I18n.t('analytics.reset') + '</button>' +
            '<button class="btn btn--primary btn--sm" id="anPrint" type="button">' + I18n.t('analytics.print') + '</button>' +
            '</div>' +
            '</div>' +
            '<div id="anResult" class="mt-24"></div>';

        const bind = (id, key) => Utils.$('#' + id, container).addEventListener('change', (e) => { state[key] = e.target.value;
            draw(); });
        bind('anGroup', 'group');
        bind('anCourse', 'course');
        bind('anSemester', 'semester');
        bind('anSubject', 'subject');
        Utils.$('#anFrom', container).addEventListener('change', (e) => { state.periodFrom = e.target.value;
            draw(); });
        Utils.$('#anTo', container).addEventListener('change', (e) => { state.periodTo = e.target.value;
            draw(); });
        Utils.$('#anReset', container).addEventListener('click', () => {
            state.group = 'all';
            state.course = 'all';
            state.semester = 'all';
            state.subject = 'all';
            state.periodFrom = '';
            state.periodTo = '';
            container.querySelectorAll('select').forEach(s => s.value = 'all');
            container.querySelectorAll('input[type="date"]').forEach(i => i.value = '');
            draw();
        });
        Utils.$('#anPrint', container).addEventListener('click', () => window.print());

        const statCard = (label, value, icon, tone) =>
            '<div class="stat"><div class="stat__top"><span class="stat__label">' + Utils.escapeHtml(label) + '</span><span class="stat__icon ' + (tone ? 'stat__icon--' + tone : '') + '">' + icon + '</span></div><div class="stat__value">' + value + '</div></div>';

        const draw = () => {
            Charts.destroyAll();
            const result = Utils.$('#anResult', container);
            let students = Store.visibleStudents();
            if (state.group !== 'all') students = students.filter(s => s.group === state.group);
            if (state.course !== 'all') students = students.filter(s => String(s.course) === String(state.course));
            const ids = {};
            students.forEach(s => ids[s.id] = true);

            let grades = Store.visibleGrades().filter(g => ids[g.studentId]);
            if (state.semester !== 'all') grades = grades.filter(g => String(g.semester) === String(state.semester));
            if (state.subject !== 'all') grades = grades.filter(g => g.subjectId === state.subject);
            if (state.periodFrom) grades = grades.filter(g => g.date >= state.periodFrom);
            if (state.periodTo) grades = grades.filter(g => g.date <= state.periodTo);

            if (!grades.length) { result.innerHTML = Utils.emptyState(I18n.t('analytics.noData'), I18n.t('analytics.noData.text'), '📭'); return; }

            const avg = Utils.round(Utils.avg(grades.map(g => g.grade)), 2);
            const perf = Utils.perfPercent(grades);
            const dist = Store.gradeDistribution(grades);

            const studentAvgs = students.map(s => {
                const gs = grades.filter(g => g.studentId === s.id);
                return { student: s, avg: gs.length ? Utils.round(Utils.avg(gs.map(g => g.grade)), 2) : 0, count: gs.length };
            }).filter(x => x.count > 0);

            const excellent = studentAvgs.filter(x => x.avg >= 4.5).length;
            const atRisk = studentAvgs.filter(x => x.avg < 3.5).length;

            const subjMap = {};
            grades.forEach(g => { if (!subjMap[g.subjectId]) subjMap[g.subjectId] = [];
                subjMap[g.subjectId].push(g.grade); });
            const subjStats = Object.keys(subjMap).map(id => { const s = Store.getSubject(id); return { id, name: s ? s.name : '—', avg: Utils.round(Utils.avg(subjMap[id]), 2), count: subjMap[id].length }; });
            const bestSubj = subjStats.slice().sort((a, b) => b.avg - a.avg)[0];
            const worstSubj = subjStats.slice().sort((a, b) => a.avg - b.avg)[0];
            const bestStudent = studentAvgs.slice().sort((a, b) => b.avg - a.avg)[0];

            let riskTable;
            if (atRisk === 0) riskTable = Utils.emptyState(I18n.t('analytics.risk.empty'), I18n.t('analytics.risk.empty.text'), '✅');
            else riskTable = '<div class="table-scroll"><table class="data"><thead><tr><th>' + I18n.t('students.table.name') + '</th><th>' + I18n.t('students.table.group') + '</th><th>' + I18n.t('students.table.avg') + '</th><th>' + I18n.t('subjects.card.grades') + '</th></tr></thead><tbody>' +
                studentAvgs.filter(x => x.avg < 3.5).sort((a, b) => a.avg - b.avg).map(x =>
                    '<tr><td class="cell-name">' + Utils.escapeHtml(x.student.fullName) + '</td><td>' + Utils.escapeHtml(x.student.group) + '</td><td><span class="badge badge--red">' + x.avg.toFixed(2) + '</span></td><td class="cell-muted">' + x.count + '</td></tr>'
                ).join('') + '</tbody></table></div>';

            result.innerHTML =
                '<div class="grid grid--stats">' +
                statCard(I18n.t('analytics.avg'), avg.toFixed(2), '⭐', '') +
                statCard(I18n.t('analytics.perf'), perf + '%', '📈', perf >= 85 ? 'green' : perf >= 70 ? 'yellow' : 'red') +
                statCard(I18n.t('analytics.students'), studentAvgs.length, '👨‍🎓', '') +
                statCard(I18n.t('analytics.excellent'), excellent, '🏅', 'green') +
                statCard(I18n.t('analytics.low'), atRisk, '⚠️', atRisk ? 'red' : 'green') +
                '</div>' +
                '<div class="grid grid--2 mt-16">' +
                '<div class="card"><div class="card__head"><h3 class="card__title">' + I18n.t('dash.chart.distribution') + '</h3></div><div class="chart-box chart-box--sm"><canvas id="anDistChart"></canvas></div></div>' +
                '<div class="card"><div class="card__head"><h3 class="card__title">' + I18n.t('dash.chart.bySubjects') + '</h3></div><div class="chart-box chart-box--sm"><canvas id="anSubjChart"></canvas></div></div>' +
                '</div>' +
                '<div class="grid grid--3 mt-16">' +
                '<div class="card"><div class="kv__label">' + I18n.t('analytics.bestSubject') + '</div><div class="kv__value" style="font-size:15px;margin-top:6px">' + (bestSubj ? Utils.escapeHtml(bestSubj.name) : '—') + '</div><div class="muted" style="margin-top:4px">' + I18n.t('analytics.avgScore') + ': <b>' + (bestSubj ? bestSubj.avg.toFixed(2) : '—') + '</b></div></div>' +
                '<div class="card"><div class="kv__label">' + I18n.t('analytics.worstSubject') + '</div><div class="kv__value" style="font-size:15px;margin-top:6px">' + (worstSubj ? Utils.escapeHtml(worstSubj.name) : '—') + '</div><div class="muted" style="margin-top:4px">' + I18n.t('analytics.avgScore') + ': <b>' + (worstSubj ? worstSubj.avg.toFixed(2) : '—') + '</b></div></div>' +
                '<div class="card"><div class="kv__label">' + I18n.t('analytics.bestStudent') + '</div><div class="kv__value" style="font-size:15px;margin-top:6px">' + (bestStudent ? Utils.escapeHtml(bestStudent.student.fullName) : '—') + '</div><div class="muted" style="margin-top:4px">' + I18n.t('analytics.avgScore') + ': <b>' + (bestStudent ? bestStudent.avg.toFixed(2) : '—') + '</b></div></div>' +
                '</div>' +
                '<h3 class="section-title">' + I18n.t('analytics.risk.title') + '</h3>' +
                '<div class="table-wrap">' + riskTable + '</div>';

            setTimeout(() => {
                Charts.doughnut('anDistChart', [I18n.t('chart.grade5'), I18n.t('chart.grade4'), I18n.t('chart.grade3'), I18n.t('chart.grade2')], [dist[5], dist[4], dist[3], dist[2]]);
                Charts.bar('anSubjChart', subjStats.map(s => s.name), subjStats.map(s => s.avg), Charts.palette().accent, true);
            }, 0);
        };

        draw();
    };
    return { render };
})();