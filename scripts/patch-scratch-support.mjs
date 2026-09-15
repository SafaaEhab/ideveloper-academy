import fs from "node:fs";
const path = "client/src/pages/StudentPortal.tsx";
let s = fs.readFileSync(path, "utf8");
s = s.replace(
  'import { allPythonLessons, coreLessons, curriculumPhases, problemSolvingLessons, type CurriculumLesson } from "@/data/pythonCurriculum";',
  'import { allPythonLessons, coreLessons, curriculumPhases, problemSolvingLessons, type CurriculumLesson } from "@/data/pythonCurriculum";\nimport { allScratchLessons } from "@/data/scratchCurriculum";'
);
s = s.replace('const [selectedCourse, setSelectedCourse] = useState<string | null>(null);', 'const [selectedCourse, setSelectedCourse] = useState<string | null>(null);\n  const isScratch = selectedCourse === "Scratch";\n  const courseName = isScratch ? "Scratch" : "Python";\n  const curriculumLessons = isScratch ? allScratchLessons : allPythonLessons;\n  const curriculumCoreLessons = isScratch ? allScratchLessons.filter(lesson => lesson.kind === "core") : coreLessons;\n  const curriculumProblemLessons = isScratch ? allScratchLessons.filter(lesson => lesson.kind === "problem") : problemSolvingLessons;')
s = s.replace('journey: "رحلتي في Python"', 'journey: `رحلتي في ${courseName}`')
s = s.replace('sub: "أدخل كود الوصول لتفتح منهج Python كاملًا ومصممًا لك."', 'sub: `أدخل كود الوصول لتفتح منهج ${courseName} كاملًا ومصممًا لك.`')
s = s.replace('journey: "My Python journey"', 'journey: `My ${courseName} journey`')
s = s.replace('sub: "Enter your access code to unlock a complete Python curriculum made for you."', 'sub: `Enter your access code to unlock a complete ${courseName} curriculum made for you.`')
s = s.replace('const phases = curriculumPhases;', 'const phases = curriculumPhases;')
s = s.replace('allPythonLessons.filter', 'curriculumLessons.filter')
s = s.replace('allPythonLessons.find', 'curriculumLessons.find')
s = s.replace('allPythonLessons.length', 'curriculumLessons.length')
s = s.replace('coreLessons[0]', 'curriculumCoreLessons[0]')
s = s.replace('problemSolvingLessons[0]', 'curriculumProblemLessons[0]')
s = s.replace('student.courses?.includes("Python") && selectedCourse === "Python"', '(student.courses?.includes("Python") || student.courses?.includes("Scratch")) && (selectedCourse === "Python" || selectedCourse === "Scratch")')
s = s.replace('<Badge className="rounded-full">Python · 5 {text.months}</Badge>', '<Badge className="rounded-full">{courseName} · 5 {text.months}</Badge>')
s = s.replace('I Developer Academy · {student.accessCode}', 'I Developer Academy · {student.accessCode}')
s = s.replace('منهج كامل يبدأ بالتأسيس ثم ينتقل إلى تطبيقات Problem Solving على مدار خمسة شهور.', 'منهج كامل يبدأ بالتأسيس ثم ينتقل إلى تطبيقات وحل مشكلات على مدار خمسة شهور.')
s = s.replace('A five-month journey from foundations to applied Problem Solving.', 'A five-month journey from foundations to applied problem solving.')
s = s.replace('<div className="text-sm text-muted-foreground">Python</div>', '<div className="text-sm text-muted-foreground">{courseName}</div>')
fs.writeFileSync(path, s);
