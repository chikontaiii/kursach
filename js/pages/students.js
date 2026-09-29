/* ============================================================
   СТРАНИЦА: СТУДЕНТЫ — с поддержкой языков
   ============================================================ */
const StudentsPage = (() => {

    const render = (container) => {
        const user = Store.getCurrentUser();
        if (user.role === 'student') {
            container.innerHTML = Utils.emptyState('Раздел недоступен', 'У вашей роли нет доступа к списку студентов.');
            return;
        }

        const state = {
            q: '',
            group: 'all',
            course: 'all',
            sortKey: 'fullName',
            sortDir: 'asc',
            page: 1,
            perPage: 10
        };

        const groups = Store.visibleGroups();
        const courses = [].concat.apply([], Store.visibleStudents().map(s => s.course))
            .filter((v, i, a) => a.indexOf(v) === i)
            .sort();

        container.innerHTML =
            '<div class="table-wrap">' +
            '<div class="table-toolbar">' +
            '<input class="input" id="stSearch" placeholder="🔍 ' + I18n.t('students.search') + '" autocomplete="off">' +
            '<select class="select" id="stGroup">' +
            '<option value="all">' + I18n.t('students.allGroups') + '</option>' +
            groups.map(g => '<option value="' + Utils.escapeHtml(g.name) + '">' + Utils.escapeHtml(g.name) + '</option>').join('') +
            '</select>' +
            '<select class="select" id="stCourse">' +
            '<option value="all">' + I18n.t('students.allCourses') + '</option>' +
            courses.map(c => '<option value="' + c + '">' + c + ' ' + I18n.t('students.courseSuffix') + '</option>').join('') +
            '</select>' +
            '<div class="table-toolbar__spacer"></div>' +
            '<button class="btn btn--ghost btn--sm" id="stExport" type="button">' + I18n.t('students.export') + '</button>' +
            '</div>' +
            '<div id="stTableBody"></div>' +
            '</div>';

        const body = Utils.$('#stTableBody', container);
        const searchInput = Utils.$('#stSearch', container);

        /* ---------------- Фильтрация ---------------- */
        const getFiltered = () => {
            let list = Store.visibleStudents().map(s => ({
                ...s,
                average: Store.studentAverage(s.id),
                performance: Utils.perfPercent(Store.studentGrades(s.id)),
                status: Utils.statusOf(Store.studentAverage(s.id))
            }));

            const q = state.q.trim().toLowerCase();
            if (q) {
                list = list.filter(s =>
                    s.fullName.toLowerCase().indexOf(q) !== -1 ||
                    s.group.toLowerCase().indexOf(q) !== -1
                );
            }
            if (state.group !== 'all') list = list.filter(s => s.group === state.group);
            if (state.course !== 'all') list = list.filter(s => String(s.course) === String(state.course));

            return Utils.sortBy(list, (s) => {
                const k = state.sortKey;
                if (k === 'average') return s.average;
                if (k === 'performance') return s.performance;
                if (k === 'course') return s.course;
                return s[k] || '';
            }, state.sortDir);
        };

        /* ---------------- Отрисовка ---------------- */
        const draw = () => {
            const all = getFiltered();
            const total = all.length;
            const totalPages = Math.max(1, Math.ceil(total / state.perPage));
            if (state.page > totalPages) state.page = totalPages;
            const start = (state.page - 1) * state.perPage;
            const pageRows = all.slice(start, start + state.perPage);

            const sortInd = (key) => state.sortKey === key ? (state.sortDir === 'asc' ? '▲' : '▼') : '';

            if (!total) {
                body.innerHTML = Utils.emptyState(
                    I18n.t('students.empty.title'),
                    I18n.t('students.empty.text'),
                    '🔍'
                );
                return;
            }

            body.innerHTML =
                '<div class="table-scroll">' +
                '<table class="data">' +
                '<thead><tr>' +
                '<th style="width:50px">' + I18n.t('common.number') + '</th>' +
                '<th class="sortable" data-sort="fullName">' + I18n.t('students.table.name') + ' <span class="sort-ind">' + sortInd('fullName') + '</span></th>' +
                '<th class="sortable" data-sort="group">' + I18n.t('students.table.group') + ' <span class="sort-ind">' + sortInd('group') + '</span></th>' +
                '<th class="sortable" data-sort="course">' + I18n.t('students.table.course') + ' <span class="sort-ind">' + sortInd('course') + '</span></th>' +
                '<th class="sortable" data-sort="average">' + I18n.t('students.table.avg') + ' <span class="sort-ind">' + sortInd('average') + '</span></th>' +
                '<th class="sortable" data-sort="performance">' + I18n.t('students.table.perf') + ' <span class="sort-ind">' + sortInd('performance') + '</span></th>' +
                '<th>' + I18n.t('students.table.status') + '</th>' +
                '<th style="text-align:right">' + I18n.t('students.table.actions') + '</th>' +
                '</tr></thead>' +
                '<tbody>' +
                pageRows.map((s, i) =>
                    '<tr data-id="' + s.id + '">' +
                    '<td class="cell-muted">' + (start + i + 1) + '</td>' +
                    '<td class="cell-name">' + Utils.escapeHtml(s.fullName) + '</td>' +
                    '<td>' + Utils.escapeHtml(s.group) + '</td>' +
                    '<td class="cell-muted">' + s.course + '</td>' +
                    '<td><b>' + s.average.toFixed(2) + '</b></td>' +
                    '<td>' + s.performance + '%</td>' +
                    '<td><span class="badge ' + s.status.cls + '">' + I18n.t('status.' + s.status.key) + '</span></td>' +
                    '<td>' +
                    '<div class="actions">' +
                    '<button class="icon-btn icon-btn--sm" data-view="' + s.id + '" title="' + I18n.t('students.viewProfile') + '" type="button">👁</button>' +
                    '<button class="icon-btn icon-btn--sm" data-edit="' + s.id + '" title="' + I18n.t('students.edit') + '" type="button">✎</button>' +
                    '<button class="icon-btn icon-btn--sm" data-del="' + s.id + '" title="' + I18n.t('students.delete') + '" type="button">🗑</button>' +
                    '</div>' +
                    '</td>' +
                    '</tr>'
                ).join('') +
                '</tbody>' +
                '</table>' +
                '</div>' +
                '<div class="pagination">' +
                '<div class="pagination__info">' +
                I18n.t('students.showing') + ' ' + (start + 1) + '–' + Math.min(start + state.perPage, total) +
                ' ' + I18n.t('students.of') + ' ' + total +
                '</div>' +
                '<div class="pagination__btns">' +
                '<button class="page-btn" data-page="prev" ' + (state.page === 1 ? 'disabled' : '') + ' type="button">‹</button>' +
                paginationButtons(state.page, totalPages) +
                '<button class="page-btn" data-page="next" ' + (state.page === totalPages ? 'disabled' : '') + ' type="button">›</button>' +
                '</div>' +
                '</div>';
        };

        const paginationButtons = (current, total) => {
            const btns = [];
            const max = 5;
            let from = Math.max(1, current - Math.floor(max / 2));
            let to = Math.min(total, from + max - 1);
            if (to - from + 1 < max) from = Math.max(1, to - max + 1);
            for (let i = from; i <= to; i++) {
                btns.push('<button class="page-btn ' + (i === current ? 'page-btn--active' : '') + '" data-page="' + i + '" type="button">' + i + '</button>');
            }
            return btns.join('');
        };

        /* ---------------- Обработчики ---------------- */
        searchInput.addEventListener('input', Utils.debounce((e) => {
            state.q = e.target.value;
            state.page = 1;
            draw();
        }, 200));

        Utils.$('#stGroup', container).addEventListener('change', (e) => {
            state.group = e.target.value;
            state.page = 1;
            draw();
        });

        Utils.$('#stCourse', container).addEventListener('change', (e) => {
            state.course = e.target.value;
            state.page = 1;
            draw();
        });

        Utils.$('#stExport', container).addEventListener('click', () => {
            const list = getFiltered();
            const rows = [
                [
                    I18n.t('common.number'),
                    I18n.t('students.table.name'),
                    I18n.t('students.table.group'),
                    I18n.t('students.table.course'),
                    I18n.t('students.modal.specialty'),
                    I18n.t('students.table.avg'),
                    I18n.t('students.table.perf') + ', %',
                    I18n.t('students.table.status')
                ]
            ];
            list.forEach((s, i) => {
                rows.push([i + 1, s.fullName, s.group, s.course, s.specialty, s.average.toFixed(2), s.performance, I18n.t('status.' + s.status.key)]);
            });
            Utils.downloadCSV('students.csv', rows);
            Utils.toast(I18n.t('students.exportToast'), 'success');
        });

        body.addEventListener('click', async(e) => {
            const th = e.target.closest('th[data-sort]');
            if (th) {
                const key = th.dataset.sort;
                if (state.sortKey === key) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
                else { state.sortKey = key;
                    state.sortDir = 'asc'; }
                draw();
                return;
            }

            const pageBtn = e.target.closest('[data-page]');
            if (pageBtn && !pageBtn.disabled) {
                const v = pageBtn.dataset.page;
                const totalPages = Math.max(1, Math.ceil(getFiltered().length / state.perPage));
                if (v === 'prev') state.page = Math.max(1, state.page - 1);
                else if (v === 'next') state.page = Math.min(totalPages, state.page + 1);
                else state.page = Number(v);
                draw();
                return;
            }

            const viewBtn = e.target.closest('[data-view]');
            if (viewBtn) {
                location.hash = '#/student/' + viewBtn.dataset.view;
                return;
            }

            const editBtn = e.target.closest('[data-edit]');
            if (editBtn) {
                openStudentModal(editBtn.dataset.edit, draw);
                return;
            }

            const delBtn = e.target.closest('[data-del]');
            if (delBtn) {
                const s = Store.getStudent(delBtn.dataset.del);
                if (!s) return;
                const ok = await Utils.confirmDialog({
                    title: I18n.t('students.delete.title'),
                    message: I18n.t('students.delete.message'),
                    confirmText: I18n.t('students.confirmDelete')
                });
                if (!ok) return;
                Store.deleteStudent(s.id);
                Utils.toast(I18n.t('students.deleted'), 'success');
                draw();
            }
        });

        const actions = Utils.$('#topbarActions');
        actions.innerHTML = '<button class="btn btn--primary" id="addStudentBtn" type="button">' + I18n.t('students.add') + '</button>';
        Utils.$('#addStudentBtn').addEventListener('click', () => openStudentModal(null, draw));

        draw();
    };

    /* ---------------- Модальное окно ---------------- */
    const openStudentModal = (studentId, onSave) => {
        const isEdit = Boolean(studentId);
        const s = isEdit ? Store.getStudent(studentId) : null;
        const groups = Store.getGroups();

        Utils.modal({
            title: isEdit ? I18n.t('students.modal.edit') : I18n.t('students.modal.new'),
            body: '<label class="field">' +
                '<span class="field__label">' + I18n.t('students.modal.name') + '</span>' +
                '<input class="input" id="mStName" type="text" value="' + (s ? Utils.escapeHtml(s.fullName) : '') + '" placeholder="' + I18n.t('students.modal.placeholder') + '">' +
                '</label>' +
                '<label class="field">' +
                '<span class="field__label">' + I18n.t('students.modal.group') + '</span>' +
                '<select class="select" id="mStGroup">' +
                groups.map(g => '<option value="' + Utils.escapeHtml(g.name) + '" ' + (s && s.group === g.name ? 'selected' : '') + '>' + Utils.escapeHtml(g.name) + '</option>').join('') +
                '</select>' +
                '</label>' +
                '<label class="field">' +
                '<span class="field__label">' + I18n.t('students.modal.course') + '</span>' +
                '<input class="input" id="mStCourse" type="number" min="1" max="6" value="' + (s ? s.course : 1) + '">' +
                '</label>' +
                '<label class="field">' +
                '<span class="field__label">' + I18n.t('students.modal.specialty') + '</span>' +
                '<input class="input" id="mStSpecialty" type="text" value="' + (s ? Utils.escapeHtml(s.specialty) : '') + '">' +
                '</label>',
            footer: '<button class="btn btn--ghost" data-close type="button">' + I18n.t('common.cancel') + '</button>' +
                '<button class="btn btn--primary" id="mStSave" type="button">' + (isEdit ? I18n.t('common.save') : I18n.t('common.add')) + '</button>',
            onMount: (wrap, close) => {
                const save = () => {
                    const name = wrap.querySelector('#mStName').value.trim();
                    if (!name) { Utils.toast(I18n.t('students.nameRequired'), 'warn'); return; }

                    const groupName = wrap.querySelector('#mStGroup').value;
                    const group = Store.getGroupByName(groupName);
                    const course = Number(wrap.querySelector('#mStCourse').value) || 1;
                    const specialty = wrap.querySelector('#mStSpecialty').value.trim() || (group ? group.specialty : '');

                    const data = { fullName: name, group: groupName, course: group ? group.course : course, specialty: specialty };

                    if (isEdit) {
                        Store.updateStudent(studentId, data);
                        Utils.toast(I18n.t('students.updated'), 'success');
                    } else {
                        Store.addStudent(data);
                        Utils.toast(I18n.t('students.added'), 'success');
                    }
                    close();
                    if (onSave) onSave();
                };

                wrap.querySelector('#mStSave').addEventListener('click', save);
                wrap.querySelector('#mStName').addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') save();
                });
            }
        });
    };

    return { render };
})();