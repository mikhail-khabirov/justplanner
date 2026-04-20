import React, { useState } from 'react';
import { ArrowRight, CheckCircle, Calendar, Clock, Layout, Zap, Smartphone, ChevronRight, Check, Menu, X } from 'lucide-react';

import LandingAnimation from './LandingAnimation'; // Toggle if needed

interface LandingPageProps {
    onStart: () => void;
    onLogin: () => void;
    onShowTerms: () => void;
    onShowPrivacy: () => void;
    onShowPricing: () => void;
    onShowFeatures: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart, onLogin, onShowTerms, onShowPrivacy, onShowPricing, onShowFeatures }) => {
    const [menuOpen, setMenuOpen] = useState(false);

    const handleLogin = () => {
        (window as any).ym?.(106590123, 'reachGoal', 'btn_login_click');
        setMenuOpen(false);
        onLogin();
    };
    const handleFeatures = () => { setMenuOpen(false); onShowFeatures(); };
    const handlePricing = () => { setMenuOpen(false); onShowPricing(); };

    return (
        <div className="min-h-screen bg-white font-sans text-gray-900 overflow-x-hidden">
            {/* Header / Nav */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="w-8 h-8 bg-[#26A69A] rounded-lg flex items-center justify-center text-white shadow-sm shrink-0">
                            <Check size={20} strokeWidth={3} />
                        </div>
                        <span className="text-lg sm:text-xl font-bold tracking-tight truncate">
                            JustPlanner
                        </span>
                    </div>

                    {/* Desktop nav */}
                    <div className="hidden sm:flex items-center gap-6 shrink-0">
                        <button
                            onClick={handleFeatures}
                            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            Функции
                        </button>
                        <button
                            onClick={handlePricing}
                            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            Тарифы
                        </button>
                        <button
                            onClick={handleLogin}
                            className="text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 px-4 py-2 rounded-lg transition-colors"
                        >
                            Войти
                        </button>
                    </div>

                    {/* Mobile burger */}
                    <button
                        onClick={() => setMenuOpen(v => !v)}
                        aria-label="Меню"
                        className="sm:hidden p-2 -mr-2 text-gray-700 hover:text-gray-900"
                    >
                        {menuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>

                {/* Mobile dropdown */}
                {menuOpen && (
                    <div className="sm:hidden border-t border-gray-100 bg-white/95 backdrop-blur-md">
                        <div className="px-4 py-3 flex flex-col gap-1">
                            <button
                                onClick={handleFeatures}
                                className="text-left px-3 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
                            >
                                Функции
                            </button>
                            <button
                                onClick={handlePricing}
                                className="text-left px-3 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
                            >
                                Тарифы
                            </button>
                            <button
                                onClick={handleLogin}
                                className="mt-2 px-4 py-3 text-base font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg"
                            >
                                Войти
                            </button>
                        </div>
                    </div>
                )}
            </nav>

            {/* Hero Section */}
            <section className="pt-20 sm:pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
                <div className="text-center max-w-3xl mx-auto mb-12">

                    <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
                        Организуй свой день
                        <span className="text-[#26A69A] block mt-2">просто и эффективно за 30 секунд</span>
                    </h1>
                    <p className="text-base sm:text-xl text-gray-600 mb-8 leading-relaxed">
                        JustPlanner помогает планировать задачи, встречи и цели в удобном недельном формате. Без лишних сложностей.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button
                            onClick={() => {
                                (window as any).ym?.(106590123, 'reachGoal', 'btn_start_click');
                                onStart();
                            }}
                            className="w-full sm:w-auto px-8 py-4 bg-[#26A69A] text-white rounded-xl font-bold text-lg hover:bg-[#218F84] transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2"
                        >
                            Начать планировать
                            <ArrowRight size={20} />
                        </button>

                    </div>
                </div>

                {/* Hero Image Mockup - Animation */}
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-200 bg-gray-50 aspect-[16/9] group">
                    <video
                        src="/main.mp4"
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                    />
                </div>
            </section>

            {/* Benefits Section */}
            <section className="py-20 bg-gray-50 border-t border-gray-100">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-3 gap-12">
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                                <Calendar size={28} />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Неделя как на ладони</h3>
                            <p className="text-gray-600 leading-relaxed">
                                Уникальный вид на 7 дней позволяет видеть всю картину целиком. Больше никаких сюрпризов в расписании.
                            </p>
                        </div>

                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-6">
                                <Clock size={28} />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Временные блоки</h3>
                            <p className="text-gray-600 leading-relaxed">
                                Техника тайм-блокинга в действии. Выделяй время на работу, отдых и спорт одним движением.
                            </p>
                        </div>

                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center mb-6">
                                <Smartphone size={28} />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Работает везде</h3>
                            <p className="text-gray-600 leading-relaxed">
                                ПК, планшет или телефон. Полная синхронизация и удобный сенсорный интерфейс.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features List */}
            <section className="py-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid md:grid-cols-2 gap-16 items-center">
                    <div>
                        <h2 className="text-3xl font-bold mb-8">Всё необходимое для продуктивности</h2>
                        <ul className="space-y-6">
                            {[
                                'Быстрый перенос задач Drag & Drop',
                                'Цветовая маркировка приоритетов',
                                'Повторяющиеся события',
                                'Бэклог для идей и несрочных дел',
                                'Фокус-режим на текущем дне',
                                'Статистика продуктивности'
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-lg text-gray-700">
                                    <CheckCircle size={24} className="text-[#26A69A] shrink-0" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                        <button
                            onClick={() => {
                                (window as any).ym?.(106590123, 'reachGoal', 'btn_start_click');
                                onStart();
                            }}
                            className="mt-10 px-6 py-3 bg-gray-100 text-gray-900 rounded-lg font-semibold hover:bg-gray-200 transition-colors flex items-center gap-2"
                        >
                            Попробовать все функции
                            <ChevronRight size={18} />
                        </button>
                    </div>
                    <div className="relative">
                        {/* Decorative blob */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] bg-gradient-to-br from-[#26A69A]/20 to-blue-200/20 blur-3xl rounded-full -z-10" />

                        {/* Realistic App UI Mockup */}
                        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden rotate-3 hover:rotate-0 transition-transform duration-500 border border-gray-100">
                            {/* Mock Header */}
                            <div className="bg-white border-b border-gray-100 p-4 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="text-lg font-bold text-gray-900">30 янв</div>
                                    <div className="text-xs font-bold text-gray-400 uppercase mt-1">Пятница</div>
                                </div>
                                <div className="flex gap-1">
                                    <div className="w-2 h-2 rounded-full bg-gray-200"></div>
                                    <div className="w-2 h-2 rounded-full bg-gray-200"></div>
                                </div>
                            </div>

                            {/* Mock Tasks Body */}
                            <div className="p-4 space-y-3 bg-gray-50/50 min-h-[220px]">
                                {/* Done Task */}
                                <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg flex items-center gap-3 opacity-60">
                                    <div className="w-4 h-4 rounded border border-gray-300 flex items-center justify-center bg-gray-100">
                                        <Check size={10} className="text-gray-400" />
                                    </div>
                                    <span className="text-sm text-gray-400 line-through">Планирование дня</span>
                                </div>

                                {/* Active Task (Yellow) */}
                                <div className="p-3 bg-[#FEF9C3] border border-[#FEF08A] rounded-lg shadow-sm">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs font-bold text-yellow-700 opacity-70">11:00</span>
                                    </div>
                                    <div className="text-sm font-medium text-gray-900">Спринт ревью</div>
                                </div>

                                {/* Active Task (Green) */}
                                <div className="p-3 bg-[#DCFCE7] border border-[#BBF7D0] rounded-lg shadow-sm">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs font-bold text-green-700 opacity-70">14:00</span>
                                    </div>
                                    <div className="text-sm font-medium text-gray-900">Встреча с клиентом</div>
                                </div>

                                {/* Active Task (Red) */}
                                <div className="p-3 bg-[#FEE2E2] border border-[#FECACA] rounded-lg shadow-sm">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs font-bold text-red-700 opacity-70">19:00</span>
                                    </div>
                                    <div className="text-sm font-medium text-gray-900">Спортзал</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Footer */}
            <section className="py-24 bg-[#26A69A] text-white text-center px-4">
                <h2 className="text-3xl sm:text-4xl font-bold mb-6">Готовы навести порядок?</h2>
                <p className="text-xl opacity-90 mb-10 max-w-2xl mx-auto">
                    Присоединяйтесь к тысячам пользователей, которые уже планируют своё время с JustPlanner.
                </p>
                <button
                    onClick={() => {
                        (window as any).ym?.(106590123, 'reachGoal', 'btn_start_free_click');
                        onStart();
                    }}
                    className="px-10 py-5 bg-white text-[#26A69A] rounded-xl font-bold text-xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
                >
                    Начать бесплатно сейчас
                </button>
            </section>

            {/* Footer */}
            <footer className="py-8 border-t border-gray-100 text-center text-gray-500 text-sm">
                <p className="mb-2">&copy; {new Date().getFullYear()} JustPlanner. Все права защищены</p>
                <div className="flex flex-col items-center gap-2 mb-4">
                    <a href="mailto:support@justplanner.ru" className="hover:text-gray-900 transition-colors">
                        support@justplanner.ru
                    </a>
<p className="text-gray-400 text-xs">
    ИП Хабиров М.Р. &nbsp;·&nbsp; ИНН 032810801523 &nbsp;·&nbsp; ОГРНИП 321028000152179
</p>

                    <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                        <button onClick={onShowPricing} className="hover:text-gray-900 transition-colors underline decoration-gray-300 underline-offset-4">
                            Тарифы
                        </button>
                        <button onClick={onShowTerms} className="hover:text-gray-900 transition-colors underline decoration-gray-300 underline-offset-4">
                            Публичная оферта
                        </button>
                        <button onClick={onShowPrivacy} className="hover:text-gray-900 transition-colors underline decoration-gray-300 underline-offset-4">
                            Политика конфиденциальности
                        </button>
                    </div>
                </div>

            </footer>
        </div>
    );
};

export default LandingPage;
