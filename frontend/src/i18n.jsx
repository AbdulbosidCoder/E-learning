import { createContext, useCallback, useContext, useState } from 'react'

const dict = {
  uz: {
    appName: "O'quv platformasi",
    email: 'Korporativ pochta',
    password: 'Parol',
    login: 'Kirish',
    logout: 'Chiqish',
    loginFailed: "Pochta yoki parol noto'g'ri",
    courses: 'Kurslar',
    myCourses: 'Mening kurslarim',
    manageCourses: 'Kurslarni boshqarish',
    users: 'Xodimlar',
    noCourses: "Hozircha kurslar yo'q",
    lessons: 'Darslar',
    lesson: 'Dars',
    test: 'Test',
    questions: 'Savollar',
    open: 'Ochish',
    edit: 'Tahrirlash',
    progress: 'Jarayon',
    passed: "O'tdi",
    notPassed: "O'tmadi",
    bestScore: 'Eng yaxshi natija',
    markDone: "O'qib chiqdim",
    done: "O'qildi",
    startTest: 'Testni boshlash',
    submit: 'Yuborish',
    yourScore: 'Natijangiz',
    correct: "To'g'ri",
    wrong: "Noto'g'ri",
    retry: 'Qayta topshirish',
    back: 'Orqaga',
    draft: 'Qoralama',
    published: 'Nashr qilingan',
    publish: 'Nashr qilish',
    unpublish: 'Nashrdan olish',
    delete: "O'chirish",
    confirmDelete: "Rostdan ham o'chirasizmi?",
    save: 'Saqlash',
    saved: 'Saqlandi',
    cancel: 'Bekor qilish',
    add: "Qo'shish",
    title: 'Nomi',
    description: 'Tavsif',
    content: 'Matn (Markdown)',
    language: 'Til',
    passScore: "O'tish bali (%)",
    video: 'Video',
    videoUrl: 'Video havolasi',
    uploadVideo: 'Video yuklash',
    uploading: 'Yuklanmoqda...',
    newCourse: 'Yangi kurs',
    generateTitle: 'Hujjatdan kurs yaratish (AI)',
    generateHint: "PDF, DOCX yoki TXT yuklang. AI darslar va test tayyorlaydi, siz tekshirib nashr qilasiz.",
    file: 'Fayl',
    numQuestions: 'Savollar soni',
    instructions: "Qo'shimcha ko'rsatmalar (ixtiyoriy)",
    generate: 'Yaratish',
    generating: 'AI kurs tayyorlamoqda, bu bir necha daqiqa olishi mumkin...',
    manualCreate: "Qo'lda yaratish",
    sourceFile: 'Manba',
    addLesson: "Dars qo'shish",
    addQuestion: "Savol qo'shish",
    questionText: 'Savol',
    options: 'Variantlar (har biri yangi qatorda)',
    correctOption: "To'g'ri javob",
    explanation: 'Izoh',
    fullName: 'F.I.Sh.',
    role: 'Rol',
    department: "Bo'lim",
    active: 'Faol',
    newUser: 'Yangi xodim',
    role_admin: 'Admin',
    role_manager: 'Rahbar',
    role_employee: 'Xodim',
    yes: 'Ha',
    no: "Yo'q",
    telegram: 'Telegram',
    notFound: 'Topilmadi',
    error: 'Xatolik',
  },
  ru: {
    appName: 'Учебная платформа',
    email: 'Корпоративная почта',
    password: 'Пароль',
    login: 'Войти',
    logout: 'Выйти',
    loginFailed: 'Неверная почта или пароль',
    courses: 'Курсы',
    myCourses: 'Мои курсы',
    manageCourses: 'Управление курсами',
    users: 'Сотрудники',
    noCourses: 'Курсов пока нет',
    lessons: 'Уроки',
    lesson: 'Урок',
    test: 'Тест',
    questions: 'Вопросы',
    open: 'Открыть',
    edit: 'Редактировать',
    progress: 'Прогресс',
    passed: 'Сдан',
    notPassed: 'Не сдан',
    bestScore: 'Лучший результат',
    markDone: 'Прочитал',
    done: 'Пройден',
    startTest: 'Начать тест',
    submit: 'Отправить',
    yourScore: 'Ваш результат',
    correct: 'Верно',
    wrong: 'Неверно',
    retry: 'Пройти заново',
    back: 'Назад',
    draft: 'Черновик',
    published: 'Опубликован',
    publish: 'Опубликовать',
    unpublish: 'Снять с публикации',
    delete: 'Удалить',
    confirmDelete: 'Точно удалить?',
    save: 'Сохранить',
    saved: 'Сохранено',
    cancel: 'Отмена',
    add: 'Добавить',
    title: 'Название',
    description: 'Описание',
    content: 'Текст (Markdown)',
    language: 'Язык',
    passScore: 'Проходной балл (%)',
    video: 'Видео',
    videoUrl: 'Ссылка на видео',
    uploadVideo: 'Загрузить видео',
    uploading: 'Загрузка...',
    newCourse: 'Новый курс',
    generateTitle: 'Создать курс из документа (ИИ)',
    generateHint: 'Загрузите PDF, DOCX или TXT. ИИ подготовит уроки и тест, вы проверите и опубликуете.',
    file: 'Файл',
    numQuestions: 'Количество вопросов',
    instructions: 'Дополнительные указания (необязательно)',
    generate: 'Создать',
    generating: 'ИИ готовит курс, это может занять несколько минут...',
    manualCreate: 'Создать вручную',
    sourceFile: 'Источник',
    addLesson: 'Добавить урок',
    addQuestion: 'Добавить вопрос',
    questionText: 'Вопрос',
    options: 'Варианты (каждый с новой строки)',
    correctOption: 'Правильный ответ',
    explanation: 'Пояснение',
    fullName: 'ФИО',
    role: 'Роль',
    department: 'Отдел',
    active: 'Активен',
    newUser: 'Новый сотрудник',
    role_admin: 'Админ',
    role_manager: 'Руководитель',
    role_employee: 'Сотрудник',
    yes: 'Да',
    no: 'Нет',
    telegram: 'Telegram',
    notFound: 'Не найдено',
    error: 'Ошибка',
  },
}

const LANG_KEY = 'elearning_lang'
const I18nContext = createContext(null)

function initialLang() {
  try {
    const saved = localStorage.getItem(LANG_KEY)
    if (saved === 'uz' || saved === 'ru') return saved
  } catch {
    /* storage unavailable */
  }
  return 'uz'
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(initialLang)

  const setLang = useCallback((next) => {
    if (next !== 'uz' && next !== 'ru') return
    setLangState(next)
    document.documentElement.lang = next
    try {
      localStorage.setItem(LANG_KEY, next)
    } catch {
      /* storage unavailable */
    }
  }, [])

  const t = useCallback((key) => dict[lang][key] ?? key, [lang])

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>
}

export const useI18n = () => useContext(I18nContext)
