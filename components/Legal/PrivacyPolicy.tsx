import React from 'react';
import { ChevronLeft } from 'lucide-react';

interface PrivacyPolicyProps {
    onBack: () => void;
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 font-sans text-gray-800">
            <div className="max-w-3xl mx-auto bg-white p-8 md:p-12 rounded-2xl shadow-lg">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors mb-8 group"
                >
                    <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    Назад
                </button>

                <h1 className="text-2xl md:text-3xl font-bold mb-2">Политика конфиденциальности</h1>
                <p className="text-gray-500 text-sm mb-8">Последнее обновление: 3 февраля 2026 г.</p>

                <div className="space-y-6 text-sm md:text-base leading-relaxed">
                    <section>
                        <h2 className="text-lg font-bold mb-3 text-gray-900">1. Общие положения</h2>
                        <p>
                            1.1. Настоящая Политика конфиденциальности описывает порядок обработки и защиты персональных данных пользователей сервиса JustPlanner.
                        </p>
                        <p>
                            1.2. Оператором персональных данных является [ФИО владельца сервиса] (ИНН [номер]).
                        </p>
                        <p>
                            1.3. Используя Сервис, Пользователь выражает свое согласие с условиями настоящей Политики.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold mb-3 text-gray-900">2. Какие данные мы собираем</h2>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Email адрес:</strong> для идентификации пользователя, восстановления доступа и отправки сервисных уведомлений.</li>
                            <li><strong>Google Profile (Имя, Аватар):</strong> для отображения в интерфейсе приложения (при входе через Google).</li>
                            <li><strong>Данные о задачах:</strong> текст задач, даты, статус выполнения (хранятся для обеспечения функциональности Сервиса).</li>
                            <li><strong>Технические данные:</strong> IP-адрес, тип устройства, cookies (для аналитики и безопасности).</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold mb-3 text-gray-900">3. Цели обработки данных</h2>
                        <p>Мы используем ваши данные исключительно для:</p>
                        <ul className="list-disc pl-5 space-y-1 mt-2">
                            <li>Предоставления доступа к функционалу Сервиса.</li>
                            <li>Синхронизации задач между устройствами.</li>
                            <li>Обратной связи и технической поддержки.</li>
                            <li>Улучшения работы сервиса (на основе обезличенной статистики).</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold mb-3 text-gray-900">4. Защита и передача данных</h2>
                        <p>
                            4.1. Мы принимаем необходимые технические меры для защиты данных от несанкционированного доступа.
                        </p>
                        <p>
                            4.2. Мы не передаем ваши данные третьим лицам, за исключением случаев, предусмотренных законодательством РФ, или необходимых для оплаты (предоставление Email платежному шлюзу для отправки чека).
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold mb-3 text-gray-900">5. Права пользователя</h2>
                        <p>
                            Пользователь имеет право в любой момент запросить удаление своего аккаунта и всех связанных с ним данных, написав на <a href="mailto:support@justplanner.ru" className="text-blue-600 underline">support@justplanner.ru</a> или воспользовавшись функцией "Удалить аккаунт" в настройках Сервиса (при наличии).
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold mb-3 text-gray-900">6. Контакты</h2>
                        <p>
                            По всем вопросам, касающимся обработки персональных данных, вы можете обращаться по адресу: <a href="mailto:support@justplanner.ru" className="text-blue-600 underline">support@justplanner.ru</a>.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
