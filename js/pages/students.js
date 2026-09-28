/* ============================================================
   СТРАНИЦЫ: СТУДЕНТЫ — таблица с поиском, фильтрами, сортировкой
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

                    const groups = Store.getGroups();
                    const courses = [...new Set(Store.getStudents().map(s => s.course))].sort();

                    container.innerHTML = `
      <div class="table-wrap">
        <div class="table-toolbar">
          <input class="input" id="stSearch" placeholder="🔍 Поиск по ФИО..." autocomplete="off">
          <select class="select" id="stGroup">
            <option value="all">Все группы</option>
            ${groups.map(g => `<option value="${Utils.escapeHtml(g.name)}">${Utils.escapeHtml(g.name)}</option>`).join('')}
          </select>
          <select class="select" id="stCourse">
            <option value="all">Все курсы</option>
            ${courses.map(c => `<option value="${c}">${c} курс</option>`).join('')}
          </select>
          <div class="table-toolbar__spacer"></div>
          <button class="btn btn--ghost btn--sm" id="stExport" type="button">⬇ CSV</button>
        </div>
        <div id="stTableBody"></div>
      </div>
    `;

    const body = Utils.$('#stTableBody', container);
    const searchInput = Utils.$('#stSearch', container);

    /* ---------------- Получение данных с учётом фильтров ---------------- */
    const getFiltered = () => {
      let list = Store.visibleStudents().map(s => ({
        ...s,
        average: Store.studentAverage(s.id),
        performance: Utils.perfPercent(Store.studentGrades(s.id)),
        status: Utils.statusOf(Store.studentAverage(s.id))
      }));

      // Поиск
      const q = state.q.trim().toLowerCase();
      if (q) {
        list = list.filter(s =>
          s.fullName.toLowerCase().includes(q) ||
          s.group.toLowerCase().includes(q)
        );
      }

      // Фильтр по группе
      if (state.group !== 'all') {
        list = list.filter(s => s.group === state.group);
      }

      // Фильтр по курсу
      if (state.course !== 'all') {
        list = list.filter(s => String(s.course) === String(state.course));
      }

      // Сортировка
      const key = state.sortKey;
      list = Utils.sortBy(list, (s) => {
        if (key === 'average') return s.average;
        if (key === 'performance') return s.performance;
        if (key === 'course') return s.course;
        return s[key] || '';
      }, state.sortDir);

      return list;
    };

    /* ---------------- Отрисовка таблицы ---------------- */
    const draw = () => {
      const all = getFiltered();
      const total = all.length;
      const totalPages = Math.max(1, Math.ceil(total / state.perPage));
      if (state.page > totalPages) state.page = totalPages;
      const start = (state.page - 1) * state.perPage;
      const pageRows = all.slice(start, start + state.perPage);

      const sortInd = (key) => {
        if (state.sortKey !== key) return '';
        return state.sortDir === 'asc' ? '▲' : '▼';
      };

      if (!total) {
        body.innerHTML = Utils.emptyState(
          'Студенты не найдены',
          'Попробуйте изменить параметры поиска или фильтры.',
          '🔍'
        );
        return;
      }

      body.innerHTML = `
        <div class="table-scroll">
          <table class="data">
            <thead>
              <tr>
                <th style="width:50px">№</th>
                <th class="sortable" data-sort="fullName">ФИО <span class="sort-ind">${sortInd('fullName')}</span></th>
                <th class="sortable" data-sort="group">Группа <span class="sort-ind">${sortInd('group')}</span></th>
                <th class="sortable" data-sort="course">Курс <span class="sort-ind">${sortInd('course')}</span></th>
                <th class="sortable" data-sort="average">Средний балл <span class="sort-ind">${sortInd('average')}</span></th>
                <th class="sortable" data-sort="performance">Успеваемость <span class="sort-ind">${sortInd('performance')}</span></th>
                <th>Статус</th>
                <th style="text-align:right">Действия</th>
              </tr>
            </thead>
            <tbody>
              ${pageRows.map((s, i) => `
                <tr data-id="${s.id}">
                  <td class="cell-muted">${start + i + 1}</td>
                  <td class="cell-name">${Utils.escapeHtml(s.fullName)}</td>
                  <td>${Utils.escapeHtml(s.group)}</td>
                  <td class="cell-muted">${s.course} курс</td>
                  <td><b>${s.average.toFixed(2)}</b></td>
                  <td>${s.performance}%</td>
                  <td><span class="badge ${s.status.cls}">${s.status.label}</span></td>
                  <td>
                    <div class="actions">
                      <button class="icon-btn icon-btn--sm" data-view="${s.id}" title="Открыть профиль" type="button">👁</button>
                      <button class="icon-btn icon-btn--sm" data-edit="${s.id}" title="Редактировать" type="button">✎</button>
                      <button class="icon-btn icon-btn--sm" data-del="${s.id}" title="Удалить" type="button">🗑</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div class="pagination">
          <div class="pagination__info">
            Показано ${start + 1}–${Math.min(start + state.perPage, total)} из ${total}
          </div>
          <div class="pagination__btns">
            <button class="page-btn" data-page="prev" ${state.page === 1 ? 'disabled' : ''} type="button">‹</button>
            ${paginationButtons(state.page, totalPages)}
            <button class="page-btn" data-page="next" ${state.page === totalPages ? 'disabled' : ''} type="button">›</button>
          </div>
        </div>
      `;
    };

    const paginationButtons = (current, total) => {
      const btns = [];
      const max = 5;
      let from = Math.max(1, current - Math.floor(max / 2));
      let to = Math.min(total, from + max - 1);
      if (to - from + 1 < max) from = Math.max(1, to - max + 1);

      for (let i = from; i <= to; i++) {
        btns.push(`<button class="page-btn ${i === current ? 'page-btn--active' : ''}" data-page="${i}" type="button">${i}</button>`);
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
        ['№', 'ФИО', 'Группа', 'Курс', 'Специальность', 'Средний балл', 'Успеваемость, %', 'Статус']
      ];
      list.forEach((s, i) => {
        rows.push([i + 1, s.fullName, s.group, s.course, s.specialty, s.average.toFixed(2), s.performance, s.status.label]);
      });
      Utils.downloadCSV('students.csv', rows);
      Utils.toast('Список студентов экспортирован', 'success');
    });

    // Сортировка + действия (делегирование)
    body.addEventListener('click', async (e) => {
      const th = e.target.closest('th[data-sort]');
      if (th) {
        const key = th.dataset.sort;
        if (state.sortKey === key) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
        else { state.sortKey = key; state.sortDir = 'asc'; }
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
        location.hash = `#/student/${viewBtn.dataset.view}`;
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
          title: 'Удалить студента?',
          message: `Студент «${s.fullName}» и все его оценки будут удалены безвозвратно.`,
          confirmText: 'Удалить'
        });
        if (!ok) return;
        Store.deleteStudent(s.id);
        Utils.toast('Студент удалён', 'success');
        draw();
      }
    });

    /* ---------------- Кнопка "Добавить" в топбаре ---------------- */
    const actions = Utils.$('#topbarActions');
    actions.innerHTML = `<button class="btn btn--primary" id="addStudentBtn" type="button">+ Добавить студента</button>`;
    Utils.$('#addStudentBtn').addEventListener('click', () => openStudentModal(null, draw));

    // Первый рендер
    draw();
  };

  /* ============================================================
     МОДАЛЬНОЕ ОКНО: добавление / редактирование студента
     ============================================================ */
  const openStudentModal = (studentId, onSave) => {
    const isEdit = Boolean(studentId);
    const s = isEdit ? Store.getStudent(studentId) : null;
    const groups = Store.getGroups();

    Utils.modal({
      title: isEdit ? 'Редактировать студента' : 'Новый студент',
      body: `
        <label class="field">
          <span class="field__label">ФИО</span>
          <input class="input" id="mStName" type="text" value="${s ? Utils.escapeHtml(s.fullName) : ''}" placeholder="Иванов Иван Иванович">
        </label>
        <label class="field">
          <span class="field__label">Группа</span>
          <select class="select" id="mStGroup">
            ${groups.map(g => `<option value="${Utils.escapeHtml(g.name)}" ${s && s.group === g.name ? 'selected' : ''}>${Utils.escapeHtml(g.name)}</option>`).join('')}
          </select>
        </label>
        <label class="field">
          <span class="field__label">Курс</span>
          <input class="input" id="mStCourse" type="number" min="1" max="6" value="${s ? s.course : 1}">
        </label>
        <label class="field">
          <span class="field__label">Специальность</span>
          <input class="input" id="mStSpecialty" type="text" value="${s ? Utils.escapeHtml(s.specialty) : ''}" placeholder="Техники-программисты">
        </label>
      `,
      footer: `
        <button class="btn btn--ghost" data-close type="button">Отмена</button>
        <button class="btn btn--primary" id="mStSave" type="button">${isEdit ? 'Сохранить' : 'Добавить'}</button>
      `,
      onMount: (wrap, close) => {
        const save = () => {
          const name = wrap.querySelector('#mStName').value.trim();
          if (!name) { Utils.toast('Введите ФИО студента', 'warn'); return; }

          const groupName = wrap.querySelector('#mStGroup').value;
          const group = Store.getGroupByName(groupName);
          const course = Number(wrap.querySelector('#mStCourse').value) || 1;
          const specialty = wrap.querySelector('#mStSpecialty').value.trim() || (group ? group.specialty : '');

          const data = {
            fullName: name,
            group: groupName,
            course: group ? group.course : course,
            specialty
          };

          if (isEdit) {
            Store.updateStudent(studentId, data);
            Utils.toast('Данные студента обновлены', 'success');
          } else {
            Store.addStudent(data);
            Utils.toast('Студент добавлен', 'success');
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