import { useLocale } from '../state/locale';
import { useMeta } from '../hooks/useMeta';

const content = {
  ua: {
    title: 'Правила перебування',
    description: 'Правила перебування на території пляжно-ресторанного комплексу ГорПляж.',
    updated: 'Останнє оновлення: 20 червня 2026',
    intro: 'Перебування на території комплексу означає згоду гостя з цими правилами. Вони регулюють порядок користування територією, пляжним інвентарем та сервісними послугами ГорПляж.',
    sections: [
      {
        title: '1. Загальні умови',
        body: 'Графік роботи пляжного комплексу: з 08:00 до 20:00 щодня, якщо інше не повідомлено адміністрацією. Вхід на пляж є вільним і безоплатним. Платними є сервісні послуги комплексу, зокрема користування шезлонгами, лежаками, бунгало, рушниками, простирадлами та іншим пляжним інвентарем.'
      },
      {
        title: '2. Інформація про ціни та оплату',
        body: 'Вартість і перелік сервісних послуг зазначаються при вході та/або в офіційних каналах закладу. Після оплати гостю надається розрахунковий документ або інше підтвердження оплати відповідно до способу оформлення замовлення.'
      },
      {
        title: '3. Коли послуга вважається наданою',
        body: 'Послуга вважається наданою з моменту передачі гостю у користування відповідного інвентарю або місця. Якщо гість залишає територію комплексу більш ніж на 60 хвилин, адміністрація має право вважати послугу завершеною. Повторне користування в той самий день оплачується повторно.'
      },
      {
        title: '4. Бронювання і неявка',
        body: 'Для денних пляжних послуг бронювання здійснюється за умови 100% передоплати. Таке бронювання дійсне до 13:00 оплаченого дня. У разі неявки гостя до 13:00 адміністрація має право скасувати бронювання, а 50% суми передоплати утримується як компенсація за резервування місця.'
      },
      {
        title: '5. Повернення коштів',
        body: 'Кошти за належно надані послуги не повертаються, крім випадків, передбачених законодавством України, або коли послуга не може бути надана з вини адміністрації. Адміністрація не несе відповідальності за обставини непереборної сили, погіршення погодних умов, дії третіх осіб або інші фактори поза її контролем.'
      },
      {
        title: '6. Сервісний збір та додаткові послуги',
        body: 'До рахунку за замовлення по меню в закладі додається 10% за обслуговування гостя, якщо інше прямо не зазначено окремо. Заміна простирадла, рушників або іншого текстилю оплачується додатково. Вартість такої послуги становить 100 грн.'
      },
      {
        title: '7. Підстави для відмови в обслуговуванні',
        body: 'Адміністрація має право відмовити у наданні послуги або припинити її надання у разі порушення цих правил, громадського порядку чи безпеки, агресивної поведінки, псування майна, а також принесення чи вживання власної їжі або алкогольних напоїв без погодження з адміністрацією.'
      },
      {
        title: '8. Речі гостей',
        body: 'Адміністрація не несе відповідальності за речі, залишені без нагляду. На території комплексу можуть працювати камери або комірки схову для тимчасового зберігання речей.'
      },
      {
        title: '9. На території комплексу заборонено',
        items: [
          'вигул і купання тварин у місцях, не передбачених для цього;',
          'розпивання алкогольних та слабоалкогольних напоїв у заборонених законом місцях або перебування у стані сп’яніння, що порушує громадський порядок;',
          'використання відкритого вогню, у тому числі для розігріву або приготування їжі;',
          'використання потужних звуковідтворювальних пристроїв без погодження з адміністрацією;',
          'закопування в пісок скла, гострих, небезпечних або сторонніх предметів;',
          'пошкодження майна комплексу, інвентарю, зелених насаджень та елементів благоустрою;',
          'засмічення території та залишення сміття поза спеціально відведеними місцями;',
          'несанкціонована торгівля, розповсюдження рекламних матеріалів та надання послуг без погодження з адміністрацією.'
        ]
      },
      {
        title: '10. Нормативна основа',
        body: 'Правила сформовані з урахуванням Правил устаткування та експлуатації пляжів міста Одеси, затверджених рішенням Одеської міської ради № 1133-V від 05.04.2007 зі змінами, а також положень Кодексу України про адміністративні правопорушення, зокрема статей 154 та 178.'
      }
    ]
  },
  ru: {
    title: 'Правила пребывания',
    description: 'Правила пребывания на территории пляжно-ресторанного комплекса ГорПляж.',
    updated: 'Последнее обновление: 20 июня 2026',
    intro: 'Пребывание на территории комплекса означает согласие гостя с этими правилами. Они регулируют порядок пользования территорией, пляжным инвентарем и сервисными услугами ГорПляж.',
    sections: [
      {
        title: '1. Общие условия',
        body: 'График работы пляжного комплекса: с 08:00 до 20:00 ежедневно, если иное не сообщено администрацией. Вход на пляж свободный и бесплатный. Платными являются сервисные услуги комплекса, включая пользование шезлонгами, лежаками, бунгало, полотенцами, простынями и другим пляжным инвентарем.'
      },
      {
        title: '2. Информация о ценах и оплате',
        body: 'Стоимость и перечень сервисных услуг указываются при входе и/или в официальных каналах заведения. После оплаты гостю предоставляется расчетный документ или иное подтверждение оплаты в зависимости от способа оформления заказа.'
      },
      {
        title: '3. Когда услуга считается оказанной',
        body: 'Услуга считается оказанной с момента передачи гостю соответствующего инвентаря или места. Если гость покидает территорию комплекса более чем на 60 минут, администрация вправе считать услугу завершенной. Повторное пользование в тот же день оплачивается повторно.'
      },
      {
        title: '4. Бронирование и неявка',
        body: 'Для дневных пляжных услуг бронирование осуществляется при условии 100% предоплаты. Такое бронирование действительно до 13:00 оплаченного дня. При неявке гостя до 13:00 администрация вправе отменить бронирование, а 50% суммы предоплаты удерживается как компенсация за резервирование места.'
      },
      {
        title: '5. Возврат средств',
        body: 'Средства за надлежащим образом оказанные услуги не возвращаются, кроме случаев, предусмотренных законодательством Украины, либо когда услуга не может быть оказана по вине администрации. Администрация не несет ответственности за обстоятельства непреодолимой силы, ухудшение погодных условий, действия третьих лиц и другие факторы вне ее контроля.'
      },
      {
        title: '6. Сервисный сбор и дополнительные услуги',
        body: 'К счету за заказ по меню в заведении добавляется 10% за обслуживание гостя, если иное прямо не указано отдельно. Замена простыни, полотенец или другого текстиля оплачивается дополнительно. Стоимость такой услуги составляет 100 грн.'
      },
      {
        title: '7. Основания для отказа в обслуживании',
        body: 'Администрация вправе отказать в оказании услуги или прекратить ее оказание при нарушении этих правил, общественного порядка или безопасности, агрессивном поведении, порче имущества, а также при принесении или употреблении собственной еды или алкогольных напитков без согласования с администрацией.'
      },
      {
        title: '8. Вещи гостей',
        body: 'Администрация не несет ответственности за вещи, оставленные без присмотра. На территории комплекса могут работать камеры или ячейки хранения для временного размещения вещей.'
      },
      {
        title: '9. На территории комплекса запрещено',
        items: [
          'выгул и купание животных в местах, не предназначенных для этого;',
          'распитие алкогольных и слабоалкогольных напитков в запрещенных законом местах или нахождение в состоянии опьянения, нарушающем общественный порядок;',
          'использование открытого огня, в том числе для разогрева или приготовления пищи;',
          'использование мощных звуковоспроизводящих устройств без согласования с администрацией;',
          'закапывание в песок стекла, острых, опасных или посторонних предметов;',
          'повреждение имущества комплекса, инвентаря, зеленых насаждений и элементов благоустройства;',
          'засорение территории и оставление мусора вне специально отведенных мест;',
          'несанкционированная торговля, распространение рекламных материалов и оказание услуг без согласования с администрацией.'
        ]
      },
      {
        title: '10. Нормативная основа',
        body: 'Правила сформированы с учетом Правил оборудования и эксплуатации пляжей города Одессы, утвержденных решением Одесского городского совета № 1133-V от 05.04.2007 с изменениями, а также положений Кодекса Украины об административных правонарушениях, в частности статей 154 и 178.'
      }
    ]
  },
  en: {
    title: 'Venue Rules',
    description: 'Rules for staying on the territory of the GorPliaj beach and restaurant complex.',
    updated: 'Last updated: June 20, 2026',
    intro: 'By staying on the venue territory, the guest accepts these rules. They govern the use of the territory, beach inventory, and paid services offered by GorPliaj.',
    sections: [
      {
        title: '1. General terms',
        body: 'The beach complex operates daily from 8:00 AM to 8:00 PM unless the administration announces otherwise. Entrance to the beach is free. Paid services include sunbeds, daybeds, bungalows, towels, sheets, and other beach inventory or service options.'
      },
      {
        title: '2. Pricing and payment information',
        body: 'The price list and range of paid services are published at the entrance and/or through the venue’s official channels. After payment, the guest receives a receipt or another payment confirmation depending on the ordering method.'
      },
      {
        title: '3. When a service is considered provided',
        body: 'A service is considered provided once the guest receives the relevant place or inventory. If the guest leaves the venue for more than 60 minutes, the administration may treat the service as completed. Reuse on the same day is charged again in full.'
      },
      {
        title: '4. Bookings and no-show policy',
        body: 'For daytime beach services, bookings require 100% prepayment. Such a booking remains valid until 1:00 PM on the paid day. If the guest does not arrive by 1:00 PM, the venue may cancel the booking and retain 50% of the prepayment as compensation for holding the place.'
      },
      {
        title: '5. Refunds',
        body: 'Payments for properly delivered services are non-refundable except where required by Ukrainian law or where the venue cannot provide the service due to the administration’s fault. The venue is not responsible for force majeure, bad weather, third-party actions, or other factors outside its control.'
      },
      {
        title: '6. Service charge and extra services',
        body: 'A 10% guest service charge is added to menu bills unless clearly stated otherwise. Replacement of sheets, towels, or other textiles is charged separately. The current replacement fee is UAH 100.'
      },
      {
        title: '7. Reasons to refuse service',
        body: 'The administration may refuse or stop providing services in case of violation of these rules, public order or safety rules, aggressive behavior, property damage, or bringing and consuming personal food or alcoholic drinks without prior approval from the venue.'
      },
      {
        title: '8. Guests’ belongings',
        body: 'The administration is not responsible for unattended belongings. Lockers or storage cells may be available on the territory for temporary storage.'
      },
      {
        title: '9. The following is prohibited on the venue territory',
        items: [
          'walking or bathing animals in areas not designated for that purpose;',
          'drinking alcohol in places prohibited by law or being intoxicated in a way that disrupts public order;',
          'using open fire, including for heating or cooking food;',
          'using high-powered sound equipment without prior approval from the administration;',
          'burying glass, sharp, dangerous, or foreign objects in the sand;',
          'damaging venue property, inventory, landscaping, or improvement elements;',
          'littering or leaving waste outside designated areas;',
          'unauthorized trading, advertising distribution, or service provision without venue approval.'
        ]
      },
      {
        title: '10. Regulatory basis',
        body: 'These rules are based on the Rules for the Equipment and Operation of Odesa City Beaches approved by Odesa City Council Resolution No. 1133-V dated April 5, 2007, as amended, and relevant provisions of the Code of Ukraine on Administrative Offenses, including Articles 154 and 178.'
      }
    ]
  }
};

export default function RulesPage() {
  const { locale } = useLocale();
  const copy = content[locale] || content.ua;

  useMeta(copy.title, copy.description);

  return (
    <div className="content-page legal-page">
      <section className="content-section">
        <h1>{copy.title}</h1>
        <p className="muted">{copy.updated}</p>
        <p>{copy.intro}</p>

        <div className="legal-sections">
          {copy.sections.map((section) => (
            <article className="legal-section" key={section.title}>
              <h3>{section.title}</h3>
              {section.body ? <p>{section.body}</p> : null}
              {section.items ? (
                <ul className="legal-list">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
