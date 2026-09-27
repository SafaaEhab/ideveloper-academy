import { renderCertificateCanvas } from "../client/src/lib/certificate";
import { CERTIFICATE_COURSES } from "../client/src/lib/certificateCourses";

const CASES = [
  {
    studentName: "Ahmed Hassan",
    accessCode: "ID-123456789",
    course: CERTIFICATE_COURSES.Python,
  },
  {
    studentName: "محمد عبد الرحمن الشناوي",
    accessCode: "IDA-4417",
    course: CERTIFICATE_COURSES.Scratch,
  },
  {
    studentName: "Mariam Ibrahim",
    accessCode: "IDA-9920",
    course: CERTIFICATE_COURSES.Web,
  },
  {
    studentName: "Bartholomew Wolfeschlegelstein the Third",
    accessCode: "IDA-0007",
    course: CERTIFICATE_COURSES.Python,
  },
];

const run = async () => {
  const root = document.getElementById("out")!;
  for (const [index, item] of CASES.entries()) {
    const canvas = await renderCertificateCanvas(
      {
        ...item.course,
        studentName: item.studentName,
        accessCode: item.accessCode,
        issuedOn: new Date(2026, 2, 14),
      },
      { issuedOn: new Date(2026, 2, 14) }
    );
    if (!canvas) continue;
    canvas.style.width = "1280px";
    canvas.style.display = "block";
    canvas.style.margin = "0 0 24px";
    const wrap = document.createElement("div");
    wrap.appendChild(canvas);
    wrap.insertAdjacentHTML(
      "beforeend",
      `<p style="font:600 14px system-ui;color:#333;margin:0 0 32px">case ${index + 1}</p>`
    );
    root.appendChild(wrap);
  }
  document.title = "ready";
};

void run();
