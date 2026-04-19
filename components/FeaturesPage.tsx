import React from 'react';
import { Check, ArrowRight, ArrowLeft } from 'lucide-react';

interface FeaturesPageProps {
    onStart: () => void;
    onBack: () => void;
    onShowPricing: () => void;
}

interface FeatureSection {
    id: string;
    title: string;
    description: string;
    video: string;
}

const features: FeatureSection[] = [
    {
        id: 'weekly-view',
        title: 'Недельный вид',
        description: 'Видите всю неделю целиком — 7 дней как на ладони. Легко планируйте задачи на несколько дней вперёд и держите фокус на главном.',
        video: '/1.mp4',
    },
    {
        id: 'drag-drop',
        title: 'Drag & Drop',
        description: 'Перетаскивайте задачи между днями одним движением. Если планы изменились — просто переместите задачу на другой день.',
        video: '/2.mp4',
    },
    {
        id: 'colors',
        title: 'Цветовая маркировка',
        description: 'Выделяйте важные задачи цветом. Работа, личное, спорт — всё визуально разделено и легко считывается.',
        video: '/3.mp4',
    },
    {
        id: 'recurring',
        title: 'Повторяющиеся задачи',
        description: 'Создайте задачу один раз — она будет появляться каждый день или неделю автоматически. Идеально для привычек и регулярных дел.',
        video: '/4.mp4',
    },
    {
        id: 'backlog',
        title: 'Бэклог',
        description: 'Храните идеи и несрочные задачи в специальном списке. Когда появится время — просто перетащите задачу в нужный день.',
        video: '/5.mp4',
    },
    {
        id: 'stats',
        title: 'Статистика продуктивности',
        description: 'Отслеживайте сколько задач выполнено за день, неделю и месяц. Видите свой прогресс и мотивируйтесь на новые достижения.',
        video: '/6.mp4',
    },
    {
        id: 'print',
        title: 'Печать и PDF',
        description: 'Распечатайте своё расписание на неделю или сохраните в PDF. Удобно для офлайн-планирования или чтобы повесить план на холодильник.',
        video: '/7.mp4',
    },
    {
        id: 'day-settings',
        title: 'Настройка начала дня',
        description: 'Выбирайте время начала дня и скрывайте ненужные часы. Сова или жаворонок — планировщик подстроится под ваш ритм.',
        video: '/8.mp4',
    },
];

const FeaturesPage: React.FC<FeaturesPageProps> = ({ onStart, onBack, onShowPricing }) => {
    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
            {/* Header / Nav */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-50/90 backdrop-blur-md border-b border-gray-200">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <ArrowLeft size={20} />
                        <span className="text-sm font-medium">Назад</span>
                    </button>
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity"
                    >
                        <div className="w-8 h-8 bg-[#26A69A] rounded-lg flex items-center justify-center text-white shadow-sm shrink-0">
                            <Check size={20} strokeWidth={3} />
                        </div>
                        <span className="text-lg sm:text-xl font-bold tracking-tight">
                            JustPlanner
                        </span>
                    </button>
                    <button
                        onClick={onShowPricing}
                        className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        Тарифы
                    </button>
                </div>
            </nav>

            {/* Hero */}
            <section className="pt-28 pb-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
                <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-6 leading-tight">
                    JustPlanner.
                    <br />
                    <span className="text-[#26A69A]">Простой и Точный</span>
                </h1>
                <p className="text-lg text-gray-600 leading-relaxed max-w-2xl">
                    JustPlanner только на первый взгляд кажется простым и минималистичным,
                    но на деле он обладает мощным функционалом! Мы постоянно развиваем его,
                    чтобы сделать ещё проще и удобнее.
                </p>
            </section>

            {/* Features Title */}
            <section className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
                <div className="border-t border-gray-300 pt-12 pb-4">
                    <h2 className="text-3xl font-black tracking-tight">Функции</h2>
                </div>
            </section>

            {/* Feature Sections */}
            <section className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto pb-20">
                {features.map((feature, index) => (
                    <div
                        key={feature.id}
                        className="border-t border-gray-200 py-12"
                    >
                        <h3 className="text-xl sm:text-2xl font-bold mb-4">
                            {feature.title}
                        </h3>
                        <p className="text-gray-600 leading-relaxed mb-8 max-w-2xl">
                            {feature.description}
                        </p>

                        {/* Video */}
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                            <video
                                src={feature.video}
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="w-full h-auto"
                                onLoadedMetadata={(e) => {
                                    (e.target as HTMLVideoElement).playbackRate = 0.75;
                                }}
                            />
                        </div>
                    </div>
                ))}
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-[#26A69A] text-white text-center px-4">
                <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                    Готовы попробовать?
                </h2>
                <p className="text-xl opacity-90 mb-10 max-w-2xl mx-auto">
                    Начните планировать свою неделю прямо сейчас — это бесплатно.
                </p>
                <button
                    onClick={() => {
                        (window as any).ym?.(106590123, 'reachGoal', 'btn_features_start_click');
                        onStart();
                    }}
                    className="px-10 py-5 bg-white text-[#26A69A] rounded-xl font-bold text-xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
                >
                    Попробовать бесплатно
                </button>
            </section>

            {/* Footer */}
            <footer className="py-8 bg-gray-50 border-t border-gray-200 text-center text-gray-500 text-sm">
                <p>&copy; {new Date().getFullYear()} JustPlanner. Все права защищены</p>
            </footer>
        </div>
    );
};

export default FeaturesPage;
