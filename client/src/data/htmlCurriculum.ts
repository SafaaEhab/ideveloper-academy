/**
 * The HTML track — eight sessions, the first two months of the Web course.
 *
 * Written to the same shared shape as every other course in the academy (see
 * `./curriculum`): a header (month, phase, kind), an ordered list of sections
 * and a list of quiz questions. `kind` is always `"HTML"`.
 *
 * A session is two hours in the room, so the track is eight of them: four a
 * month across months 1 and 2.
 *
 * ── One file, built the whole way through ──────────────────────────────────
 *
 * There is no throwaway exercise in this track. From the first session to the
 * last the student builds **one page — Sweet Bakery** — and every session
 * leaves it further along than it found it:
 *
 *   Each session is teaching first and building second. The last section of
 *   every session is its **activity**, and the activity is the only place the
 *   student writes anything:
 *
 *     starterCode    the file as the previous session left it, so the editor
 *                    opens on real work rather than on an empty page
 *     solutionCode   that same file with this session's tags added
 *
 *   The chain is the spine of the course, and it is enforced: a test asserts
 *   that every session's activity opens on precisely the file the previous
 *   session's activity produced. Change one solution and the next starter has
 *   to move with it, or the track stops being one page and becomes eight
 *   unrelated exercises.
 *
 * The track sends no work home. A session ends on the activity it was built in,
 * so there is no take-home brief and no homework block, and the next session
 * opens on exactly what this one produced.
 *
 * Because the sessions run in order, a session only ever uses tags an earlier
 * session has already taught. Session 3 cannot ask for a <figure>, and it does
 * not.
 *
 * Three rules hold everywhere in this file, and each one is checked by a test:
 *
 *   1. Every session ends with its activity, and the activity opens on the
 *      previous session's solution.
 *   2. Every picture is a real screenshot, shot and served from the academy's
 *      Cloudinary account. Nothing here is generated artwork.
 *   3. A correct answer is never left in the same option position twice in a
 *      row, and no position carries more than one answer in a single session.
 *      A student who always ticks the same box does not pass.
 */
import { q, s, type CurriculumLesson } from "./curriculum";

/** Every session in this track is an HTML session. */
export type HtmlLesson = CurriculumLesson<"HTML">;

/** Cover art, the same mark on every session of the track. */
const HTML_HERO =
  "https://res.cloudinary.com/alhiemg0/image/upload/v1790752359/html-hero.png";

const ACCENT = "from-cyan-500/20 to-blue-500/5";

/**
 * The name of the site the whole track builds. It appears in the `<title>` of
 * every file the student saves, so whoever opens the page months later knows
 * exactly which project they are looking at.
 */
const SITE = "Sweet Bakery";

/**
 * The shop the eight in-class activities build, one file from start to finish.
 *
 * Each constant is the whole of `index.html` as it stands at the end of that
 * session, so the chain is visible in one place: `SWEET_BAKERY_4` is
 * `SWEET_BAKERY_3` plus links and pictures, `SWEET_BAKERY_5` is that same page
 * with a real `<head>`, and so on to the order form.
 *
 * Every activity opens its editor on the constant before it and closes on its
 * own. That is the whole point — the student is never asked to start a page from
 * nothing, and nothing they wrote in session 2 is ever thrown away in session 7.
 */
const SWEET_BAKERY_START = `<!DOCTYPE html>
<html>
<head>
    <title>Sweet Bakery</title>
</head>
<body>

</body>
</html>`;

const SWEET_BAKERY_1 = `<!DOCTYPE html>
<html>
<head>
    <title>Sweet Bakery</title>
</head>
<body>

    <h1>Sweet Bakery</h1>

</body>
</html>`;

const SWEET_BAKERY_2 = `<!DOCTYPE html>
<html>
<head>
    <title>Sweet Bakery</title>
</head>
<body>

    <h1>Sweet Bakery</h1>

    <h2>Welcome to Sweet Bakery</h2>

    <p>
        Welcome to our bakery. We make fresh and delicious baked goods every day.
    </p>

    <h3>Our Specialties</h3>

    <p>
        We offer <strong>fresh bread</strong>,
        <b>delicious cakes</b>, and
        <em>tasty pastries</em>.
    </p>

    <p>
        Everything is made with <mark>fresh ingredients</mark>.
    </p>

</body>
</html>`;

const SWEET_BAKERY_3 = `<!DOCTYPE html>
<html>
<head>
    <title>Sweet Bakery</title>
</head>
<body>

    <div>
        <h1>Sweet Bakery</h1>

        <h2>Welcome to Sweet Bakery</h2>

        <p>
            Welcome to our bakery. We make fresh and delicious baked goods every day.
        </p>
    </div>

    <div>
        <h2>Our Products</h2>

        <ul>
            <li>Fresh Bread</li>
            <li>Cakes</li>
            <li>Cookies</li>
            <li>Croissants</li>
        </ul>
    </div>

    <div>
        <h2>Our Best Sellers</h2>

        <ol>
            <li>Chocolate Cake</li>
            <li>Butter Croissant</li>
            <li>Chocolate Cookies</li>
        </ol>
    </div>

    <p>
        Try our <span>freshly baked</span> products today!
    </p>

</body>
</html>`;

const SWEET_BAKERY_4 = `<!DOCTYPE html>
<html>
<head>
    <title>Sweet Bakery</title>
</head>
<body>

    <div>
        <h1>Sweet Bakery</h1>

        <a href="#products">Products</a>
        <a href="#about">About Us</a>
        <a href="#contact">Contact</a>
    </div>

    <div>
        <h2>Welcome to Sweet Bakery</h2>

        <p>
            Fresh, delicious, and made with love.
        </p>

        <img src="https://media.istockphoto.com/id/1479330210/photo/artisan-baker-applying-egg-wash-on-to-pastries-in-a-small-bakery.jpg?b=1&s=612x612&w=0&k=20&c=LoCpP2-n7LhsK1ScQoQXEi0Kp914S7Fwbwi7AD2Z9hU=" alt="Sweet Bakery" width="300">
    </div>

    <div id="products">
        <h2>Our Products</h2>

        <div>
            <h3>Chocolate Cake</h3>
            <img src="https://images.pexels.com/photos/11774178/pexels-photo-11774178.jpeg" alt="Chocolate Cake" width="250">
            <p>Delicious chocolate cake.</p>
        </div>

        <div>
            <h3>Croissant</h3>
            <img src="https://images.pexels.com/photos/27969785/pexels-photo-27969785.jpeg" alt="Croissant" width="250">
            <p>Fresh and crispy croissant.</p>
        </div>
    </div>

    <div id="about">
        <h2>About Us</h2>

        <p>
            Sweet Bakery creates fresh bakery products every day.
        </p>
    </div>

    <div id="contact">
        <h2>Contact Us</h2>

        <a href="mailto:info@sweetbakery.com">
            Email Us
        </a>
    </div>

</body>
</html>`;

const SWEET_BAKERY_5 = `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="description" content="Sweet Bakery - Fresh cakes, bread and pastries">
    <meta name="keywords" content="bakery, cakes, bread, pastries">
    <meta name="author" content="Sweet Bakery">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>Sweet Bakery | Fresh Bakery Products</title>
</head>

<body>

    <div>
        <h1>Sweet Bakery &copy;</h1>

        <a href="#products" title="See our products">
            Our Products
        </a>

        <a href="#about" title="Learn more about us">
            About Us
        </a>

        <a href="#contact" title="Contact Sweet Bakery">
            Contact
        </a>
    </div>

    <div>
        <h2>Welcome to Sweet Bakery</h2>

        <p>
            Fresh, delicious, and made with love &hearts;.
        </p>

        <img
            src="https://media.istockphoto.com/id/1479330210/photo/artisan-baker-applying-egg-wash-on-to-pastries-in-a-small-bakery.jpg?b=1&s=612x612&w=0&k=20&c=LoCpP2-n7LhsK1ScQoQXEi0Kp914S7Fwbwi7AD2Z9hU="
            alt="Sweet Bakery"
            width="300"
            title="Sweet Bakery"
        >
    </div>

    <div id="products">
        <h2>Our Products</h2>

        <div>
            <h3>Chocolate Cake</h3>

            <img
                src="https://images.pexels.com/photos/11774178/pexels-photo-11774178.jpeg"
                alt="Chocolate Cake"
                width="250"
            >

            <p>Price: &dollar;15</p>
        </div>

        <div>
            <h3>Croissant</h3>

            <img
                src="https://images.pexels.com/photos/27969785/pexels-photo-27969785.jpeg"
                alt="Fresh Croissant"
                width="250"
            >

            <p>Price: &dollar;3</p>
        </div>
    </div>

    <div id="about">
        <h2>About Us</h2>

        <p>
            We prepare our products with care &amp; fresh ingredients.
        </p>
    </div>

    <div id="contact">
        <h2>Contact Us</h2>

        <a href="mailto:info@sweetbakery.com">
            info@sweetbakery.com
        </a>
    </div>

</body>
</html>`;

const SWEET_BAKERY_6 = `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="description" content="Sweet Bakery - Fresh bakery products">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sweet Bakery</title>
</head>

<body>

    <div>
        <h1>Sweet Bakery &copy;</h1>

        <a href="#products">Products</a>
        <a href="#media">Media</a>
        <a href="#about">About Us</a>
        <a href="#contact">Contact</a>
    </div>

    <div>
        <h2>Welcome to Sweet Bakery</h2>

        <p>
            Fresh, delicious, and made with love &hearts;.
        </p>

        <img
            src="https://media.istockphoto.com/id/1479330210/photo/artisan-baker-applying-egg-wash-on-to-pastries-in-a-small-bakery.jpg?b=1&s=612x612&w=0&k=20&c=LoCpP2-n7LhsK1ScQoQXEi0Kp914S7Fwbwi7AD2Z9hU="
            alt="Sweet Bakery"
            width="300"
        >
    </div>

    <div id="products">
        <h2>Our Products</h2>

        <div>
            <h3>Chocolate Cake</h3>

            <img
                src="https://images.pexels.com/photos/11774178/pexels-photo-11774178.jpeg"
                alt="Chocolate Cake"
                width="250"
            >

            <p>Price: &dollar;15</p>
        </div>

        <div>
            <h3>Croissant</h3>

            <img
                src="https://images.pexels.com/photos/27969785/pexels-photo-27969785.jpeg"
                alt="Fresh Croissant"
                width="250"
            >

            <p>Price: &dollar;3</p>
        </div>
    </div>

    <div id="media">

        <h2>Inside Our Bakery</h2>

        <video width="300" controls>
            <source src="https://www.pexels.com/download/video/7405923/" type="video/mp4">
            Your browser does not support the video tag.
        </video>

        <h3>Bakery Music</h3>

        <audio controls>
            <source src="audio/bakery.mp3" type="audio/mpeg">
            Your browser does not support the audio element.
        </audio>

        <h3>Find Us</h3>

       <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3438.7539848663523!2d31.18328347536229!3d30.471405574711394!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14f7dfdda087abcb%3A0xa773ae8b22cc1b0c!2siDeveloper%20Academy!5e0!3m2!1sen!2seg!4v1790849504188!5m2!1sen!2seg" width="200" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>

    </div>

    <div id="about">
        <h2>About Us</h2>

        <p>
            We prepare our products with care &amp; fresh ingredients.
        </p>
    </div>

    <div id="contact">
        <h2>Contact Us</h2>

        <a href="mailto:info@sweetbakery.com">
            info@sweetbakery.com
        </a>
    </div>

</body>
</html>`;

const SWEET_BAKERY_7 = `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="description" content="Sweet Bakery - Fresh bakery products">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sweet Bakery</title>
</head>

<body>

    <div>
        <h1>Sweet Bakery &copy;</h1>

        <a href="#products">Products</a>
        <a href="#prices">Prices</a>
        <a href="#media">Media</a>
        <a href="#about">About Us</a>
        <a href="#contact">Contact</a>
    </div>

    <div>
        <h2>Welcome to Sweet Bakery</h2>

        <p>
            Fresh, delicious, and made with love &hearts;.
        </p>

        <img
            src="https://media.istockphoto.com/id/1479330210/photo/artisan-baker-applying-egg-wash-on-to-pastries-in-a-small-bakery.jpg?b=1&s=612x612&w=0&k=20&c=LoCpP2-n7LhsK1ScQoQXEi0Kp914S7Fwbwi7AD2Z9hU="
            alt="Sweet Bakery"
            width="300"
        >
    </div>

    <div id="products">
        <h2>Our Products</h2>

        <div>
            <h3>Chocolate Cake</h3>

            <img
                src="https://images.pexels.com/photos/11774178/pexels-photo-11774178.jpeg"
                alt="Chocolate Cake"
                width="250"
            >

            <p>Price: &dollar;15</p>
        </div>

        <div>
            <h3>Croissant</h3>

            <img
                src="https://images.pexels.com/photos/27969785/pexels-photo-27969785.jpeg"
                alt="Fresh Croissant"
                width="250"
            >

            <p>Price: &dollar;3</p>
        </div>
    </div>

    <div id="prices">
        <h2>Our Price List</h2>

        <table border="1">
            <caption>Sweet Bakery Products</caption>

            <thead>
                <tr>
                    <th>Product</th>
                    <th>Size</th>
                    <th>Price</th>
                </tr>
            </thead>

            <tbody>
                <tr>
                    <td>Chocolate Cake</td>
                    <td>Medium</td>
                    <td>&dollar;15</td>
                </tr>

                <tr>
                    <td>Chocolate Cake</td>
                    <td>Large</td>
                    <td>&dollar;25</td>
                </tr>

                <tr>
                    <td>Croissant</td>
                    <td>Regular</td>
                    <td>&dollar;3</td>
                </tr>

                <tr>
                    <td>Cookies</td>
                    <td>Box</td>
                    <td>&dollar;10</td>
                </tr>
            </tbody>
        </table>
    </div>

    <div id="media">

        <h2>Inside Our Bakery</h2>

        <video width="300" controls>
            <source src="https://www.pexels.com/download/video/7405923/" type="video/mp4">
        </video>

        <audio controls>
            <source src="audio/bakery.mp3" type="audio/mpeg">
        </audio>

       <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3438.7539848663523!2d31.18328347536229!3d30.471405574711394!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14f7dfdda087abcb%3A0xa773ae8b22cc1b0c!2siDeveloper%20Academy!5e0!3m2!1sen!2seg!4v1790849504188!5m2!1sen!2seg" width="200" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>

    </div>

    <div id="about">
        <h2>About Us</h2>

        <p>
            We prepare our products with care &amp; fresh ingredients.
        </p>
    </div>

    <div id="contact">
        <h2>Contact Us</h2>

        <a href="mailto:info@sweetbakery.com">
            info@sweetbakery.com
        </a>
    </div>

</body>
</html>`;

const SWEET_BAKERY_8 = `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="description" content="Sweet Bakery - Fresh bakery products">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sweet Bakery</title>
</head>

<body>

    <div>
        <h1>Sweet Bakery &copy;</h1>

        <a href="#products">Products</a>
        <a href="#prices">Prices</a>
        <a href="#media">Media</a>
        <a href="#about">About Us</a>
        <a href="#contact">Order</a>
    </div>

    <div>
        <h2>Welcome to Sweet Bakery</h2>

        <p>
            Fresh, delicious, and made with love &hearts;.
        </p>

        <img
            src="https://media.istockphoto.com/id/1479330210/photo/artisan-baker-applying-egg-wash-on-to-pastries-in-a-small-bakery.jpg?b=1&s=612x612&w=0&k=20&c=LoCpP2-n7LhsK1ScQoQXEi0Kp914S7Fwbwi7AD2Z9hU="
            alt="Sweet Bakery"
            width="300"
        >
    </div>

    <div id="products">
        <h2>Our Products</h2>

        <div>
            <h3>Chocolate Cake</h3>

            <img
                src="https://images.pexels.com/photos/11774178/pexels-photo-11774178.jpeg"
                alt="Chocolate Cake"
                width="250"
            >

            <p>Price: &dollar;15</p>
        </div>

        <div>
            <h3>Croissant</h3>

            <img
                src="https://images.pexels.com/photos/27969785/pexels-photo-27969785.jpeg"
                alt="Fresh Croissant"
                width="250"
            >

            <p>Price: &dollar;3</p>
        </div>
    </div>

    <div id="prices">
        <h2>Our Price List</h2>

        <table border="1">
            <thead>
                <tr>
                    <th>Product</th>
                    <th>Size</th>
                    <th>Price</th>
                </tr>
            </thead>

            <tbody>
                <tr>
                    <td>Chocolate Cake</td>
                    <td>Medium</td>
                    <td>&dollar;15</td>
                </tr>

                <tr>
                    <td>Chocolate Cake</td>
                    <td>Large</td>
                    <td>&dollar;25</td>
                </tr>

                <tr>
                    <td>Croissant</td>
                    <td>Regular</td>
                    <td>&dollar;3</td>
                </tr>

                <tr>
                    <td>Cookies</td>
                    <td>Box</td>
                    <td>&dollar;10</td>
                </tr>
            </tbody>
        </table>
    </div>

    <div id="media">

        <h2>Inside Our Bakery</h2>

        <video width="300" controls>
            <source src="https://www.pexels.com/download/video/7405923/" type="video/mp4">
        </video>

        <br><br>

        <audio controls>
            <source src="audio/bakery.mp3" type="audio/mpeg">
        </audio>

        <br><br>

       <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3438.7539848663523!2d31.18328347536229!3d30.471405574711394!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14f7dfdda087abcb%3A0xa773ae8b22cc1b0c!2siDeveloper%20Academy!5e0!3m2!1sen!2seg!4v1790849504188!5m2!1sen!2seg" width="200" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>

    </div>

    <div id="about">
        <h2>About Us</h2>

        <p>
            We prepare our products with care &amp; fresh ingredients.
        </p>
    </div>

    <div id="contact">

        <h2>Place Your Order</h2>

        <form>

            <label for="name">Your Name:</label>
            <br>
            <input type="text" id="name" name="name">
            <br><br>

            <label for="email">Your Email:</label>
            <br>
            <input type="email" id="email" name="email">
            <br><br>

            <label for="phone">Phone:</label>
            <br>
            <input type="tel" id="phone" name="phone">
            <br><br>

            <label for="product">Choose Product:</label>
            <br>

            <select id="product" name="product">
                <option>Chocolate Cake</option>
                <option>Croissant</option>
                <option>Cookies</option>
            </select>

            <br><br>

            <label for="quantity">Quantity:</label>
            <br>
            <input type="number" id="quantity" name="quantity">
            <br><br>

            <label for="message">Special Request:</label>
            <br>

            <textarea
                id="message"
                name="message"
                rows="5"
                cols="30">
            </textarea>

            <br><br>

            <button type="submit">Place Order</button>

        </form>

    </div>

</body>
</html>`;

/**
 * Which section of a lesson answers which of its quiz questions.
 *
 * Held in one table rather than on the questions themselves, so the whole
 * mapping can be read — and corrected — in a single glance. The order is the
 * order the questions are asked in, one title per question, and the title must
 * match a section in that same lesson exactly: `webCurriculum.test.ts` checks
 * every one of them resolves, so renaming a section without updating this fails
 * the build instead of leaving a student with a link to nothing.
 *
 * A question may also come from a section further up the track, in which case
 * the title reads "session N — <title>" and the button sends them there.
 */
const QUIZ_SOURCES: Record<string, string[]> = {
  "html-1": [
    "What is HTML?",
    "The structure of every page",
    "Read the HTML of any website",
    "Anatomy of an element",
  ],
  "html-2": [
    "Line breaks: the br element",
    "Headings: h1 to h6",
    "Horizontal rules: the hr element",
    "Formatting tags that carry meaning",
  ],
  "html-3": [
    "Why we need containers",
    "div: a block of its own",
    "Nested lists",
    "Semantic HTML: stop naming everything div",
  ],
  "html-4": [
    "Hyperlinks",
    "Relative and absolute paths",
    "When the path is wrong",
    "Images: src and alt",
  ],
  "html-5": [
    "The shape of an attribute",
    "id: one name, used once",
    "What the head is for",
    "Special characters: when & and < break your page",
  ],
  "html-6": [
    "The video element",
    "Background music",
    "Embedding a page with iframe",
    "The video element",
  ],
  "html-7": [
    "The four table tags",
    "A caption and a header section",
    "When a cell covers more than one",
    "A caption and a header section",
  ],
  "html-8": [
    "Making the browser check your work",
    "Labels and inputs",
    "One answer, or many",
    "Long answers, fixed choices, and groups",
  ],
};

/**
 * Puts each question's source section on it.
 *
 * A lesson with no entry here, or with the wrong number of titles, is left
 * alone rather than half-linked — and the test names it, so a session is never
 * quietly published with some of its questions pointing nowhere.
 */
const withQuizSources = (lessons: HtmlLesson[]): HtmlLesson[] =>
  lessons.map(lesson => {
    const sources = QUIZ_SOURCES[lesson.id];
    if (!sources || sources.length !== lesson.quiz.length) return lesson;
    return {
      ...lesson,
      quiz: lesson.quiz.map((question, index) => ({
        ...question,
        section: sources[index],
      })),
    };
  });

export const htmlLessons: HtmlLesson[] = withQuizSources([
  // ══ 1 · Your first web page ═══════════════════════════════════════════
  {
    id: "html-1",
    number: 1,
    month: 1,
    phase: 1,
    kind: "HTML",
    title: "Your First Web Page",
    subtitle: "What a website is, and how HTML builds it",
    intro:
      "A website is pages linked together. HTML is the language that gives those pages their structure, and by the end of these two hours you will have written one and opened it in a real browser.",
    learningGoal:
      "Explain what a website is, tell the front-end from the back-end, describe an HTML element, and write a complete page that opens in the browser.",
    successCriteria: [
      "Describe a website as linked pages, not a single page",
      "Name the three front-end languages and what each one does",
      "Write a full page — doctype, html, head, title, body — and open it in the browser",
      "Open any site, right-click, choose Inspect, and find its title",
    ],
    commonMistake:
      "Expecting the computer to read English. It only runs 0s and 1s, so every tag has to be written exactly.",
    heroImage: HTML_HERO,
    sections: [
      s(
        "What is a website?",
        "A website is a group of web pages linked together. Each page can hold text, pictures, videos and other content.\n\nA website is an online space where you can:\n• share information\n• connect with other people\n• show off your work\n• buy and sell things\n\nNotice the word linked. One page on its own is a document. Pages that can reach each other are a website. Everything in this course is about making that happen.",
        undefined,
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1790752359/websites.png",
        ]
      ),
      s(
        "Front-end and back-end",
        "The front-end is everything the user sees. It is built with three languages:\n• HTML — the structure\n• CSS — the colors and the layout\n• JavaScript — the behavior\n\nThe back-end is the hidden logic, servers and databases. You never see it on the page, but nothing works without it.\n\nThis month is HTML. You are learning to give a page its skeleton. Next month you dress it, and the month after that you make it move.",
        undefined,
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1790752359/frontend.png",
          "https://res.cloudinary.com/alhiemg0/image/upload/v1790752359/backend.png",
        ]
      ),
      s(
        "What is HTML?",
        "HTML stands for HyperText Markup Language. It is not a programming language — it is a markup language.\n\n• It is the standard language for creating web pages.\n• It describes the structure of a page.\n• It is built from elements.\n\nMarkup means marking up: you take a piece of text and you mark it to say what it is. A heading is marked as a heading. A list is marked as a list. The browser reads the marks and knows what to do.",
        undefined,
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1790752359/page-wireframe.png",
          "https://res.cloudinary.com/alhiemg0/image/upload/v1790752359/html-css-js.png",
        ]
      ),
      s(
        "Anatomy of an element",
        "An HTML element is a start tag, some content, and an end tag.\n\nThe element is everything from the start tag to the end tag. Nothing more, nothing less.\n\nThe start tag often carries extra information inside it. That part is called an attribute, and you will meet it properly in session 5 — for now just notice the shape: tag, then marks, then content, then closing tag.",
        `<h1>My First Heading</h1>`,
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1790752359/element-anatomy.png",
        ]
      ),
      s(
        "The structure of every page",
        '<!DOCTYPE html> — this document is HTML5. It goes on the very first line, every time.\n<html> — the root element. Everything else sits inside it.\n<head> — information about the page, not shown on it. The title lives here.\n<title> — the name on the browser tab.\n<body> — everything the user can see.\n\nThe browser does not care about your indentation, but you do. Indent one level every time you go inside a new element, and the page structure becomes something you can read at a glance.\n\nOn that first line inside head, add <meta charset="utf-8">. It tells the computer how to read your text, and without it any Arabic you type arrives as a row of little boxes. We will come back to it in session 5.',
        `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Page Title</title>
  </head>
  <body>
    <h1>My First Heading</h1>
    <p>My first paragraph.</p>
  </body>
</html>`,
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1790752359/page-structure.png",
          "https://res.cloudinary.com/alhiemg0/image/upload/v1790752359/nesting.png",
        ]
      ),
      s(
        "Read the HTML of any website",
        "You can read the HTML of any site on the internet yourself.\n1. Right-click anywhere on the page.\n2. Choose Inspect.\n3. The Elements panel opens with the live HTML.\n\nDouble-click the text inside the <title> tag to change it, and the tab title updates instantly. That is not an edit to the site — it is a preview you are allowed to break, because it is only on your screen.\n\nDo this on three sites before the end of the session. Get comfortable here, because in every session from now on, Inspect is how you check your own work.",
        undefined,
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1790752359/inspect-menu.png",
          "https://res.cloudinary.com/alhiemg0/image/upload/v1790752359/devtools-title.png",
        ]
      ),
      s(
        "Activity: your first Sweet Bakery page",
        "",
        undefined,
        undefined,
        SWEET_BAKERY_START,
        SWEET_BAKERY_1
      ),
    ],
    quiz: [
      q(
        "What does HTML stand for?",
        [
          "HyperText Markup Language",
          "High Text Markup Language",
          "HyperText Making Language",
          "Home Tool Markup Language",
        ],
        0,
        "HTML = HyperText Markup Language, the standard language for page structure."
      ),
      q(
        "Which part of a page holds everything the visitor can see?",
        ["<head>", "<body>", "<title>", "<!DOCTYPE html>"],
        1,
        "<body> holds the visible content. <head> holds information about the page instead."
      ),
      q(
        "How do you open the HTML of a page you are visiting?",
        [
          "Press F12 and wait",
          "Open the file in Notepad",
          "Right-click anywhere on the page and choose Inspect",
          "Type view-source in the address bar only on mobile",
        ],
        2,
        "Right-click anywhere on the page and choose Inspect to open the developer tools."
      ),
      q(
        "An HTML element is made of:",
        [
          "A start tag and an end tag",
          "Only a slash and a name",
          "A pair of quotation marks",
          "A start tag, content, and an end tag",
        ],
        3,
        "Start tag + content + end tag is the full definition of an element."
      ),
    ],
    accent: ACCENT,
  },
  // ══ 2 · Text ═══════════════════════════════════════════════════════════
  {
    id: "html-2",
    number: 2,
    month: 1,
    phase: 1,
    kind: "HTML",
    title: "Headings, Paragraphs & Formatting",
    subtitle: "Turn a wall of text into something a reader can use",
    intro:
      "Headings build the reading map, <p> holds one idea, <br> breaks a line, <hr> separates sections, and the formatting tags say what a piece of text means. Six tags, and your page is readable.",
    learningGoal:
      "Use h1 to h6 in the right order, keep one idea per paragraph, and choose the right formatting tag for the meaning you want.",
    successCriteria: [
      "Use exactly one h1 per page, then step down through h2 and h3 without skipping a level",
      "Never place two separate ideas in the same <p>",
      "Explain the difference between <br> and <hr> in one sentence",
      "Reach for <strong> and <em> first, and say why <b> and <i> are the weaker choice",
    ],
    commonMistake:
      "Using <br> to create space. A <br> is a line break, not a spacer — when you need room, that is a job for CSS, and for separation it is <hr>.",
    heroImage: HTML_HERO,
    sections: [
      s(
        "Headings: h1 to h6",
        "Headings are the titles and subtitles you display on a page.\n• <h1> is the most important heading.\n• <h6> is the least important.\n\nUse one <h1> per page, then step down in order.",
        `<body>
  <h1>Heading 1</h1>
  <h2>Heading 2</h2>
  <h3>Heading 3</h3>
  <h4>Heading 4</h4>
  <h5>Heading 5</h5>
  <h6>Heading 6</h6>
</body>`
      ),
      s(
        "Paragraphs: the p element",
        "Everything inside <p> is displayed as one continuous block of text. ",
        `<body>
  <p>
    Lorem, ipsum dolor sit amet consectetur adipisicing elit.
    Eum unde asperiores, porro, qui est, non laudantium labore.
  </p>
</body>`
      ),
      s(
        "Line breaks: the br element",
        "<br> defines a line break. Use it when you need a new line without starting a new paragraph — an address, or three short facts one under the other.\n\nIt is an empty tag, so it has no end tag.",
        `<body>
  <p>This is <br> a paragraph <br> with line breaks</p>
</body>`
      ),
      s(
        "Horizontal rules: the hr element",
        "<hr> is a thematic break, displayed as a horizontal line. ",
        `<body>
  <h1>This is Heading 1</h1>
  <p>This is some text.</p>
  <hr>
  <h2>This is Heading 2</h2>
  <p>This is some more text.</p>
  <hr>
</body>`
      ),
      s(
        "Comments: notes the browser never sees",
        "Comments are notes you add to your own code. The browser ignores them completely, so they never appear on the page.\n\nUse a comment to explain a part of the code, to organize the sections of a long file, or to switch something off while you test it.\n\nA good comment answers why, not what. The code already says what it does.",
        `<!-- Header Section -->
<h1>Welcome to My Website</h1>

<!--
  Main Content
  This is a comment that runs over
  more than one line. Nothing here
  ever reaches the page.
-->`
      ),
      s(
        "Formatting tags that carry meaning",
        "These elements were designed to display special types of text. ",
        `<p>
  <b>Bold only.</b> <strong>Important.</strong><br>
  <i>The Great Gatsby</i> is a book.<br>
  I really <em>need</em> to finish this.
</p>

<p>
  <mark>Read this part</mark> before the test.<br>
  <del>Bring a notebook</del> <ins>Bring a laptop</ins><br>
  H<sub>2</sub>O and 10<sup>3</sup>
</p>`,
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1790752359/formatting-tags.png",
        ]
      ),
      s(
        "Activity: fill out the Sweet Bakery page",
        "",
        undefined,
        undefined,
        SWEET_BAKERY_1,
        SWEET_BAKERY_2
      ),
    ],
    quiz: [
      q(
        "Which tag gives a line break without starting a new paragraph?",
        ["<p>", "<hr>", "<br>", "<h6>"],
        2,
        "<br> is an empty tag that forces a new line inside the current block."
      ),
      q(
        "How many <h1> tags should a page normally have?",
        ["One per section", "As many as you like", "None", "One per page"],
        3,
        "One h1 is the main title of the page. Everything below it steps down to h2, h3 and so on."
      ),
      q(
        "What is the difference between <hr> and <br>?",
        [
          "<hr> is empty and <br> separates sections",
          "<br> is empty and <hr> has a closing tag",
          "They are the same tag with two spellings",
          "<hr> only works inside a heading",
        ],
        0,
        "Both are empty tags. <br> breaks a line, <hr> draws a horizontal line between sections."
      ),
      q(
        "What is the difference between <b> and <strong>?",
        [
          "There is no difference",
          "<strong> marks important text, <b> is only bold",
          "<b> is for headings only",
          "<strong> cannot be used inside a paragraph",
        ],
        1,
        "<strong> carries importance, <b> is only a visual effect. Prefer <strong>."
      ),
    ],
    accent: ACCENT,
  },
  // ══ 3 · Grouping and structure ════════════════════════════════════════
  {
    id: "html-3",
    number: 3,
    month: 1,
    phase: 1,
    kind: "HTML",
    title: "Grouping with Lists & div and span",
    subtitle: "The two tags that turn loose text into a page",
    intro:
      "So far every tag has added something. <div> and <span> add nothing at all — they group. That is the single most useful thing HTML does, and it is where your page stops being a list of lines and starts being a page.",
    learningGoal:
      "Group related content with <div> and <span>, build ordered, unordered and nested lists, and name the parts of a page with the semantic tags instead of a pile of divs.",
    successCriteria: [
      "Use <div> for a block of related content and <span> for a few words inside a sentence",
      "Nest a div inside a div and read the indentation to check you closed each one",
      "Use <ol> when the order matters and <ul> when it does not",
      "Build a page out of header, nav, main, section, aside and footer",
    ],
    commonMistake:
      "Closing the </li> and then writing the sub-list outside it. A nested list must be a child of the item it belongs to, or the indentation is wrong.",
    heroImage: HTML_HERO,
    sections: [
      s(
        "Lists: ol, ul and li",
        "HTML lists group a set of related items. There are two types.\n\nAn ordered list uses <ol> and the browser numbers the items — use it for steps, a ranking, or anything with a sequence.\n\nAn unordered list uses <ul> and the browser puts a bullet in front of each item — use it when the order does not matter.\n\nEvery item inside either one is wrapped in its own <li>. The tag tells the reader something: a numbered list is read as a sequence, a bulleted list as a set. So the navigation at the top of a page is a <ul>, and the steps of an experiment are an <ol>.",
        `<ol>
  <li>HTML</li>
  <li>CSS</li>
  <li>JavaScript</li>
</ol>

<ul>
  <li>Coffee</li>
  <li>Tea</li>
  <li>Milk</li>
</ul>`
      ),
      s(
        "Nested lists",
        "A list item can contain another whole list. Put the second list inside the <li> it belongs to, and the browser indents it automatically.\n\nLook closely at the structure: the <ul> opens before the </li> closes, not after it. That is the whole trick, and it is the same rule as nested divs.",
        `<ol>
  <li>Eggs</li>
  <li>Milk</li>
  <li>Chocolate
    <ul>
      <li>Dark Chocolate</li>
      <li>White Chocolate</li>
    </ul>
  </li>
  <li>Butter</li>
</ol>`
      ),
      s(
        "Why we need containers",
        "Look at a page with a title, a picture and two paragraphs. Every tag is correct, and the page is a mess — everything runs together because nothing is saying what belongs to what.\n\nHTML fixes that with elements that carry no style of their own. They exist purely to say: these belong together. There are two of them, and the difference is how they behave."
      ),
      s(
        "div: a block of its own",
        "<div> is a block element. It always starts on a new line, and it takes the full width of its parent.\n\nWhatever you put inside a div — a heading, a picture, three paragraphs — moves together as one unit, and it can never sit beside anything else.\n\nUse div when you are grouping a chunk of a page: a header, a card, a footer, a whole column.",
        `<div>
  <h2>Today's weather</h2>
  <p>Sunny, 24 degrees.</p>
</div>

<div>
  <h2>Today's news</h2>
  <p>The new library opens on Friday.</p>
</div>`
      ),
      s(
        "span: a few words, in line",
        "<span> is an inline element. It does not break the line. It simply marks a piece of the sentence so something else can find it later.\n\nRight now the only thing that will act on a span is CSS, in month 3. That is the honest answer — a span with no style attached does nothing at all, and that is fine. You are marking it now so it is ready then.\n\nUse span for a few words inside a sentence: a name, a price, a word you want to colour.",
        `<p>
  The score was <span>3 - 1</span> in the second half.
</p>`
      ),
      s(
        "Nesting containers",
        "A div can hold another div. This is how a real page is built — a page container holding a header, a main area and a footer.\n\nNesting means opening a tag inside another tag, then closing the inner one first. Read the indentation to check: every line that moves in must come back out again.\n\nThe habit that makes this safe: every time you type an opening tag, type its closing tag immediately after it, then fill in the content between them. You never go hunting for a tag you forgot.",
        `<div>
  <div>
    <h1>My Page</h1>
  </div>
  <div>
    <h2>Main content</h2>
    <p>Everything else goes here.</p>
  </div>
</div>`
      ),

      s(
        "Semantic HTML: stop naming everything div",
        "You can build any page out of divs and class names. It will work, and it will be worse: unreadable to a search engine, unreadable to a screen reader, and miserable for the next person. HTML has a tag for almost every part of a page. Use it.\n\n• <header> — the top of the page: title, logo, nav\n• <nav> — a block of links that takes you around the site\n• <main> — the one place holding the content the page is about\n• <section> — a themed chunk of that content\n• <article> — a piece that would still make sense on its own\n• <aside> — related but secondary: a sidebar, a note\n• <footer> — the bottom of the page\n\nA page has one <main>. Not two.\n\nThe difference is not the picture — the tags are all unstyled boxes. The difference is what a search engine and a screen reader can do with them. <nav> tells them where the site map is. <article> tells them this is a story. You get all of that for free, just by not using div for something that already has a name.",
        `<header>
  <h1>My Site</h1>
</header>

<nav>
  <a href="index.html">Home</a>
  <a href="about.html">About</a>
</nav>

<main>
  <section>
    <h2>The squad</h2>
    <p>Twelve players, listed by position.</p>
  </section>

  <article>
    <h2>Match report: Riverside 2 - 1 Kings</h2>
    <p>We won on Sunday with a goal in the last minute.</p>
  </article>

  <aside>
    <h3>Next match</h3>
    <p>Saturday, home, kick-off at four.</p>
  </aside>
</main>

<footer>
  <p>Made at iDeveloper</p>
</footer>`
      ),
      s(
        "Activity: group the Sweet Bakery page",
        "",
        undefined,
        undefined,
        SWEET_BAKERY_2,
        SWEET_BAKERY_3
      ),
    ],
    quiz: [
      q(
        "What is a div for?",
        [
          "Adding a color to a block",
          "Showing text in a bigger size",
          "Linking to another page",
          "Grouping related content together",
        ],
        3,
        "A div adds no style of its own. It exists to say that a group of things belongs together."
      ),
      q(
        "How does a div behave compared to a span?",
        [
          "A div starts a new line, a span stays inside the line",
          "A div sits inside a sentence, a span starts a new line",
          "They behave exactly the same",
          "A span is only for links",
        ],
        0,
        "div is a block and takes the full width. span is inline and stays in the sentence."
      ),
      q(
        "Where does a sub-list go?",
        [
          "After the closing </li>",
          "Inside the <li> it belongs to",
          "Inside the <ol>, between two <li> items",
          "In a second <ul> at the end of the page",
        ],
        1,
        "A nested list is a child of its own <li>, which is what makes the indentation come out right."
      ),
      q(
        "How many <main> elements should a page have?",
        [
          "One per section",
          "As many as there are topics",
          "Exactly one",
          "None",
        ],
        2,
        "One main marks the content the page is about. Everything else is a header, a section, an aside or a footer."
      ),
    ],
    accent: ACCENT,
  },
  // ══ 4 · Links and images ══════════════════════════════════════════════
  {
    id: "html-4",
    number: 4,
    month: 1,
    phase: 1,
    kind: "HTML",
    title: "Links, Images & Paths",
    subtitle: "Make your page travel, and make it show things",
    intro:
      "The link is what turns a page into a website, and the image is what makes a page worth visiting. One tag carries the destination; two attributes carry the picture. The hard part of both is not the tag — it is the path.",
    learningGoal:
      "Build links between your own pages, to other sites, to an email address and a phone number, and place images with the right kind of path and a real description.",
    successCriteria: [
      'Link two of your own pages with a relative href such as "about.html"',
      "Use mailto: and tel: so the right app opens",
      'Choose target="_blank" deliberately, and add rel="noopener" with it',
      "Write alt that describes the picture, and predict what a wrong path shows",
      "Wrap a picture and its caption in a <figure>",
    ],
    commonMistake:
      'Writing alt="photo.jpg". That is the file name, not a description — a screen reader reads it out as a string of letters and stops. Write what the picture shows.',
    heroImage: HTML_HERO,
    sections: [
      s(
        "Hyperlinks",
        'Links, also called hyperlinks, connect one page to another or to an external website.\n\nThey are created with the <a> tag. The destination goes inside the href attribute, and the words the visitor clicks sit between the tags.\n\nThose two halves do different jobs, and it is worth being clear about which is which. The href is where the machine goes. The words are what the human reads. So never put the file name between the tags — "about.html" tells a visitor nothing. Write "About me".',
        `<a href="https://www.google.com">Google</a>`
      ),
      s(
        "Where the link opens: the target attribute",
        'By default the linked page opens in the same tab. To change that, add the target attribute:\n• _self — the default, opens in the same tab\n• _blank — opens in a new tab or window\n\nWhen you use _blank, add rel="noopener". It stops the new page from reaching back into yours, and it is good manners to the site you opened.\n\nDecide deliberately. A link to another page of your own site belongs in the same tab — the visitor expects to come back. A link to a YouTube video is fine in a new one, because they will not.',
        `<a href="about.html" target="_blank" rel="noopener">About me</a>`
      ),
      s(
        "Links that are not pages",
        "href is not limited to web pages. The first few characters tell the browser what to do.\n\n• https://… — a page on another site\n• about.html — a page in your own project\n• mailto:someone@example.com — opens the mail app, with the address filled in\n• tel:01000000000 — opens the phone app, ready to call\n• #top — jumps to a place inside the same page",
        `<a href="https://www.wikipedia.org">Look it up on Wikipedia</a><br>
<a href="mailto:hello@example.com">Email us</a><br>
<a href="tel:01000000000">Call the school</a><br>
<a href="#top">Back to the top</a><br>`
      ),
      s(
        "Building a site that holds together",
        "A website is not one page. It is pages that can all reach each other.\n\nA good rule: every page carries the same set of links, usually at the top, so a visitor is never stranded. Build them in the same order every time, and in session 5 you will wrap them so the browser knows they are navigation.",
        undefined
      ),
      s(
        "Images: src and alt",
        "Images are displayed with the <img> tag. Unlike <a>, it has no closing tag.\n\nThe <img> tag needs two attributes:\n• src — the path to the image, either a file on your computer or an image on another site\n• alt — the text shown if the image fails to load, and read out by a screen reader",
        `<img src="https://images.pexels.com/photos/15565023/pexels-photo-15565023.jpeg" alt="A sea" width="300">
<img src="https://example.com/pic.jpg" alt="A stock photo of a mountain">`
      ),
      s(
        "Relative and absolute paths",
        "A relative path points to a file relative to where your HTML file lives. Use it for files inside your project. A file in the same folder is just its name; a file one folder down is folder/name.\n\nAn absolute path is a full web address. It also works for images taken straight from the internet.\n\nA full computer path such as C:/Users/Desktop/photo.jpg only works on your own machine, so it is not recommended.",
        undefined
      ),
      s(
        "When the path is wrong",
        "If the browser cannot find the file, the picture does not appear. What you see instead is the alt text.\n\nSo alt is not decoration. It is the page's fallback, and it is the first thing a screen reader says. This is why the path and the alt text belong in the same lesson: one is the promise, the other is what happens when the promise breaks.\n\nBreak one on purpose during this session. It is much cheaper to learn this now than on a page you care about.",
        undefined,
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1790752359/broken-image-alt.png",
        ]
      ),
      s(
        "Images as links, and pictures with captions",
        "To make a picture clickable, put the <img> inside an <a>. The link works exactly as it did with text.\n\nTo give an image a caption, use the tags built for the pairing: <figure> holds the picture, and <figcaption> holds the words that go with it. A caption is not a <p> you happen to put underneath — this is the structure for it, and it is what a screen reader announces before the picture.\n\nTo control size, use width and height in pixels. Always give both, so the browser knows the shape before the file loads and the page does not jump.",
        `<a href="hobbies.html">
  <img src="https://images.pexels.com/photos/15565023/pexels-photo-15565023.jpeg" alt="Me winning a football match" width="300">
</a>
`
      ),
      s(
        "Activity: make the Sweet Bakery page travel and show things",
        "",
        undefined,
        undefined,
        SWEET_BAKERY_3,
        SWEET_BAKERY_4
      ),
    ],
    quiz: [
      q(
        "Which attribute of <a> holds the destination of the link?",
        ["src", "href", "alt", "target"],
        1,
        "href holds the destination. target decides where the page opens."
      ),
      q(
        "Which path should you use for an image stored inside your project folder?",
        [
          "C:/Users/Desktop/photo.png",
          "The name of the file only, with no folder",
          "Any full web address",
          "A relative path such as images/photo.png",
        ],
        3,
        "A relative path points from your HTML file to a file inside the project."
      ),
      q(
        "What does the browser show when an image path is wrong?",
        [
          "A red cross",
          "Nothing at all, and the page stops",
          "The alt text",
          "The file name in full",
        ],
        2,
        "The alt text is the fallback, which is exactly why it has to describe the picture."
      ),
      q(
        "Which alt text is the useful one?",
        [
          'alt="A cat asleep on a keyboard"',
          'alt="photo"',
          'alt="DSC0031"',
          'alt="cat.jpg"',
        ],
        0,
        "A good alt describes what the picture shows. The others are file names and tell a reader nothing."
      ),
    ],
    accent: ACCENT,
  },
  // ══ 5 · How a page describes itself ═══════════════════════════════════
  {
    id: "html-5",
    number: 5,
    month: 2,
    phase: 1,
    kind: "HTML",
    title: "Attributes, the Head & Special Characters",
    subtitle: "The information a page carries about itself",
    intro:
      "You have been using attributes since session 1 without naming them. This session gives them a name, adds the two that change what a page can do, and then goes inside <head> — the part nobody sees, where four lines decide how your page handles Arabic, phones and search results.",
    learningGoal:
      "Write attribute syntax confidently, use id to name one element and class to group many, and write a head that gives the page a title, a character set, a mobile viewport and a description.",
    successCriteria: [
      'Write name="value" with the value in quotation marks, every time',
      "Use an id once and only once, and never start it with a digit",
      "Write a link that jumps to an element using its id",
      "Write all four head lines and say what each one does",
      "Escape & and < in running text with the right entity",
    ],
    commonMistake:
      "Leaving out the quotation marks. href=about.html works on your machine and fails on the server — always put the value in quotes.",
    heroImage: HTML_HERO,
    sections: [
      s(
        "The shape of an attribute",
        "An attribute goes inside the opening tag, after the tag name. It has two halves: a name, and a value in quotation marks.\n\nIf the value has spaces in it, the quotation marks are what keep it in one piece. Drop them and href=about us.html is read as two separate values.\n\nSome attributes have no value at all. They are switches, and their presence is the whole meaning — the same way a light switch is on because it is there.",
        `<a href="about.html" title="Read more about us">About</a>
<img src="https://images.pexels.com/photos/15565023/pexels-photo-15565023.jpeg" alt="A sea" width="300">

<button disabled>Cannot press me</button>
<input type="checkbox" checked>`
      ),
      s(
        "id: one name, used once",
        "An id names one single element on the page, so nothing else on the page can share the name.\n\nUse an id when you need to point at something directly: a link that jumps to it, or JavaScript that changes it later.\n\nTwo rules: no spaces, and do not start with a digit. So my-profile is fine, my profile and 2profile are not.",
        `<h2 id="my-profile">About me</h2>
<p id="intro">This paragraph is the introduction.</p>`,
        undefined
      ),
      s(
        "class: a name you can reuse",
        'A class names a kind of element, not one particular element. Ten elements can all carry class="card" and that is perfectly correct.\n\nOne element can carry several classes, separated by spaces: class="card card--wide".\n\nNothing happens yet when you write a class. In month 3 it becomes the hook that CSS hangs every color, size and spacing rule on. Writing them now is how you keep month 3 easy.',
        `<div class="card">A box</div>
<div class="card">Another box</div>
<div class="card card--wide">A third, wider box</div>`,
        undefined
      ),
      s(
        "Jumping inside the page",
        "Put the two together and you get a table of contents.\n\nA link whose href starts with # jumps to the element whose id is the rest of the text. No page reload, no new file — the browser just scrolls.\n\nThis is the first interactive thing you have built, and it works with nothing but HTML.",
        `<a href="#my-profile">Skip to the profile</a>

<h2 id="my-profile">About me</h2>
<p>I am fourteen and I like building things.</p>`
      ),
      s(
        "What the head is for",
        "<head> holds information about the page. Nothing in it is shown on the page itself.\n\nIt starts with <title>, which the browser shows on the tab. Everything else in a beginner's head is a <meta> element — a single line that tells the browser something it cannot work out on its own.\n\nFour lines are enough for a professional page. You will write all four in this session, and every page of your site gets them.",
        `<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>My Page</title>
  <meta name="description" content="What this page is about.">
</head>`
      ),
      s(
        "charset: why Arabic needs it",
        "Computers store text as numbers, and there are many ways to do it. The charset line says which system this file uses.\n\nutf-8 is the one that covers every language, including Arabic and English in the same file. Write it as the very first thing in the <head>, before any real content.\n\nGet this wrong and the symptom is unmistakable: the page looks perfect until you add one Arabic sentence, and then it arrives as a row of little boxes and question marks. Nothing you write in the body will fix it.",
        `<meta charset="utf-8">

<p lang="ar">مرحبا بكم في موقعنا</p>`
      ),
      s(
        "viewport: what a phone sees",
        "Phones pretend to be narrow. Without telling them otherwise, a phone loads your page at the width of a desktop screen and then shrinks the whole thing to fit — so your text comes out tiny and unreadable.\n\nThe viewport line stops that. It says: use the real width of this screen.\n\nThis is the single most useful line in the head, and it is the reason a page you wrote on a laptop is readable on a phone with no extra work.",
        `<meta name="viewport" content="width=device-width, initial-scale=1">`
      ),
      s(
        "description, and lang",
        "The description is the short paragraph a search engine shows under your page title. Nobody sees it on the page itself.\n\nWrite it for someone deciding whether to click. Say what the page actually is, in one sentence, about fifteen words. Not a list of keywords, and never the same text as the title. Every page needs its own, or every search result says the same thing.\n\nThe lang attribute goes on the <html> tag, not in the head, and tells the browser which language the page is written in. It decides the font, the voice a screen reader uses, and which audience a search engine shows the page to. You can also put it on one element when a single part of a page is in another language.",
        `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="description" content="A small guide to HTML tables, with five worked examples you can copy.">
  <title>HTML Tables</title>
</head>
<body>
  <p>This page is mostly English.</p>
  <p lang="ar">لكن هذه الجملة بالعربية.</p>
</body>
</html>`
      ),
      s(
        "Special characters: when & and < break your page",
        "HTML reads < as the start of a tag and & as the start of an entity. So the moment you write real text containing those characters, the browser stops reading it as text and starts looking for a tag.\n\nA sentence like 5 < 10 is read as the start of an element, and everything after it disappears into the tag.\n\nAn entity is an ampersand, a short name, and a semicolon. Three cover almost everything:\n\n• &amp; — an ampersand: Fish &amp; Chips\n• &lt; — a less-than sign: 5 &lt; 10\n• &gt; — a greater-than sign: 10 &gt; 5\n\nAnd four worth knowing:\n\n• &nbsp; — a space the browser may not break at, so a line never starts with one word alone\n• &copy; — ©\n• &hellip; — …\n• &mdash; — an em dash\n\nAnything can also be written as a number, which is how you get a character with no name: &#8364; is the euro sign.",
        `<p>Fish &amp; Chips</p>
<p>5 &lt; 10 and 10 &gt; 5</p>

<p>&copy; 2026 iDeveloper. All rights reserved.</p>
<p>Chapter&nbsp;One &mdash; the first project</p>`
      ),
      s(
        "Activity: give the Sweet Bakery page a real head",
        "",
        undefined,
        undefined,
        SWEET_BAKERY_4,
        SWEET_BAKERY_5
      ),
    ],
    quiz: [
      q(
        "Where does an attribute go?",
        [
          "After the closing tag",
          "On the line above the tag",
          "Inside the opening tag, after the tag name",
          "Inside the quotation marks",
        ],
        2,
        "Attributes live inside the opening tag. The closing tag never carries any."
      ),
      q(
        "What is the difference between an id and a class?",
        [
          "An id names one element, a class names a kind of element",
          "An id can be reused, a class cannot",
          "A class only works on images",
          "There is no difference",
        ],
        0,
        "An id is unique on the page. A class can be shared by as many elements as you like."
      ),
      q(
        "What happens when a required head line is left out?",
        [
          "The page will not load",
          "The browser adds it for you",
          "The links stop working",
          "Nothing appears to happen, and the problem only shows up on a phone or in Arabic",
        ],
        3,
        "The viewport and charset lines fail silently on a desktop. They are the two most valuable lines in the head for that reason."
      ),
      q(
        "How do you write a less-than sign in a sentence?",
        ["<", "&lt;", "&less;", "\\<"],
        1,
        "&lt; is the entity for <. A raw < makes the browser think a tag has started."
      ),
    ],
    accent: ACCENT,
  },
  // ══ 6 · Media ══════════════════════════════════════════════════════════
  {
    id: "html-6",
    number: 6,
    month: 2,
    phase: 1,
    kind: "HTML",
    title: "Media: Audio, Video & Embedded Pages",
    subtitle: "Sound, moving pictures, and a whole website inside yours",
    intro:
      "Audio and video are the same element with different names. For a video you host yourself you use <video>. For a YouTube video you do not use <video> at all — you embed YouTube's own page inside yours.",
    learningGoal:
      "Add an <audio> and a <video> element with a <source> inside, embed a YouTube video with an <iframe>, and set the size and accessibility attributes yourself.",
    successCriteria: [
      "Give every audio and video element a <source> and the controls attribute",
      "Explain why muted has to come with autoplay",
      "Get the embed code from YouTube by right-click, and paste it without editing it",
      "Give every iframe a title and a width and a height",
    ],
    commonMistake:
      "Using autoplay without muted. Every modern browser refuses to start a video with sound until the visitor has interacted, so the video never plays and the reason is not obvious.",
    heroImage: HTML_HERO,
    sections: [
      s(
        "The audio element",
        "The <audio> tag plays a sound file on your page. Like <video>, it needs an opening tag, a <source>, and a closing tag.\n\nThe important attributes are:\n• src — path to the audio file\n• controls — adds the play, pause and volume buttons\n• autoplay — starts playing automatically\n• muted — starts without sound\n• loop — repeats the audio continuously",
        `<audio controls>
  <source src="music.mp3" type="audio/mpeg">
</audio>`
      ),
      s(
        "Background music",
        "Three attributes together make a page play music quietly in a loop — the trick behind almost every game and quiz site.\n\n<audio controls autoplay muted loop>\n\nRead the two rules behind it. autoplay needs muted, or the browser blocks it. And controls is still there, so the visitor can turn it off. Never hide the controls: a page that makes noise you cannot silence is a page people close.",
        `<audio controls autoplay muted loop>
  <source src="background.mp3" type="audio/mpeg">
</audio>`
      ),
      s(
        "The video element",
        "The <video> tag does the same job for moving pictures. Same shape: an opening tag, a <source>, a closing tag.\n\nThe attributes are the ones you already know, plus two of its own:\n• poster — an image shown before the video starts, so the page is not empty while it loads\n• width and height — the size it takes on the page\n\nAlways give width and height. The browser then reserves the right space, and the page does not jump while the video loads.",
        `<video controls width="400" poster="images/poster.jpg">
  <source src="movie.mp4" type="video/mp4">
</video>`
      ),
      s(
        "The text inside the tag",
        "Notice the sentence between <video> and </video>. That is a fallback: it is only ever shown by a browser that cannot play the file at all.\n\nIt costs one line and it is the difference between a helpful page and a blank space, so write one. The same idea applies to audio.",
        undefined
      ),
      s(
        "Embedding a page with iframe",
        "An iframe, short for inline frame, lets you embed another webpage inside your own webpage.\n\nIt is a full page, not a file. That is the difference from <video>: <video> plays a file you own, while <iframe> loads a page someone else built.\n\nTo add a YouTube video you do not use the <video> element. YouTube provides an embed code that uses the <iframe> tag instead.",
        `<iframe
  width="560" height="315"
  src="https://www.youtube.com/embed/VIDEO_ID"
  title="How to bake a cake"
  frameborder="0"
  allowfullscreen>
</iframe>`
      ),
      s(
        "Getting the YouTube embed code",
        "You never write the iframe by hand for YouTube.\n1. Open the video on YouTube.\n2. Right-click on the video.\n3. Choose Copy embed code.\n4. Paste it into your page.\n\nPaste it as it is. The src ends in /embed/ followed by a code such as dQw4w9WgXcQ, and that code is the video's identity. Change a digit and you get a different video, or none at all.\n\nThen set the attributes yourself. width and height are the size on your page — change these first, every time. title is a description of what is inside, and a screen reader reads it out before the visitor ever knows a video is there, so never leave it off. allowfullscreen lets the visitor go full screen; keep it.",
        undefined,
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1790752359/copy-embed-code.png",
        ]
      ),
      s(
        "Activity: put sound and a map on the Sweet Bakery page",
        "",
        undefined,
        undefined,
        SWEET_BAKERY_5,
        SWEET_BAKERY_6
      ),
    ],
    quiz: [
      q(
        "Why does an autoplaying video need muted?",
        [
          "Because browsers block autoplay with sound until the visitor interacts",
          "To make it smaller",
          "To hide the controls",
          "To speed up loading",
        ],
        0,
        "Every modern browser blocks sound-before-interaction, so autoplay without muted simply does not start."
      ),
      q(
        "Which attribute repeats audio forever?",
        ["controls", "muted", "autoplay", "loop"],
        3,
        "loop repeats the audio continuously. controls only adds the player buttons."
      ),
      q(
        "Which tag embeds another webpage inside your own page?",
        ["<video>", "<iframe>", "<audio>", "<source>"],
        1,
        "<iframe> embeds one page inside another. YouTube embed code uses it."
      ),
      q(
        "What is the poster attribute for?",
        [
          "The video's title",
          "The video file path",
          "An image shown before the video starts",
          "The video length",
        ],
        2,
        "A poster fills the space while the video loads, so the page does not sit empty."
      ),
    ],
    accent: ACCENT,
  },
  // ══ 7 · Tables and forms ══════════════════════════════════════════════
  {
    id: "html-7",
    number: 7,
    month: 2,
    phase: 1,
    kind: "HTML",
    title: "Tables",
    subtitle: "Information that belongs in rows and columns",
    intro:
      "A price list, a timetable, a league table — some information only makes sense in rows and columns. That is what a table is for, and this session is the whole of it: the four tags, the three that make a table readable, and the two attributes that let a cell cover more than its share.",
    learningGoal:
      "Build a table with <table>, <tr>, <th> and <td>, give it a <caption> and a <thead> and <tbody>, and merge cells with colspan and rowspan.",
    successCriteria: [
      "Use <th> for the header row and <td> for the data rows, and keep the cell count even",
      "Add a <caption> and split the table into <thead> and <tbody>",
      "Use colspan and rowspan to merge cells, and say what each one counts",
      "Explain in one sentence why a table is the wrong tool for laying out a page",
    ],
    commonMistake:
      "Reaching for a table to put things side by side. A table is read out row by row, so a decorative one makes the whole page read as a jumble.",
    heroImage: HTML_HERO,
    sections: [
      s(
        "The four table tags",
        "HTML tables let you arrange data into rows and columns. A table is made of cells inside rows.\n• <table> — the whole table\n• <tr> — one row, table row\n• <th> — a header cell, shown bold and centered\n• <td> — a data cell, table data\n\nEvery row is a <tr>, and every cell inside it is a <th> or a <td>. The number of cells has to match across every row, or the table will lean.\n\nA table is not a layout tool. It is for information that belongs in rows and columns — a price list, a timetable, a league table. A screen reader reads a table row by row, so a table used for decoration makes the page read as a jumble.",
        `<table>
  <tr>
    <th>Name</th>
    <th>Age</th>
    <th>Country</th>
  </tr>
  <tr>
    <td>Ahmed</td>
    <td>14</td>
    <td>Egypt</td>
  </tr>
  <tr>
    <td>Mariam</td>
    <td>13</td>
    <td>UK</td>
  </tr>
</table>`
      ),
      s(
        "A caption and a header section",
        "Three tags make a table much better, and all three go inside the <table>.\n\n• <caption> — a title for the table. It goes first, and it is read out before the data.\n• <thead> — the header row or rows.\n• <tbody> — the data rows.\n\nThe browser does not style these differently on its own. What you get is the correct structure, and it is what a screen reader and a search engine read. The colors come from CSS in month 3.",
        `<table>
  <caption>Our school team</caption>
  <thead>
    <tr>
      <th>Name</th>
      <th>Age</th>
      <th>Country</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Ahmed</td>
      <td>14</td>
      <td>Egypt</td>
    </tr>
  </tbody>
</table>`
      ),
      s(
        "When a cell covers more than one",
        "Some tables have a cell that spans two columns or two rows. Two attributes do that:\n\n• colspan — how many columns this cell covers\n• rowspan — how many rows this cell covers\n\nA timetable is the classic case: Monday's first lesson covers three periods, and Sport covers the whole of Tuesday's first two rows.\n\nUse them only when the data really does span. A table full of colspan=\"2\" is a layout table in disguise.",
        `<table border="1">
  <caption>Monday and Tuesday</caption>
  <tr>
    <th>Day</th>
    <th>Period 1</th>
    <th>Period 2</th>
    <th>Period 3</th>
  </tr>
  <tr>
    <td>Monday</td>
    <td colspan="3">Science fair all morning</td>
  </tr>
  <tr>
    <td rowspan="2">Tuesday</td>
    <td>Maths</td>
    <td>Sport</td>
    <td>Art</td>
  </tr>
  <tr>
    <td>Music</td>
    <td>History</td>
    <td>Music</td>
  </tr>
</table>`
      ),
      s(
        "Activity: the Sweet Bakery price list",
        "",
        undefined,
        undefined,
        SWEET_BAKERY_6,
        SWEET_BAKERY_7
      ),
    ],
    quiz: [
      q(
        "Which cell tag is used for the header row of a table?",
        ["<td>", "<tr>", "<table>", "<th>"],
        3,
        "<th> is a header cell and is shown bold and centered. <td> holds the data."
      ),
      q(
        "Where does the <caption> go?",
        [
          "As the first thing inside <table>, before any row",
          "After the last row, where a footnote would go",
          "Inside <thead>, next to the header cells",
          "In the <title> of the page",
        ],
        0,
        "A caption comes first, and it is read out before any of the data."
      ),
      q(
        "One cell has to cover two columns. Which attribute does that?",
        ["rowspan", "colspan", "cellspan", "width"],
        1,
        "colspan counts columns. rowspan counts rows, and it is the other one."
      ),
      q(
        "Which three tags give a table its caption, its header and its body?",
        [
          "<div>, <span>, <p>",
          "<tr>, <td>, <th>",
          "<caption>, <thead>, <tbody>",
          "<header>, <main>, <footer>",
        ],
        2,
        "caption, thead and tbody are the three. The browser styles none of them, but a screen reader reads all three."
      ),
    ],
    accent: ACCENT,
  },
  // ══ 8 · Forms ═══════════════════════════════════════════════════════════
  {
    id: "html-8",
    number: 8,
    month: 2,
    phase: 1,
    kind: "HTML",
    title: "Forms",
    subtitle: "Information a person types in",
    intro:
      "A table is information you read. A form is information you give. This session is the whole of forms: the fields, the labels that name them, every input type, and the attributes that make the browser check an answer before a server ever sees it.",
    learningGoal:
      "Build a form where every field has a label whose for matches its input, the right type for the data, and the browser's own validation doing the first round of checking.",
    successCriteria: [
      "Give every input a label whose for matches the input's id",
      "Choose the correct type for text, number, email, password, date, tel, radio, checkbox, select and textarea",
      "Group related radios in a <fieldset> with a <legend>, and give every radio its own id",
      "Make the browser refuse an empty field with required, and set minlength where the answer has a length",
      "Explain in one sentence what would break with no label at all",
    ],
    commonMistake:
      "Leaving the for attribute off the <label>. Without it, clicking the label does not focus the field, and a screen reader reads the field with no name at all.",
    heroImage: HTML_HERO,
    sections: [
      s(
        "What a form is",
        "A form is used to collect user input. It works like the paper form you fill out at school or at the doctor's office.\n\nIt collects information from people, like a name, an age, or answers to questions. On a website, forms let us type, click, and send that information.\n\nThe <form> element is the container. Inside it sit the questions — the fields — and a button to send the answers.",
        undefined,
        [
          "https://res.cloudinary.com/alhiemg0/image/upload/v1790752359/form-illustration.png",
          "https://res.cloudinary.com/alhiemg0/image/upload/v1790752359/label-input-diagram.png",
        ]
      ),
      s(
        "Labels and inputs",
        'A <label> is the text beside a field. The for attribute must match the id of the input, so clicking the label moves the cursor into the field.\n\nAn <input> is the field itself. It has no closing tag, and the type attribute decides what it accepts.\n\nThe name attribute is what the answers are sent under, so two fields cannot share a name unless you mean them to be one answer.\n\nHere is why the label is not optional. A screen reader announces a field as "edit, blank" if it has no label — the visitor is asked a question they cannot read. And clicking a label with no for does nothing at all.',
        `<form>
  <label for="fname">First name:</label>
  <input type="text" id="fname" name="fname"><br>

  <label for="lname">Last name:</label>
  <input type="text" id="lname" name="lname">
</form>`
      ),
      s(
        "Input types",
        'One input tag, many jobs. Pick the type that matches the data:\n• type="text" — words, such as a name\n• type="number" — numbers, such as an age\n• type="email" — an email address, with @ checked for you\n• type="password" — hidden dots, such as a password\n• type="date" — pick a date from a calendar\n• type="tel" — a phone number\n\nThe type is not decoration. It tells the visitor what to type, and on a phone it decides which keyboard opens. A number field on a phone gives you the number pad, and a date field gives you a calendar.',
        `<label for="fn">First name:</label>
<input type="text" id="fn" name="fn">

<label for="age">Age:</label>
<input type="number" id="age" name="age" min="6" max="18">

<label for="em">Email:</label>
<input type="email" id="em" name="em">

<label for="bd">Birth date:</label>
<input type="date" id="bd" name="bd">`
      ),
      s(
        "One answer, or many",
        "Two more types are for choosing, not typing.\n\nRadio buttons let the visitor pick exactly one option. They only work as a group: every radio in the group shares the same name, and the browser then allows just one to be picked.\n\nCheckboxes let the visitor pick any number, including none. They can share a name, but they stay independent.\n\nEvery choice needs its own label too — and on a radio or a checkbox, the label goes after the input. Each one needs its own id as well: a group of radios pointed at by one shared label is the single most common form mistake there is, because only the first radio can be reached by clicking the text.",
        `<label>Pick one sport:</label><br>
<input type="radio" id="s-football" name="sport" value="football">
<label for="s-football">Football</label><br>
<input type="radio" id="s-tennis" name="sport" value="tennis">
<label for="s-tennis">Tennis</label>

<label>Pick any you like:</label><br>
<input type="checkbox" id="c-bike" name="vehicle" value="bike">
<label for="c-bike">I have a bike</label><br>
<input type="checkbox" id="c-car" name="vehicle" value="car">
<label for="c-car">I have a car</label>`
      ),
      s(
        "The button element",
        'The <button> tag defines a clickable button. Inside a button you can put text and other tags like <i>, <b>, <strong> or <img>.\n\nThe type attribute decides what the button does:\n• type="submit" — sends the form\n• type="reset" — clears the fields back to how they started\n• type="button" — does nothing on its own until JavaScript is added',
        `<form>
  <label for="user">Username:</label>
  <input type="text" id="user" name="username">
  <br>
  <button type="submit">Sign up</button>
  <button type="reset">Clear</button>
</form>`
      ),
      s(
        "Long answers, fixed choices, and groups",
        "An <input> is always one line. When the answer is a paragraph, you need <textarea> — it has an opening tag, content, and a closing tag, and rows sets how tall it starts.\n\nWhen the answer must come from a list you already know, use <select> with one <option> per choice. Put a disabled prompt first, such as Choose your country, so an unanswered field never sends a real answer by accident. For four or five short choices, radio buttons are friendlier, because everything stays visible at once.\n\nA <fieldset> draws a box around a group of fields that belong together, and a <legend> sits in the border as the group's title. The box is only the visible part. The real value is the grouping: a screen reader announces the legend before it reads each field, so somebody filling in the form knows these questions are all about the same thing.",
        `<label for="msg">Your message:</label><br>
<textarea id="msg" name="msg" rows="10" cols="50"></textarea>

<label for="country">Country:</label><br>
<select id="country" name="country">
  <option value="">Choose your country</option>
  <option value="eg">Egypt</option>
  <option value="sa">Saudi Arabia</option>
  <option value="ae">UAE</option>
</select>

<fieldset>
  <legend>How should we contact you?</legend>

  <input type="radio" id="c-email" name="contact" value="email">
  <label for="c-email">Email</label><br>

  <input type="radio" id="c-phone" name="contact" value="phone">
  <label for="c-phone">Phone</label>
</fieldset>`
      ),
      s(
        "Making the browser check your work",
        "You do not have to wait for a server to notice a missing name. The browser can refuse it first.\n\n• required — the field cannot be left empty\n• minlength and maxlength — how many characters are allowed\n• min and max — the smallest and largest number\n• placeholder — grey example text that disappears when you type. A hint, never a label.\n\nTry it: leave a required field empty and press submit. The browser stops the form, focuses the field, and says so in the visitor's own language. That is the single most valuable attribute on this page, because it protects the visitor from a pointless round trip.\n\nAnd where do the answers go? The <form> tag has two attributes that decide it: action, the address they are sent to, and method, how they are sent. With no action, the form sends the answers back to the same page — which is why pressing submit on a form you built yourself seems to do nothing. There is no server listening. You will meet the other side of this in the back-end track.",
        `<label for="user">Username:</label>
<input type="text" id="user" name="username" required minlength="3" maxlength="20"
       placeholder="at least 3 characters">

<form action="/signup" method="post">
  <label for="em">Email:</label>
  <input type="email" id="em" name="email" required>
  <button type="submit">Sign up</button>
</form>`
      ),
      s(
        "Activity: the Sweet Bakery order form",
        "",
        undefined,
        undefined,
        SWEET_BAKERY_7,
        SWEET_BAKERY_8
      ),
    ],
    quiz: [
      q(
        "Which attribute makes the browser refuse to send the form while a field is empty?",
        ["validate", "pattern", "placeholder", "required"],
        3,
        "required stops the form before it is sent. placeholder is only grey hint text and never checks anything."
      ),
      q(
        "What connects a <label> to its <input>?",
        [
          "The name attribute on both",
          "The for attribute of the label and the id of the input",
          "The type attribute",
          "Nothing, they are linked by order",
        ],
        1,
        'for="fn" on the label must match id="fn" on the input.'
      ),
      q(
        'Two radio buttons both have name="sport". What happens?',
        [
          "The visitor can pick exactly one of them",
          "They can both be selected",
          "The second one disappears",
          "Nothing, name is ignored on radios",
        ],
        0,
        "Sharing the name is what makes them one group, and the browser then allows only one selection."
      ),
      q(
        "What is the right tag for a long multi-line answer?",
        ["<input>", "<select>", "<textarea>", "<p>"],
        2,
        "<textarea> is built for a paragraph. <input> is always one line."
      ),
    ],
    accent: ACCENT,
  },
]);

/** Every session in the track, in the order the student meets them. */
export const allHtmlLessons: HtmlLesson[] = htmlLessons;

/** How many sessions the track runs, used by the roadmap and the certificate. */
export const HTML_SESSION_COUNT = htmlLessons.length;

/** The ids, so progress saved before a track grew still resolves. */
export const HTML_LESSON_IDS: string[] = htmlLessons.map(lesson => lesson.id);

export { q, s };
