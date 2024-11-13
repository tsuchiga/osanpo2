export const subject = [
    { value: 'div#ID_uktkYmd', label: '受付年月日' },
    { value: 'div#ID_shkiKigenHi', label: '紹介期限日' },
    { value: 'div#ID_sngBrui', label: '産業分類' },
    { value: 'div#ID_jgshNo', label: '事業所番号' },
    { value: 'div#ID_jgshMei', label: '事業所名' },
    { value: 'div#ID_szci', label: '所在地' },
    { value: 'a#ID_hp', label: 'ホームページ' },
    { value: 'div#ID_sksu', label: '職種' },
    { value: 'div#ID_shigotoNy', label: '仕事内容' },
    { value: 'div#ID_shgBsJusho', label: '就業場所' },
    { value: 'div#ID_jgisKigyoZentai', label: '従業員数(企業全体)' },
    { value: 'div#ID_setsuritsuNen', label: '設立年' },
    { value: 'div#ID_shkn', label: '資本金' },
    { value: 'div#ID_jigyoNy', label: '事業内容' },
    { value: 'div#ID_kaishaNoTokucho', label: '会社の特長' },
    { value: 'div#ID_yshk', label: '役職' },
    { value: 'div#ID_dhshaMei', label: '代表者名' },
    { value: 'div#ID_hoNinNo', label: '法人番号' },
    { value: 'div#ID_ttsYkm', label: '課係名、役職名' },
    { value: 'div#ID_ttsTts', label: '担当者' },
    { value: 'div#ID_ttsTel', label: '電話番号' },
    { value: 'div#ID_ttsEmail', label: 'Eメール' }
]

export interface columns {
    Industry: string;
    CompanyAddress: string;
    HomePage: string;
    ContactPage: string;
    Kind: string;
    JobContent: string;
    Area: string;
    JobAddress: string;
    Employee: number;
    Establishment: string;
    Capital: string;
    CompanyContent: string;
    CompanyFeature: string;
    RepresentativePost: string;
    RepresentativeName: string;
    ChargePost: string;
    ChargeName: string;
    Tel: string;
    Email: string;
}