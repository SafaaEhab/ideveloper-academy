/**
 * Public landing-page content, transcribed from the live iDeveloper Academy site
 * (ideveloper-academy.com) so the marketing pages stay an honest mirror of what
 * the academy actually sells. Every asset path points at
 * `client/public/images/ideveloper`, which holds the downloaded originals.
 */

export const ACADEMY_PHONE = "01062302368";
export const ACADEMY_PHONE_E164 = "201062302368";
export const ACADEMY_HOURS = "من 2 ظهرًا حتى 7 مساءً";
export const ACADEMY_ADDRESS =
  "بنها - الأهرام - منطقة الآثار - بجوار السجل المدنى - البوابة الخلفية لكلية آداب";
export const ACADEMY_ADDRESS_SHORT = "بنها - الأهرام - منطقة الآثار - بجوار السجل المدنى";

export const IMAGE_BASE = "/images/ideveloper";

// The academy mark itself is not stored here. It lives on Cloudinary and is
// referenced from `lib/brand`, so one URL covers the landing page, the social
// rail, the student portal and the admin dashboard.

export type NavItem = { href: string; label: string };

export const NAV_ITEMS: NavItem[] = [
  { href: "#top", label: "الرئيسية" },
  { href: "#about", label: "عن الأكاديمية" },
  { href: "#courses", label: "الكورسات" },
  { href: "#projects", label: "مشاريع الطلبة" },
];

export const HERO_SUB =
  "أكاديمية iDeveloper بتعلّم الأطفال والشباب البرمجة والروبوتات، وتبنيهم من الصفر لحد ما يشتغلوا فعلاً.";

export const HERO_POINTS = [
  "نبدأ مع ابنك من سن 6 سنين. ده الوقت المناسب إنه يتفرغ في البرمجة والروبوتات ويبني أساس قوي.",
  "كل مدرّس عنده خبرة أكتر من 10 تراكات في التعامل مع الأطفال، ومتابعة فردية لكل طالب.",
];

export type JourneyTab = { id: string; title: string; videoId: string };

/**
 * The academy's promo videos, in the order the live site presents them.
 *
 * The ids were read out of the modal iframes on the homepage, each paired with
 * the label of the button that opens it — so the order below matches what a
 * visitor sees on ideveloper-academy.com.
 *
 * `work-2` carries the same Arabic title as `work` because the live site really
 * does open two different videos from two buttons both labelled "أعمال بعض الطلبة".
 * The suffix is here only to keep the two tabs distinguishable in a tab strip.
 */
export const JOURNEY_TABS: JourneyTab[] = [
  { id: "promo", title: "شوف برومو فيديو", videoId: "hkd7lFYePnY" },
  { id: "arduino", title: "تطبيق الطلبة فى محاضرة أوردينو", videoId: "xI_2t_Cdlb8" },
  { id: "reviews", title: "بعض آراء الطلبة و اولياء الأمور", videoId: "k5jVwyCm-J4" },
  { id: "work", title: "أعمال بعض الطلبة", videoId: "t0WFMl_k374" },
  { id: "work-2", title: "أعمال بعض الطلبة (2)", videoId: "nSquoYpLUFk" },
];

/**
 * Videos play on this site rather than behind a link out, and YouTube's
 * privacy-enhanced host is used so no tracking cookie is set until a visitor
 * actually presses play — worth doing on a page aimed at children.
 */
export const YOUTUBE_EMBED_ORIGIN = "https://www.youtube-nocookie.com";

export type Offering = { title: string; body: string };

export const OFFERINGS: Offering[] = [
  {
    title: "تعلّم عملي من اليوم الأول",
    body: "كل تراك يبدأ بمشروع يشتغل أمام الطالب، مش slides نظرية. الطالب بيشوف نتيجة كوده بعينه.",
  },
  {
    title: "مجموعات صغيرة ومتابعة فردية",
    body: "عدد محدود في كل مجموعة عشان كل طالب ياخد وقته ويعرف أكتر الأخطاء اللي بيعملها.",
  },
  {
    title: "مدرسون متخصصون في التعامل مع الأطفال",
    body: "أكثر من عشر تراكات مع مدرّبين شغلوا مع الأعمار من 6 سنين لحد 17 سنة.",
  },
  {
    title: "شهادة إتمام وتقرير أداء",
    body: "شهادة إتمام معتمدة من الأكاديمية مع تقرير بيوضح تطور مهارات الطالب خلال التراك.",
  },
];

export type Course = {
  slug: string;
  title: string;
  /** Short factual badges, e.g. "20 جلسة" and "5 شهور". */
  facts: string[];
  description: string;
  icon: string;
  accent: string;
};

/**
 * The four courses the academy actually runs.
 *
 * The session and month counts are copied from the curriculum modules rather
 * than typed in by hand — `academyContent.test.ts` reads the same modules and
 * fails if the two ever drift apart. They are written out here instead of being
 * computed so that the landing page does not have to pull the three large
 * curriculum files into its bundle.
 */
export const COURSES: Course[] = [
  {
    slug: "scratch",
    title: "Scratch",
    facts: ["16 جلسة", "4 شهور"],
    description:
      "الطالب بيسحب البلوكات وبيبني ألعابه من غير ما يكتب سطر كود واحد. بنمشي على الأساسيات، وآخر التراكات بنخلي الطالب يصمّم اللعبة ويشوفها شغالة قدامه.",
    icon: "https://res.cloudinary.com/alhiemg0/image/upload/logoscratch.png",
    accent: "from-pink-500/25 to-rose-500/5",
  },
  {
    slug: "robotics",
    title: "Robotics",
    facts: ["3 تراك", "5 شهور"],
    description:
      "ثلاثة تراكات على مدى خمسة شهور: نبدأ ببرمجة الألعاب والألغاز بـ Scratch و RoboMind، وبعدين الأردوينو والتحكم في إشارة مرور إلكترونية، وننهي بأجزاء الروبوت وبرمجة أول روبوت.",
    icon: `${IMAGE_BASE}/icon-robotics.png`,
    accent: "from-orange-500/25 to-amber-500/5",
  },
  {
    slug: "web",
    title: "Web",
    facts: ["22 جلسة", "6 شهور"],
    description:
      "من أول وسم HTML لحد ما يبني الطالب موقع تفاعلي يشتغل في المتصفح. بنمرّ على HTML و CSS و JavaScript، وكل شهر بنقفله بمشروع الطالب يشتغل.",
    icon: `${IMAGE_BASE}/icon-web.png`,
    accent: "from-cyan-500/25 to-blue-500/5",
  },
  {
    slug: "python",
    title: "Python",
    facts: ["20 جلسة", "5 شهور"],
    description:
      "من أول print() لحد حل مسائل بتفكير. المتغيرات والشروط والحلقات والقوائم، وآخر تراك مخصوص لتطبيق اللي اتعلّمه على مسائل حقيقية.",
    icon: "/curriculum/session1/hero-coding-robot.jpg",
    accent: "from-violet-500/25 to-indigo-500/5",
  },
];

export type Member = { name: string; role: string; photo?: string };

/**
 * The live site never exposed a photo URL for two of the trainers, so those rows
 * fall back to an initials badge rather than borrowing someone else's picture.
 */
export const TEAM: Member[] = [
  { name: "م/أحمد سمير", role: "CEO founder; Head of learning", photo: `${IMAGE_BASE}/team-ahmed-samir.jpg` },
  { name: "م/مصطفى فتحى", role: "CTO; Trainer", photo: `${IMAGE_BASE}/team-mostafa-fathy.jpg` },
  { name: "م/عبد الله هشام", role: "Robotics instructor and python; Trainer" },
  { name: "م/منار خالد", role: "Robotics instructor and python; Trainer", photo: `${IMAGE_BASE}/team-manar.jpg` },
  { name: "م/سلمى الحسن", role: "problem solving and C++ instructor and python; Trainer", photo: `${IMAGE_BASE}/team-salma.jpg` },
  { name: "م/إيمان خاطر", role: "Robotics instructor; Trainer" },
  { name: "م/يوسف مدحت", role: "Robotics instructor; Trainer", photo: `${IMAGE_BASE}/team-yousef.jpg` },
  { name: "م/حبيبة خالد", role: "Robotics instructor; Trainer", photo: `${IMAGE_BASE}/team-habiba.jpg` },
  { name: "م/مصطفى محمد", role: "Robotics instructor", photo: `${IMAGE_BASE}/team-mostafa.jpg` },
];

export type Faq = { question: string; answer: string };

export const FAQS: Faq[] = [
  {
    question: "ما هي الفئة العمرية المناسبة لدوراتكم؟",
    answer:
      "لدينا برامج مصممة خصيصًا للأطفال من 7 سنوات حتى 17 سنة، مقسمة حسب المستوى (مبتدئين — متقدمين).",
  },
  {
    question: "هل يحتاج الطفل إلى خبرة مسبقة؟",
    answer: "لا حاجة لأي خبرة سابقة! نبدأ من الصفر ونركز على بناء الأساسيات خطوة بخطوة.",
  },
  {
    question: "كيف تتم الدروس؟ أونلاين أم حضوري؟",
    answer:
      "نقدم كلا الخيارين: أونلاين عبر Zoom مع منصة تعليمية تفاعلية، وحضوري في مقرنا (إذا كنت في مصر).",
  },
  {
    question: "هل تقدمون شهادات معتمدة؟",
    answer: "نعم! يحصل الطالب على شهادة إتمام معتمدة من الأكاديمية، وتقرير أداء يُظهر تطور مهاراته.",
  },
  {
    question: "كم عمر الطالب المناسب لبدء البرمجة؟",
    answer:
      "بداية من 6 سنين هيكون سن مثالي لابنك إنه يدرس علوم البرمجة والروبوتات، والدورات متاحة من 7 حتى 17 سنة.",
  },
];

export const GALLERY_BODY =
  "صور طلابنا المبدعين خلال رحلتنا، ونحن هنا لبناء مستقبل مشرق للأطفال والشباب من خلال تقديم رحلة تعليمية متكاملة. انضموا إلينا في رحلة إلهامية في عالم الابتكار والتكنولوجيا.";

/**
 * The students themselves, photographed at the academy and at the competition
 * awards. Taken from the gallery on the live site and stored under
 * `client/public/images/students`.
 *
 * Four of the award photos were published rotated on their side; they were
 * turned upright before being stored so the page never has to correct for it.
 */
export const STUDENT_PHOTOS = [
  { src: "/images/students/im4.jpg", alt: "طلبة بيشتغلوا على اللابتوب في المحاضرة" },
  { src: "/images/students/im6.jpg", alt: "طلبة بيتعلموا البرمجة مع بعض" },
  { src: "/images/students/im13.jpg", alt: "طالب بيشتغل على روبوت" },
  { src: "/images/students/im14.jpg", alt: "طالبة فازت بميدالية" },
  { src: "/images/students/im7.jpg", alt: "طالب مع شهادة التميز" },
  { src: "/images/students/im8.jpg", alt: "طالب مع أسرته وشهادة التميز" },
  { src: "/images/students/im9.jpg", alt: "طالب مع أسرته وشهادة التميز" },
  { src: "/images/students/im18.jpg", alt: "طالب مع أسرته وشهادة التميز" },
  { src: "/images/students/im10.jpg", alt: "مجموعة طلبة حاصلين على شهادات" },
  { src: "/images/students/im17.jpg", alt: "مجموعة طلبة في مسابقة iDeveloper" },
] as const;