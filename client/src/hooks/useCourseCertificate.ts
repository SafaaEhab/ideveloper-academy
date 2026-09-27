import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  hasIssuedCertificate,
  issueCertificate,
  markCertificateIssued,
  type CertificateCourse,
} from "@/lib/certificate";

type UseCourseCertificateParams = {
  studentName: string | null | undefined;
  accessCode: string | null | undefined;
  /** True when every lesson in the curriculum is completed. */
  isComplete: boolean;
  course: CertificateCourse | null;
};

/**
 * Issues a digital certificate the moment a curriculum reaches 100%.
 *
 * The download fires exactly once per course (tracked in localStorage) and
 * `download()` lets the student re-download it from the portal at any time.
 */
export function useCourseCertificate({
  studentName,
  accessCode,
  isComplete,
  course,
}: UseCourseCertificateParams) {
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState(false);
  const inFlight = useRef(false);
  const primed = useRef(false);
  const wasComplete = useRef(false);

  const award = useCallback(
    async (auto: boolean) => {
      if (!course || !studentName || !accessCode) return;
      if (inFlight.current) return;
      inFlight.current = true;
      setBusy(true);
      try {
        const result = await issueCertificate({ ...course, studentName, accessCode });
        if (result) {
          markCertificateIssued(accessCode, course.courseName, result.serial);
          setIssued(true);
          toast.success(auto ? `Congratulations ${studentName}! Your certificate is downloading` : "Certificate downloaded");
        } else {
          toast.error("We couldn't build your certificate. Please try again.");
        }
      } finally {
        inFlight.current = false;
        setBusy(false);
      }
    },
    [accessCode, course, studentName]
  );

  useEffect(() => {
    if (!accessCode || !course) {
      setIssued(false);
      return;
    }
    setIssued(hasIssuedCertificate(accessCode, course.courseName));
  }, [accessCode, course]);

  useEffect(() => {
    // First observation only establishes the baseline, so re-opening an
    // already-finished course never re-downloads the certificate.
    if (!primed.current) {
      primed.current = true;
      wasComplete.current = isComplete;
      return;
    }
    const justCompleted = isComplete && !wasComplete.current;
    wasComplete.current = isComplete;
    if (!justCompleted || !accessCode || !course) return;
    if (hasIssuedCertificate(accessCode, course.courseName)) return;
    void award(true);
  }, [accessCode, award, course, isComplete]);

  const download = useCallback(() => {
    void award(false);
  }, [award]);

  return { busy, issued, canClaim: isComplete, download };
}
