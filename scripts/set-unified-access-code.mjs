import fs from "node:fs";
const dbPath = "server/db.ts";
let db = fs.readFileSync(dbPath, "utf8");
db = db.replace(
  'const createCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8);',
  'const createCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8);\nexport const UNIFIED_ACCESS_CODE = "ID-123456789";'
);
db = db.replace(
  'export async function getStudentByCode(accessCode: string) {\n  const db = await getDb(); if (!db) return null;',
  'export async function getStudentByCode(accessCode: string) {\n  const normalizedCode = accessCode.trim().toUpperCase();\n  if (normalizedCode === UNIFIED_ACCESS_CODE) {\n    return { id: 0, name: "Student", email: null, phone: null, groupId: null, accessCode: UNIFIED_ACCESS_CODE, status: "active" as const, createdAt: new Date(), updatedAt: new Date(), group: null, courses: ["Scratch", "Robotics", "Web", "Python"] as CourseName[] };\n  }\n  const db = await getDb(); if (!db) return null;'
);
db = db.replace('eq(students.accessCode, accessCode.trim().toUpperCase())', 'eq(students.accessCode, normalizedCode)');
fs.writeFileSync(dbPath, db);

const routerPath = "server/routers.ts";
let router = fs.readFileSync(routerPath, "utf8");
router = router.replace('import { getDb, getStudentByCode, listGroups, listStudents, createAccessCode } from "./db";', 'import { getDb, getStudentByCode, listGroups, listStudents, createAccessCode } from "./db";');
fs.writeFileSync(routerPath, router);

const portalPath = "client/src/pages/StudentPortal.tsx";
let portal = fs.readFileSync(portalPath, "utf8");
portal = portal.replace('placeholder: "مثال: IDA-7K2M9P4Q"', 'placeholder: "id-123456789"');
portal = portal.replace('placeholder: "Example: IDA-7K2M9P4Q"', 'placeholder: "id-123456789"');
portal = portal.replace('const [code, setCode] = useState("");', 'const [code, setCode] = useState("id-123456789");');
portal = portal.replace('sub: `أدخل كود الوصول لتفتح منهج ${courseName} كاملًا ومصممًا لك.`', 'sub: "استخدم الكود الموحد لفتح كل الكورسات: id-123456789"');
portal = portal.replace('sub: `Enter your access code to unlock a complete ${courseName} curriculum made for you.`', 'sub: "Use the shared code to unlock every course: id-123456789"');
portal = portal.replace('الكورسات موجودة هنا للتعريف فقط. تفاصيل المنهج تظهر داخل صفحتك بعد إدخال كود الطالب.', 'استخدم الكود الموحد لفتح كل الكورسات والمنهج الكامل.');
portal = portal.replace('These course cards are a public introduction. Full curriculum details appear only inside your student page after entering your access code.', 'Use the shared code to unlock every course and the complete curriculum.');
fs.writeFileSync(portalPath, portal);
