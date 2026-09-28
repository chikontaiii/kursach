/* ============================================================
   ДЕМОНСТРАЦИОННЫЕ ДАННЫЕ
   ============================================================ */
const DEMO_DATA = (() => {

    function mulberry32(a) {
        return function() {
            a |= 0;
            a = a + 0x6D2B79F5 | 0;
            let t = Math.imul(a ^ a >>> 15, 1 | a);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }
    const rand = mulberry32(20260928);
    const rnd = (min, max) => min + rand() * (max - min);

    const groups = [
        { id: 'g1', name: 'ПКС-7-24', course: 2, specialty: 'Техники-программисты', curator: 'Молдошова Г.М.' },
        { id: 'g2', name: 'ПКС-9-23', course: 3, specialty: 'Техники-программисты', curator: 'Молдошова Г.М.' },
        { id: 'g3', name: 'ИС-1-25', course: 1, specialty: 'Информационные системы', curator: 'Молдошова Г.М.' }
    ];

    const subjects = [
        { id: 's1', name: 'Базы данных', teacher: 'Тохтабаев А.М.' },
        { id: 's2', name: 'РЭиС', teacher: 'Бардыгулова Н.Д.' },
        { id: 's3', name: 'Архитектура ЭВМ', teacher: 'Батырбекова С.Б.' },
        { id: 's4', name: 'Системное программирование', teacher: 'Искендерова С.И.' },
        { id: 's5', name: 'Физическая культура', teacher: 'Теркулова У.А.' },
        { id: 's6', name: 'WEB-программирование', teacher: 'Замирбекова А.Н.' },
        { id: 's7', name: 'ООП', teacher: 'Касымбек К.Н.' },
        { id: 's8', name: 'Экономика отрасли', teacher: 'Табалдиева Г.К.' },
        { id: 's9', name: 'Предпринимательство', teacher: 'Олжобаева З.Т.' },
        { id: 's10', name: 'Правовое обеспечение', teacher: 'Талантова Н.Т.' }
    ];

    // Распределение предметов по семестрам
    const subjectSemesters = {
        s1: [3, 4], // Базы данных
        s2: [3, 4], // РЭиС
        s3: [1, 2], // Архитектура ЭВМ
        s4: [3, 4], // Системное программирование
        s5: [1, 2, 3, 4], // Физвоспитание
        s6: [3, 4], // WEB-программирование
        s7: [2, 3], // ООП
        s8: [4], // Экономика отрасли
        s9: [4], // Предпринимательство
        s10: [4] // Правовое обеспечение
    };

    const semesterRange = {
        1: ['2024-09-15', '2024-12-20'],
        2: ['2025-02-10', '2025-05-25'],
        3: ['2025-09-12', '2025-12-22'],
        4: ['2026-02-08', '2026-05-28']
    };

    const names = [
        'Апсаматов Байэл',
        'Арыкбаев Илгиз',
        'Асанов Тимур',
        'Асралиев Ислам',
        'Ахмулаева Рания',
        'Ашарбеков Мурат',
        'Бактыбеков Чынгыз',
        'Замиров Дамирбек',
        'Исаев Нурдан',
        'Каленов Нурсултан',
        'Калыков Байзак',
        'Колбаев Илияc',
        'Кочкомбаева Айдай',
        'Кубанычбеков Амир',
        'Курманбеков Чынтемир',
        'Махамадов Байэл',
        'Мурзакулов Эржан',
        'Наврузов Ярослав',
        'Николаенко Руслан',
        'Нуруев Нурсултан',
        'Патидинов Шавкат',
        'Раимбаев Арслан',
        'Салиев Кутманбек',
        'Салижанов Элбек',
        'Соромбаева Асель',
        'Темирбеков Санжар',
        'Турумбеков Акыл',
        'Харкей Арафат'
    ];

    function create() {
        const users = [
            { id: 'u1', name: 'Администратор', email: 'admin@college.ru', password: 'admin', role: 'admin' },
            { id: 'u2', name: 'Молдошова Г.М.', email: 'teacher@college.ru', password: 'teacher', role: 'teacher' }
        ];

        const distribution = [].concat(
            Array(22).fill('g1'),
            Array(4).fill('g2'),
            Array(2).fill('g3')
        );

        // ★ ID старост групп: ПКС-7-24, ПКС-9-23, ИС-1-25
        const starostaIds = ['st15', 'st23', 'st27'];

        const students = names.map((fullName, i) => {
            const gid = distribution[i];
            const group = groups.find(g => g.id === gid);
            const id = 'st' + (i + 1);
            return {
                id: id,
                fullName: fullName,
                group: group.name,
                course: group.course,
                specialty: group.specialty,
                isStarosta: starostaIds.indexOf(id) !== -1
            };
        });

        // Аккаунт для каждого студента
        students.forEach((st, i) => {
            users.push({
                id: 'u_' + st.id,
                name: st.fullName,
                email: 'st' + (i + 1) + '@college.ru',
                password: 'student',
                role: st.isStarosta ? 'starosta' : 'student',
                studentId: st.id
            });
        });

        // Удобный алиас для первого студента
        users.push({
            id: 'u3',
            name: students[0].fullName,
            email: 'student@college.ru',
            password: 'student',
            role: 'student',
            studentId: students[0].id
        });

        const grades = [];
        let gradeCounter = 1;

        students.forEach((student, idx) => {
            let ability;
            if (idx < 5) ability = rnd(0.85, 0.98);
            else if (idx < 18) ability = rnd(0.60, 0.85);
            else if (idx < 24) ability = rnd(0.48, 0.62);
            else ability = rnd(0.32, 0.48);

            subjects.forEach(subject => {
                const semesters = subjectSemesters[subject.id] || [];
                semesters.forEach(sem => {
                    const progress = (sem - 2) * 0.03;
                    const noise = (rand() - 0.5) * 0.34;
                    const r = ability + progress + noise;

                    let grade;
                    if (r >= 0.78) grade = 5;
                    else if (r >= 0.58) grade = 4;
                    else if (r >= 0.38) grade = 3;
                    else grade = 2;

                    const range = semesterRange[sem];
                    const s = new Date(range[0]).getTime();
                    const e = new Date(range[1]).getTime();
                    const d = new Date(s + rand() * (e - s));

                    grades.push({
                        id: 'gr' + (gradeCounter++),
                        studentId: student.id,
                        subjectId: subject.id,
                        grade: grade,
                        semester: sem,
                        date: d.toISOString().slice(0, 10),
                        teacherId: 'u2'
                    });
                });
            });
        });

        return { users: users, students: students, subjects: subjects, grades: grades, groups: groups };
    }

    return { create: create };
})();