/* ============================================================
   СТРАНИЦА: ГРУППЫ — карточки групп и подробная статистика
   ============================================================ */
const GroupsPage = (() => {

            const render = (container) => {
                const user = Store.getCurrentUser();
                if (user.role === 'student') {
                    container.innerHTML = Utils.emptyState('Раздел недоступен', 'У вашей роли нет доступа к группам.', '🔒');
                    return;
                }

                const groups = Store.visibleGroups();

                const cardsHtml = groups.map(g => {
                    const students = Store.groupStudents(g.name);
                    const avg = Store.groupAverage(g.name);
                    const perf = Store.groupPerformance(g.name);
                    const status = Utils.statusOf(avg);
                    return `
        <div class="card card--hover" style="cursor:pointer" data-group="${g.id}">
          <div class="card__head">
            <div>
              <h3 class="card__title">${Utils.escapeHtml(g.name)}</h3>
              <p class="card__sub">${g.course} курс · ${Utils.escapeHtml(g.specialty)}</p>
            </div>
            <span class="badge ${status.cls}">${avg.toFixed(2)}</span>
          </div>
          <div class="kv">
            <div class="kv__item"><div class="kv__label">Студентов</div><div class="kv__value">${students.length}</div></div>
            <div class="kv__item"><div class="kv__label">Успеваемость</div><div class="kv__value">${perf}%</div></div>
          </div>
        </div>
      `;
                }).join('');

                container.innerHTML = `
      <div class="grid grid--3">
        ${cardsHtml || Utils.emptyState('Групп нет', 'Добавьте первую группу.')}
      </div>
    `;

                container.addEventListener('click', (e) => {
                    const card = e.target.closest('[data-group]');
                    if (!card) return;
                    openGroupDetail(card.dataset.group);
                });

                const actions = Utils.$('#topbarActions');
                actions.innerHTML = `<button class="btn btn--primary" id="addGroupBtn" type="button">+ Добавить группу</button>`;
                Utils.$('#addGroupBtn').addEventListener('click', () => {
                    openGroupModal(null, () => GroupsPage.render(container));
                });
            };

            /* ---------------- Модальное окно ---------------- */
            const openGroupModal = (groupId, onSave) => {
                const isEdit = Boolean(groupId);
                const g = isEdit ? Store.getGroup(groupId) : null;

                Utils.modal({
                    title: isEdit ? 'Редактировать группу' : 'Новая группа',
                    body: `
        <label class="field">
          <span class="field__label">Название группы</span>
          <input class="input" id="mGrpName" type="text" value="${g ? Utils.escapeHtml(g.name) : ''}" placeholder="ПКС-7-24">
        </label>
        <label class="field">
          <span class="field__label">Курс</span>
          <input class="input" id="mGrpCourse" type="number" min="1" max="6" value="${g ? g.course : 1}">
        </label>
        <label class="field">
          <span class="field__label">Специальность</span>
          <input class="input" id="mGrpSpec" type="text" value="${g ? Utils.escapeHtml(g.specialty) : ''}" placeholder="Техники-программисты">
        </label>
      `,
                    footer: `
        <button class="btn btn--ghost" data-close type="button">Отмена</button>
        <button class="btn btn--primary" id="mGrpSave" type="button">${isEdit ? 'Сохранить' : 'Добавить'}</button>
      `,
                    onMount: (wrap, close) => {
                        wrap.querySelector('#mGrpSave').addEventListener('click', () => {
                            const name = wrap.querySelector('#mGrpName').value.trim();
                            const course = Number(wrap.querySelector('#mGrpCourse').value) || 1;
                            const specialty = wrap.querySelector('#mGrpSpec').value.trim();
                            if (!name) { Utils.toast('Введите название группы', 'warn'); return; }
                            if (isEdit) {
                                Store.updateGroup(groupId, { name, course, specialty });
                                Utils.toast('Группа обновлена', 'success');
                            } else {
                                Store.addGroup({ name, course, specialty });
                                Utils.toast('Группа добавлена', 'success');
                            }
                            close();
                            if (onSave) onSave();
                        });
                    }
                });
            };

            /* ---------------- Детали группы ---------------- */
            const openGroupDetail = (groupId) => {
                    const g = Store.getGroup(groupId);
                    if (!g) return;

                    const students = Store.groupStudents(g.name);
                    const avg = Store.groupAverage(g.name);
                    const perf = Store.groupPerformance(g.name);
                    const risk = students.filter(s => {
                        const a = Store.studentAverage(s.id);
                        return a > 0 && a < 3.5;
                    });

                    // Оценки группы
                    const groupGrades = Store.getGrades().filter(gr => {
                        const s = Store.getStudent(gr.studentId);
                        return s && s.group === g.name;
                    });
                    const dist = Store.gradeDistribution(groupGrades);

                    // Рейтинг студентов группы
                    const rating = Utils.sortBy(
                        students.map(s => ({
                            ...s,
                            average: Store.studentAverage(s.id),
                            performance: Utils.perfPercent(Store.studentGrades(s.id))
                        })).filter(s => s.average > 0),
                        'average', 'desc'
                    );

                    // Средний балл по предметам
                    const subjMap = {};
                    groupGrades.forEach(gr => {
                        if (!subjMap[gr.subjectId]) subjMap[gr.subjectId] = [];
                        subjMap[gr.subjectId].push(gr.grade);
                    });
                    const subjLabels = Object.keys(subjMap).map(id => { const s = Store.getSubject(id); return s ? s.name : '—'; });
                    const subjAvg = Object.keys(subjMap).map(id => Utils.round(Utils.avg(subjMap[id]), 2));

                    Utils.modal({
                                title: `Группа ${g.name}`,
                                body: `
        <div class="kv">
          <div class="kv__item"><div class="kv__label">Курс</div><div class="kv__value">${g.course}</div></div>
          <div class="kv__item"><div class="kv__label">Специальность</div><div class="kv__value" style="font-size:13px">${Utils.escapeHtml(g.specialty)}</div></div>
          <div class="kv__item"><div class="kv__label">Студентов</div><div class="kv__value">${students.length}</div></div>
          <div class="kv__item"><div class="kv__label">Средний балл</div><div class="kv__value">${avg.toFixed(2)}</div></div>
          <div class="kv__item"><div class="kv__label">Успеваемость</div><div class="kv__value">${perf}%</div></div>
          <div class="kv__item"><div class="kv__label">В группе риска</div><div class="kv__value">${risk.length}</div></div>
        </div>

        <h4 class="section-title">Распределение оценок</h4>
        <div class="chart-box chart-box--sm"><canvas id="grpDistChart"></canvas></div>

        <h4 class="section-title">Средний балл по предметам</h4>
        <div class="chart-box chart-box--sm"><canvas id="grpSubjChart"></canvas></div>

        <h4 class="section-title">Рейтинг студентов</h4>
        <div class="table-scroll" style="max-height:280px;overflow-y:auto;border:1px solid var(--border);border-radius:10px">
          <table class="data" style="min-width:400px">
            <thead><tr><th>#</th><th>Студент</th><th>Ср. балл</th><th>Успев.</th></tr></thead>
            <tbody>
              ${rating.map((s, i) => `
                <tr>
                  <td class="cell-muted">${i + 1}</td>
                  <td class="cell-name">${Utils.escapeHtml(s.fullName)}</td>
                  <td><b>${s.average.toFixed(2)}</b></td>
                  <td>${s.performance}%</td>
                </tr>
              `).join('') || '<tr><td colspan="4" class="cell-muted">Нет данных</td></tr>'}
            </tbody>
          </table>
        </div>

        <div class="row gap-8 mt-16">
          <button class="btn btn--ghost btn--sm" id="grpEdit" type="button">✎ Редактировать</button>
          <button class="btn btn--danger btn--sm" id="grpDelete" type="button">🗑 Удалить группу</button>
        </div>
      `,
      onMount: (wrap, close) => {
        setTimeout(() => {
          Charts.doughnut('grpDistChart',
            ['Отлично (5)', 'Хорошо (4)', 'Удовл. (3)', 'Неуд. (2)'],
            [dist[5], dist[4], dist[3], dist[2]]);
          if (subjLabels.length) {
            Charts.bar('grpSubjChart', subjLabels, subjAvg, Charts.palette().accent, true);
          }
        }, 50);

        wrap.querySelector('#grpEdit').addEventListener('click', () => {
          close();
          setTimeout(() => openGroupModal(groupId, () => {
            location.hash = '#/groups';
            window.dispatchEvent(new HashChangeEvent('hashchange'));
          }), 220);
        });

        wrap.querySelector('#grpDelete').addEventListener('click', async () => {
          close();
          const ok = await Utils.confirmDialog({
            title: 'Удалить группу?',
            message: `Группа «${g.name}» будет удалена. Студенты останутся в базе.`,
            confirmText: 'Удалить'
          });
          if (!ok) return;
          Store.deleteGroup(groupId);
          Utils.toast('Группа удалена', 'success');
          location.hash = '#/groups';
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        });
      }
    });
  };

  return { render };
})();