import React from 'react';
import { ChevronLeft } from 'lucide-react';

interface PublicOfferProps {
    onBack: () => void;
}

const PublicOffer: React.FC<PublicOfferProps> = ({ onBack }) => {
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

                <h1 className="text-2xl md:text-3xl font-bold mb-2">Публичная оферта</h1>
                <p className="text-gray-500 text-sm mb-8">Последнее обновление: 3 февраля 2026 г.</p>

                <div className="space-y-6 text-sm md:text-base leading-relaxed">
                    <section>
                        <h2 className="text-lg font-bold mb-3 text-gray-900">1. Общие положения</h2>
                        <p>
                            1.1. Настоящий документ является официальным предложением (публичной офертой) Самозанятого Федорова Максима Вадимовича (ИНН 370202964392),
                            именуемого в дальнейшем «Исполнитель», и содержит все существенные условия предоставления услуг по использованию сервиса JustPlanner.
                        </p>
                        <p>
                            1.2. В соответствии с п. 2 ст. 437 Гражданского Кодекса РФ, в случае принятия изложенных ниже условий и оплаты услуг,
                            юридическое или физическое лицо, производящее акцепт этой оферты, становится «Заказчиком».
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold mb-3 text-gray-900">2. Предмет оферты</h2>
                        <p>
                            2.1. Исполнитель возмездно предоставляет Заказчику право доступа к программному обеспечению JustPlanner (далее — «Сервис»)
                            для планирования задач и управления временем.
                        </p>
                        <p>
                            2.2. Доступ предоставляется на условиях подписки согласно Тарифам, опубликованным на сайте.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold mb-3 text-gray-900">3. Стоимость услуг и порядок расчетов</h2>
                        <p>
                            3.1. Стоимость услуг определяется тарифами, указанными на сайте https://justplanner.ru/pricing (или в интерфейсе оплаты).
                        </p>
                        <p className="bg-blue-50 p-4 rounded-lg my-4 text-blue-900 border border-blue-100">
                            <strong>3.2. Рекуррентные платежи (Подписка).</strong><br />
                            Оплачивая тариф c периодическим списанием, Заказчик дает согласие на безакцептное списание средств с его банковской карты
                            (автоплатеж) согласно выбранному периоду (ежемесячно или ежегодно). Списания происходят автоматически до момента отмены подписки Заказчиком.
                        </p>
                        <p>
                            3.3. Заказчик может в любой момент отменить подписку в личном кабинете Сервиса ("Настройки" &rarr; "Подписка").
                            В этом случае автосписания прекращаются, а доступ сохраняется до конца, уже оплаченного периода.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold mb-3 text-gray-900">4. Политика возвратов (Refund Policy)</h2>
                        <p>
                            4.1. Исполнитель гарантирует полный возврат средств по первому требованию Заказчика, если требование направлено в течение 3 (трех) календарных дней
                            после оплаты. Запрос на возврат направляется на email: <a href="mailto:support@justplanner.ru" className="text-blue-600 underline">support@justplanner.ru</a>.
                        </p>
                        <p>
                            4.2. При отказе от услуг после истечения 3 дней с момента оплаты возврат денежных средств не производится, так как услуга по предоставлению доступа считается оказанной в момент его активации.
                        </p>
                        <p>
                            4.3. Возврат производится на ту же банковскую карту, с которой была произведена оплата, в течение 10 рабочих дней.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold mb-3 text-gray-900">5. Конфиденциальность</h2>
                        <p>
                            5.1. Стороны обязуются соблюдать конфиденциальность персональных данных. Исполнитель обрабатывает данные Заказчика исключительно для исполнения договора
                            и в соответствии с Политикой конфиденциальности.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold mb-3 text-gray-900">6. Реквизиты Исполнителя</h2>
                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                            <p className="font-bold mb-2">Самозанятый Федоров Максим Вадимович</p>
                            <p className="mb-1"><span className="text-gray-500 w-24 inline-block">ИНН:</span> 370202964392</p>
                            <p className="mb-1"><span className="text-gray-500 w-24 inline-block">Email:</span> support@justplanner.ru</p>
                            <p className="mb-1"><span className="text-gray-500 w-24 inline-block">Сайт:</span> https://justplanner.ru</p>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default PublicOffer;
