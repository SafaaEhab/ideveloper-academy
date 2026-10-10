/**
 * Photo manifest for the HTML track.
 *
 * Every picture in this course is a real screenshot of a real page: VS Code on
 * one side, the browser on the other, exactly what the trainer puts on screen.
 * Nothing here is generated.
 *
 * A curriculum image is valid in one of three ways:
 *
 *   1. it is a full URL on the academy's own Cloudinary account — the shot has
 *      been taken and uploaded, and the file no longer sits in the repository, or
 *   2. the file exists under `client/public/curriculum/html/`, or
 *   3. it is declared in {@link PENDING_SHOTS} below.
 *
 * `webCurriculum.test.ts` enforces exactly that, so a typo in an image path is
 * still a failing test — but an un-shot screenshot is a tracked to-do rather
 * than a broken build.
 *
 * ── The list is empty, and that is the honest state ────────────────────────
 *
 * Every shot this track needed has been taken and uploaded, and the sessions now
 * point at the Cloudinary URLs. The forty-odd entries that used to sit here were
 * for screenshots of a session layout the track no longer has: the take-home
 * homework board is gone, and an activity is now a file the student edits rather
 * than a picture they build against, so there is no shot slot left to wait for.
 *
 * Leaving them would have made this a list of pictures nobody asked for, and the
 * test would have had to be weakened to tolerate it.
 *
 * To add a shot: add the section that needs the picture first, pointing at the
 * path here, then add the entry below. The order matters — the test fails on an
 * entry no section references, which is the check that keeps this list honest.
 *
 * How to take a good shot, so the whole course looks like one course:
 *
 *   • VS Code on the left, the browser on the right, both visible in one frame.
 *   • Light theme in VS Code, zoom at 100%, sidebar closed, minimap hidden.
 *   • The browser shows the finished page, not a blank tab and not a file path.
 *   • Crop to the two panes. No desktop icons, no taskbar, no notifications.
 *   • Name the file exactly as the manifest says, lower case, hyphens not
 *     spaces, under `client/public/curriculum/html/session<N>/`.
 *   • Then upload it and put the Cloudinary URL in the section, not the local
 *     path — the repository does not carry these files.
 */

export type PendingShot = {
  /** Public path, relative to `client/public`. */
  path: string;
  /** Session id the picture belongs to, e.g. `html-6`. */
  session: string;
  /** Exactly what the camera should show. */
  capture: string;
};

/** Keeps the session id and the session number next to each other, where a typo shows. */
const s = (
  session: string,
  folder: string,
  file: string,
  capture: string
): PendingShot => ({
  path: `/curriculum/html/${folder}/${file}`,
  session,
  capture,
});

/**
 * The shots still to be taken. Empty, and meant to stay that way until a session
 * asks for a picture.
 *
 * The commented examples below are the two shapes that come up, kept so the next
 * shot is written the same way as the last hundred were.
 */
export const PENDING_SHOTS: PendingShot[] = [
  // s(
  //   "html-4",
  //   "session4",
  //   "figure-output.png",
  //   "A <figure> with an image and its <figcaption> underneath, rendered."
  // ),
  // s(
  //   "html-8",
  //   "session8",
  //   "fieldset-output.png",
  //   "That fieldset rendered, with the legend sitting in the border."
  // ),
];

/** Fast lookup for the curriculum test and for anyone cleaning up the manifest. */
export const PENDING_SHOT_PATHS: string[] = PENDING_SHOTS.map(
  item => item.path
);

/** How many screenshots are still to shoot, by session. */
export const PENDING_BY_SESSION: Record<string, number> = PENDING_SHOTS.reduce(
  (counts, item) => {
    counts[item.session] = (counts[item.session] ?? 0) + 1;
    return counts;
  },
  {} as Record<string, number>
);
