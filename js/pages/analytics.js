/* ============================================================
   СТРАНИЦА: АНАЛИТИКА
   ============================================================ */
const AnalyticsPage = (() => {

    const render = (container) => {
        const user = Store.getCurrentUser();
        if (user.role === 'student') {
            container.innerHTML = Utils.emptyState('Раздел недоступен', 'У вашей роли нет доступа к аналитике.', '🔒');
            return;
        }

        const state = {
            group: 'all',
            course: 'all',
            semester: 'all',
            subject: 'all',
            periodFrom: '',
            periodTo: ''
        };

        // ★ Для старосты — только его группа
        const groups = Store.visibleGroups();
        const courses = [].concat.apply([], groups.map(g => g.course))
            .filter((v, i, a) => a.indexOf(v) === i)
            .sort();
        const semesters = [].concat.apply([], Store.visibleGrades().map(g => g.semester))
            .filter((v, i, a) => a.indexOf(v) === i)
            .sort((a, b) => a - b);
        const subjects = Store.getSubjects();

        container.innerHTML =
            '<div class="card">' +
            '<div class="card__head">' +
            '<div>' +
            '<h3 class="card__title">Фильтры</h3>' +
            '<p class="card__sub">Выберите параметры — все показатели пересчитаются автоматически</p>' +
            '</div>' +
            '</div>' +
            '<div class="grid grid--3">' +
            '<label class="field">' +
            '<span class="field__label">Группа</span>' +
            '<select class="select" id="anGroup">' +
            '<option value="all">Все группы</option>' +
            groups.map(g => '<option value="' + Utils.escapeHtml(g.name) + '">' + Utils.escapeHtml(g.name) + '</option>').join('') +
            '</select>' +
            '</label>' +
            '<label class="field">' +
            '<span class="field__label">Курс</span>' +
            '<select class="select" id="anCourse">' +
            '<option value="all">Все курсы</option>' +
            courses.map(c => '<option value="' + c + '">' + c + ' курс</option>').join('') +
            '</select>' +
            '</label>' +
            '<label class="field">' +
            '<span class="field__label">Семестр</span>' +
            '<select class="select" id="anSemester">' +
            '<option value="all">Все семестры</option>' +
            semesters.map(s => '<option value="' + s + '">' + s + ' семестр</option>').join('') +
            '</select>' +
            '</label>' +
            '<label class="field">' +
            '<span class="field__label">Предмет</span>' +
            '<select class="select" id="anSubject">' +
            '<option value="all">Все предметы</option>' +
            subjects.map(s => '<option value="' + s.id + '">' + Utils.escapeHtml(s.name) + '</option>').join('') +
            '</select>' +
            '</label>' +
            '<label class="field">' +
            '<span class="field__label">Период с</span>' +
            '<input class="input" type="date" id="anFrom">' +
            '</label>' +
            '<label class="field">' +
            '<span class="field__label">Период по</span>' +
            '<input class="input" type="date" id="anTo">' +
            '</label>' +
            '</div>' +
            '<div class="row gap-8 mt-16">' +
            '<button class="btn btn--ghost btn--sm" id="anReset" type="button">Сбросить фильтры</button>' +
            '<button class="btn btn--primary btn--sm" id="anPrint" type="button">🖨 Распечатать отчёт</button>' +
            '</div>' +
            '</div>' +
            '<div id="anResult" class="mt-24"></div>';

        const bindChange = (id, key) => {
            Utils.$('#' + id, container).addEventListener('change', (e) => {
                state[key] = e.target.value;
                drawResult();
            });
        };
        bindChange('anGroup', 'group');
        bindChange('anCourse', 'course');
        bindChange('anSemester', 'semester');
        bindChange('anSubject', 'subject');
        Utils.$('#anFrom', container).addEventListener('change', (e) => { state.periodFrom = e.target.value;
            drawResult(); });
        Utils.$('#anTo', container).addEventListener('change', (e) => { state.periodTo = e.target.value;
            drawResult(); });

        Utils.$('#anReset', container).addEventListener('click', () => {
            state.group = 'all';
            state.course = 'all';
            state.semester = 'all';
            state.subject = 'all';
            state.periodFrom = '';
            state.periodTo = '';
            container.querySelectorAll('select').forEach(s => s.value = 'all');
            container.querySelectorAll('input[type="date"]').forEach(i => i.value = '');
            drawResult();
        });

        Utils.$('#anPrint', container).addEventListener('click', () => window.print());

        const statCard = (label, value, icon, tone) =>
            '<div class="stat">' +
            '<div class="stat__top">' +
            '<span class="stat__label">' + Utils.escapeHtml(label) + '</span>' +
            '<span class="stat__icon ' + (tone ? 'stat__icon--' + tone : '') + '">' + icon + '</span>' +
            '</div>' +
            '<div class="stat__value">' + value + '</div>' +
            '</div>';

        const drawResult = () => {
            Charts.destroyAll();
            const result = Utils.$('#anResult', container);

            // ★ Видимость по роли
            let students = Store.visibleStudents();
            if (state.group !== 'all') students = students.filter(s => s.group === state.group);
            if (state.course !== 'all') students = students.filter(s => String(s.course) === String(state.course));

            const studentIds = {};
            students.forEach(s => studentIds[s.id] = true);

            let grades = Store.visibleGrades().filter(g => studentIds[g.studentId]);
            if (state.semester !== 'all') grades = grades.filter(g => String(g.semester) === String(state.semester));
            if (state.subject !== 'all') grades = grades.filter(g => g.subjectId === state.subject);
            if (state.periodFrom) grades = grades.filter(g => g.date >= state.periodFrom);
            if (state.periodTo) grades = grades.filter(g => g.date <= state.periodTo);

            if (!grades.length) {
                result.innerHTML = Utils.emptyState('Нет данных', 'По выбранным фильтрам ничего не найдено.', '📭');
                return;
            }

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
            grades.forEach(g => {
                if (!subjMap[g.subjectId]) subjMap[g.subjectId] = [];
                subjMap[g.subjectId].push(g.grade);
            });
            const subjStats = Object.keys(subjMap).map(id => {
                const subj = Store.getSubject(id);
                return { id: id, name: subj ? subj.name : '—', avg: Utils.round(Utils.avg(subjMap[id]), 2), count: subjMap[id].length };
            });
            const bestSubj = subjStats.slice().sort((a, b) => b.avg - a.avg)[0];
            const worstSubj = subjStats.slice().sort((a, b) => a.avg - b.avg)[0];
            const bestStudent = studentAvgs.slice().sort((a, b) => b.avg - a.avg)[0];

            let riskTable;
            if (atRisk === 0) {
                riskTable = Utils.emptyState('Отлично!', 'По выбранным фильтрам студентов с низким средним баллом нет.', '✅');
            } else {
                riskTable =
                    '<div class="table-scroll"><table class="data">' +
                    '<thead><tr><th>ФИО</th><th>Группа</th><th>Средний балл</th><th>Оценок</th></tr></thead>' +
                    '<tbody>' +
                    studentAvgs.filter(x => x.avg < 3.5).sort((a, b) => a.avg - b.avg).map(x =>
                        '<tr>' +
                        '<td class="cell-name">' + Utils.escapeHtml(x.student.fullName) + '</td>' +
                        '<td>' + Utils.escapeHtml(x.student.group) + '</td>' +
                        '<td><span class="badge badge--red">' + x.avg.toFixed(2) + '</span></td>' +
                        '<td class="cell-muted">' + x.count + '</td>' +
                        '</tr>'
                    ).join('') +
                    '</tbody>' +
                    '</table></div>';
            }

            result.innerHTML =
                '<div class="grid grid--stats">' +
                statCard('Средний балл', avg.toFixed(2), '⭐', '') +
                statCard('Успеваемость', perf + '%', '📈', perf >= 85 ? 'green' : perf >= 70 ? 'yellow' : 'red') +
                statCard('Студентов', studentAvgs.length, '👨‍🎓', '') +
                statCard('Отличников', excellent, '🏅', 'green') +
                statCard('Низкие результаты', atRisk, '⚠️', atRisk ? 'red' : 'green') +
                '</div>' +

                '<div class="grid grid--2 mt-16">' +
                '<div class="card">' +
                '<div class="card__head"><h3 class="card__title">Распределение оценок</h3></div>' +
                '<div class="chart-box chart-box--sm"><canvas id="anDistChart"></canvas></div>' +
                '</div>' +
                '<div class="card">' +
                '<div class="card__head"><h3 class="card__title">Средний балл по предметам</h3></div>' +
                '<div class="chart-box chart-box--sm"><canvas id="anSubjChart"></canvas></div>' +
                '</div>' +
                '</div>' +

                '<div class="grid grid--3 mt-16">' +
                '<div class="card">' +
                '<div class="kv__label">Лучший предмет</div>' +
                '<div class="kv__value" style="font-size:15px;margin-top:6px">' + (bestSubj ? Utils.escapeHtml(bestSubj.name) : '—') + '</div>' +
                '<div class="muted" style="margin-top:4px">Средний балл: <b>' + (bestSubj ? bestSubj.avg.toFixed(2) : '—') + '</b></div>' +
                '</div>' +
                '<div class="card">' +
                '<div class="kv__label">Предмет с низким баллом</div>' +
                '<div class="kv__value" style="font-size:15px;margin-top:6px">' + (worstSubj ? Utils.escapeHtml(worstSubj.name) : '—') + '</div>' +
                '<div class="muted" style="margin-top:4px">Средний балл: <b>' + (worstSubj ? worstSubj.avg.toFixed(2) : '—') + '</b></div>' +
                '</div>' +
                '<div class="card">' +
                '<div class="kv__label">Самый успешный студент</div>' +
                '<div class="kv__value" style="font-size:15px;margin-top:6px">' + (bestStudent ? Utils.escapeHtml(bestStudent.student.fullName) : '—') + '</div>' +
                '<div class="muted" style="margin-top:4px">Средний балл: <b>' + (bestStudent ? bestStudent.avg.toFixed(2) : '—') + '</b></div>' +
                '</div>' +
                '</div>' +

                '<h3 class="section-title">Студенты с низкими результатами (&lt; 3.5)</h3>' +
                '<div class="table-wrap">' + riskTable + '</div>';

            setTimeout(() => {
                Charts.doughnut('anDistChart', ['Отлично (5)', 'Хорошо (4)', 'Удовл. (3)', 'Неуд. (2)'], [dist[5], dist[4], dist[3], dist[2]]);
                Charts.bar('anSubjChart',
                    subjStats.map(s => s.name),
                    subjStats.map(s => s.avg),
                    Charts.palette().accent,
                    true);
            }, 0);
        };

        drawResult();
    };

    return { render: render };
})();