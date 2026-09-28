/* ============================================================
   СТРАНИЦА: ПРЕДМЕТЫ — карточки со статистикой по дисциплинам
   ============================================================ */
const SubjectsPage = (() => {

    const render = (container) => {
        const user = Store.getCurrentUser();
        if (user.role === 'student') {
            container.innerHTML = Utils.emptyState('Раздел недоступен', 'У вашей роли нет доступа к статистике предметов.', '🔒');
            return;
        }

        const subjects = Store.getSubjects();

        const cardsHtml = subjects.map(subj => {
            const grades = Store.subjectGrades(subj.id);
            const avg = Store.subjectAverage(subj.id);
            const perf = Store.subjectPerformance(subj.id);
            const count = Store.subjectStudentsCount(subj.id);
            const status = Utils.statusOf(avg);
            return `
        <div class="card card--hover" style="cursor:pointer" data-subject="${subj.id}">
          <div class="card__head">
            <div>
              <h3 class="card__title">${Utils.escapeHtml(subj.name)}</h3>
              <p class="card__sub">${Utils.escapeHtml(subj.teacher)}</p>
            </div>
            <span class="badge ${status.cls}">${avg.toFixed(2)}</span>
          </div>
          <div class="kv">
            <div class="kv__item">
              <div class="kv__label">Студентов</div>
              <div class="kv__value">${count}</div>
            </div>
            <div class="kv__item">
              <div class="kv__label">Оценок</div>
              <div class="kv__value">${grades.length}</div>
            </div>
            <div class="kv__item">
              <div class="kv__label">Успеваемость</div>
              <div class="kv__value">${perf}%</div>
            </div>
          </div>
        </div>
      `;
        }).join('');

        container.innerHTML = `
      <div class="grid grid--3">
        ${cardsHtml || Utils.emptyState('Предметов нет', 'Добавьте первый предмет.')}
      </div>
    `;

        // Клик по карточке — детали предмета
        container.addEventListener('click', (e) => {
            const card = e.target.closest('[data-subject]');
            if (!card) return;
            openSubjectDetail(card.dataset.subject);
        });

        // Кнопка "Добавить"
        const actions = Utils.$('#topbarActions');
        actions.innerHTML = `<button class="btn btn--primary" id="addSubjectBtn" type="button">+ Добавить предмет</button>`;
        Utils.$('#addSubjectBtn').addEventListener('click', () => {
            openSubjectModal(null, () => SubjectsPage.render(container));
        });
    };

    /* ---------------- Модальное окно создания/редактирования ---------------- */
    const openSubjectModal = (subjectId, onSave) => {
        const isEdit = Boolean(subjectId);
        const s = isEdit ? Store.getSubject(subjectId) : null;

        Utils.modal({
            title: isEdit ? 'Редактировать предмет' : 'Новый предмет',
            body: `
        <label class="field">
          <span class="field__label">Название предмета</span>
          <input class="input" id="mSubName" type="text" value="${s ? Utils.escapeHtml(s.name) : ''}" placeholder="Программирование">
        </label>
        <label class="field">
          <span class="field__label">Преподаватель</span>
          <input class="input" id="mSubTeacher" type="text" value="${s ? Utils.escapeHtml(s.teacher) : ''}" placeholder="Кузнецов А.В.">
        </label>
      `,
            footer: `
        <button class="btn btn--ghost" data-close type="button">Отмена</button>
        <button class="btn btn--primary" id="mSubSave" type="button">${isEdit ? 'Сохранить' : 'Добавить'}</button>
      `,
            onMount: (wrap, close) => {
                wrap.querySelector('#mSubSave').addEventListener('click', () => {
                    const name = wrap.querySelector('#mSubName').value.trim();
                    const teacher = wrap.querySelector('#mSubTeacher').value.trim();
                    if (!name) { Utils.toast('Введите название предмета', 'warn'); return; }
                    if (isEdit) {
                        Store.updateSubject(subjectId, { name, teacher });
                        Utils.toast('Предмет обновлён', 'success');
                    } else {
                        Store.addSubject({ name, teacher });
                        Utils.toast('Предмет добавлен', 'success');
                    }
                    close();
                    if (onSave) onSave();
                });
            }
        });
    };

    /* ---------------- Детали предмета ---------------- */
    const openSubjectDetail = (subjectId) => {
        const subj = Store.getSubject(subjectId);
        if (!subj) return;

        const grades = Store.subjectGrades(subjectId);
        const avg = Store.subjectAverage(subjectId);
        const perf = Store.subjectPerformance(subjectId);
        const dist = Store.gradeDistribution(grades);
        const studentsCount = Store.subjectStudentsCount(subjectId);

        // Распределение по группам
        const groupMap = {};
        grades.forEach(g => {
            const s = Store.getStudent(g.studentId);
            if (!s) return;
            if (!groupMap[s.group]) groupMap[s.group] = [];
            groupMap[s.group].push(g.grade);
        });
        const groupLabels = Object.keys(groupMap);
        const groupAvg = groupLabels.map(g => Utils.round(Utils.avg(groupMap[g]), 2));

        const modal = Utils.modal({
            title: subj.name,
            body: `
        <div class="kv">
          <div class="kv__item"><div class="kv__label">Преподаватель</div><div class="kv__value" style="font-size:14px">${Utils.escapeHtml(subj.teacher || '—')}</div></div>
          <div class="kv__item"><div class="kv__label">Средний балл</div><div class="kv__value">${avg.toFixed(2)}</div></div>
          <div class="kv__item"><div class="kv__label">Успеваемость</div><div class="kv__value">${perf}%</div></div>
          <div class="kv__item"><div class="kv__label">Студентов</div><div class="kv__value">${studentsCount}</div></div>
        </div>

        <h4 class="section-title" style="margin-top:20px">Распределение оценок</h4>
        <div class="chart-box chart-box--sm"><canvas id="subjDistChart"></canvas></div>

        <h4 class="section-title">Средний балл по группам</h4>
        <div class="chart-box chart-box--sm"><canvas id="subjGroupChart"></canvas></div>

        <div class="row gap-8 mt-16">
          <button class="btn btn--ghost btn--sm" id="subjEdit" type="button">✎ Редактировать</button>
          <button class="btn btn--danger btn--sm" id="subjDelete" type="button">🗑 Удалить предмет</button>
        </div>
      `,
            onMount: (wrap, close) => {
                setTimeout(() => {
                    Charts.doughnut('subjDistChart', ['Отлично (5)', 'Хорошо (4)', 'Удовл. (3)', 'Неуд. (2)'], [dist[5], dist[4], dist[3], dist[2]]);
                    if (groupLabels.length) {
                        Charts.bar('subjGroupChart', groupLabels, groupAvg, Charts.palette().accent, false);
                    }
                }, 50);

                wrap.querySelector('#subjEdit').addEventListener('click', () => {
                    close();
                    setTimeout(() => openSubjectModal(subjectId, () => {
                        location.hash = '#/subjects';
                        window.dispatchEvent(new HashChangeEvent('hashchange'));
                    }), 220);
                });

                wrap.querySelector('#subjDelete').addEventListener('click', async() => {
                    close();
                    const ok = await Utils.confirmDialog({
                        title: 'Удалить предмет?',
                        message: `Предмет «${subj.name}» и все связанные оценки будут удалены.`,
                        confirmText: 'Удалить'
                    });
                    if (!ok) return;
                    Store.deleteSubject(subjectId);
                    Utils.toast('Предмет удалён', 'success');
                    location.hash = '#/subjects';
                    window.dispatchEvent(new HashChangeEvent('hashchange'));
                });
            }
        });
    };

    return { render };
})();