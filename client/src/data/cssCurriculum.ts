/**
 * The CSS track — eight sessions, months 3 and 4 of the Web course.
 *
 * Written to the same shared shape as every other course in the academy (see
 * `./curriculum`), and split out of `webCurriculum.ts` for the same reason the
 * HTML track is: the track is long enough to have a file of its own.
 *
 * ── One page, styled the whole way through ─────────────────────────────────
 *
 * The HTML track left the student with a finished Sweet Bakery page and no
 * style at all. Nothing here is a throwaway exercise. Every session adds one
 * layer of CSS to that one `index.html`, and the eight sessions together take
 * it from a bare list of headings to a page with a hero, a card row, a
 * two-column story, a styled order form and a footer.
 *
 *   index.html   the home page, with a `<style>` block in its head
 *
 * The chain is the spine of the track:
 *
 *   SWEET_BAKERY_9 … SWEET_BAKERY_16 are the whole of index.html as it stands
 *   at the end of each session. Session N opens its editor on the constant
 *   before it and closes on its own, so a student is never asked to start a
 *   page from nothing and nothing they wrote in month 1 is ever thrown away.
 *
 * Three rules hold everywhere in this file, and each one is checked by
 * `cssCurriculum.test.ts`:
 *
 *   1. Every session ends with something the student builds. The activity hands
 *      over an empty editor and a starter, and the solution is the finished
 *      file in a section of its own.
 *   2. The CSS lives inside a `<style>` tag in the head of the page it styles.
 *      Not a `<link>` to a file the preview cannot load, and never printed into
 *      the head as loose rules — a browser throws those away and the student
 *      watches an unstyled page and concludes the CSS is wrong.
 *   3. Every selector in every sample points at something the sample's own
 *      markup has. A rule that matches nothing is a rule the student cannot
 *      check, because the browser says nothing at all.
 *
 * Because the sessions run in order, a session only ever uses properties an
 * earlier session has already taught. Session 4 cannot ask for `gap`, and it
 * does not.
 */
import { q, s, type CurriculumLesson } from "./curriculum";

/** Every session in this track is a CSS session. */
export type CssLesson = CurriculumLesson<"CSS">;

/** Cover art, the same mark on every session of the track. */
const CSS_HERO = "https://res.cloudinary.com/alhiemg0/image/upload/css-hero.png";

const ACCENT = "from-violet-500/20 to-fuchsia-500/5";

/**
 * The name of the site the whole track styles. It is in every `<title>` and in
 * the comment at the top of every file, so a student who opens the page months
 * later knows exactly which project they are looking at.
 */
const SITE = "Sweet Bakery";

/**
 * The page, one file from start to finish.
 *
 * Each constant is the whole of `index.html` at the end of that session, so the
 * chain is visible in one place: `SWEET_BAKERY_10` is `SWEET_BAKERY_9` with the
 * type rules in, `SWEET_BAKERY_13` is that same page with a photograph behind
 * the hero, and so on to the footer.
 *
 * `SWEET_BAKERY_9_BARE` is the page with an empty `<style>` block — the state
 * the student arrives in from the HTML track, and what session 1 opens on.
 */
const SWEET_BAKERY_9_BARE = `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sweet Bakery</title>

    <style>

    </style>
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
            width="250"
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
                    <td>Croissant</td>
                    <td>Regular</td>
                    <td>&dollar;3</td>
                </tr>
            </tbody>
        </table>
    </div>

    <div id="media">
        <h2>Inside Our Bakery</h2>

 <video width="250" controls>
            <source src="https://www.pexels.com/download/video/7405923/" type="video/mp4">
        </video>

        <br><br>

        <audio controls>
            <source src="audio/bakery.mp3" type="audio/mpeg">
        </audio>

        <br><br>


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

            <button type="submit">Place Order</button>
        </form>
    </div>

</body>
</html>`;

const SWEET_BAKERY_9 = `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sweet Bakery</title>

    <style>
        body {
            background-color: lightgray;
        }

        h1 {
            color: brown;
        }

        h2 {
            color: darkred;
        }

        p {
            color: #333;
        }

        a {
            color: brown;
        }
    </style>
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
            width="250"
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
                    <td>Croissant</td>
                    <td>Regular</td>
                    <td>&dollar;3</td>
                </tr>
            </tbody>
        </table>
    </div>

    <div id="media">
        <h2>Inside Our Bakery</h2>

 <video width="250" controls>
            <source src="https://www.pexels.com/download/video/7405923/" type="video/mp4">
        </video>

        <br><br>

        <audio controls>
            <source src="audio/bakery.mp3" type="audio/mpeg">
        </audio>

        <br><br>


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

            <button type="submit">Place Order</button>
        </form>
    </div>

</body>
</html>`;

const SWEET_BAKERY_10 = `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sweet Bakery</title>

    <style>
        body {
            background-color: #fff8f0;
            color: #4b2e2e;
            font-family: Arial, sans-serif;
        }

        h1 {
            color: #7b3f00;
            text-align: center;
            font-size: 40px;
        }

        h2 {
            color: #9b4d20;
            text-align: center;
            font-size: 30px;
        }

        h3 {
            color: #7b3f00;
            font-size: 22px;
        }

        p {
            color: #5f4b4b;
            font-size: 18px;
            line-height: 1.6;
        }

        a {
            color: #7b3f00;
            text-decoration: none;
            font-size: 18px;
        }

        th {
            background-color: #9b4d20;
            color: white;
        }

        td {
            color: #4b2e2e;
        }

        button {
            background-color: #7b3f00;
            color: white;
        }
    </style>
</head>

<body>

    <header>
        <h1>Sweet Bakery &copy;</h1>

        <nav>
            <a href="#products">Products</a>
            <a href="#prices">Prices</a>
            <a href="#about">About Us</a>
            <a href="#contact">Order</a>
        </nav>
    </header>

    <main>

        <section class="hero">
            <h2>Welcome to Sweet Bakery</h2>

            <p>
                Fresh, delicious, and made with love &hearts;.
            </p>

             <img
            src="https://media.istockphoto.com/id/1479330210/photo/artisan-baker-applying-egg-wash-on-to-pastries-in-a-small-bakery.jpg?b=1&s=612x612&w=0&k=20&c=LoCpP2-n7LhsK1ScQoQXEi0Kp914S7Fwbwi7AD2Z9hU="
            alt="Sweet Bakery"
            width="250"
        >
        </section>

        <section id="products">
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
                <img src="https://images.pexels.com/photos/27969785/pexels-photo-27969785.jpeg" alt="Croissant" width="250">
                <p>Price: &dollar;3</p>
            </div>
        </section>

        <section id="prices">
            <h2>Our Price List</h2>

            <table border="1">
                <tr>
                    <th>Product</th>
                    <th>Size</th>
                    <th>Price</th>
                </tr>

                <tr>
                    <td>Chocolate Cake</td>
                    <td>Medium</td>
                    <td>&dollar;15</td>
                </tr>

                <tr>
                    <td>Croissant</td>
                    <td>Regular</td>
                    <td>&dollar;3</td>
                </tr>
            </table>
        </section>

        <section id="about">
            <h2>About Us</h2>

            <p>
                We prepare our products with fresh ingredients every day.
            </p>
        </section>

        <section id="contact">
            <h2>Place Your Order</h2>

            <form>
                <label for="name">Your Name:</label>
                <input type="text" id="name">

                <label for="email">Your Email:</label>
                <input type="email" id="email">

                <button type="submit">Place Order</button>
            </form>
        </section>

    </main>

</body>
</html>`;

const SWEET_BAKERY_11 = `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sweet Bakery</title>

    <style>
        * {
            box-sizing: border-box;
        }

        body {
            background-color: #fff8f0;
            color: #4b2e2e;
            font-family: Arial, sans-serif;
        }

        #header {
            background-color: #f3dfc1;
        }

        .navigation a {
            color: #7b3f00;
        }

        .navigation a:hover {
            color: #d2691e;
        }

        .hero {
            text-align: center;
        }

        .hero p {
            font-size: 20px;
        }

        #products {
            text-align: center;
        }

        .product {
            background-color: #ffffff;
        }

        .product h3 {
            color: #7b3f00;
        }

        .price {
            color: #d2691e;
            font-weight: bold;
        }

        #prices {
            text-align: center;
        }

        #prices table {
            margin: auto;
        }

        #prices th {
            background-color: #9b4d20;
            color: white;
        }

        #prices td {
            color: #4b2e2e;
        }

        #about p {
            text-align: center;
        }

        #contact {
            text-align: center;
        }

        #contact input {
            display: block;
        }

        #contact button {
            background-color: #7b3f00;
            color: white;
        }
    </style>
</head>

<body>

    <header id="header">
        <h1>Sweet Bakery &copy;</h1>

        <nav class="navigation">
            <a href="#products">Products</a>
            <a href="#prices">Prices</a>
            <a href="#about">About Us</a>
            <a href="#contact">Order</a>
        </nav>
    </header>

    <main>

        <section class="hero">
            <h2>Welcome to Sweet Bakery</h2>

            <p>
                Fresh, delicious, and made with love &hearts;.
            </p>

 <img
            src="https://media.istockphoto.com/id/1479330210/photo/artisan-baker-applying-egg-wash-on-to-pastries-in-a-small-bakery.jpg?b=1&s=612x612&w=0&k=20&c=LoCpP2-n7LhsK1ScQoQXEi0Kp914S7Fwbwi7AD2Z9hU="
            alt="Sweet Bakery"
            width="250"
        >
        </section>

        <section id="products">

            <h2>Our Products</h2>

            <div class="product">
                <h3>Chocolate Cake</h3>
                <img
                src="https://images.pexels.com/photos/11774178/pexels-photo-11774178.jpeg"
                alt="Chocolate Cake"
                width="250"
            >

                <p class="price">Price: &dollar;15</p>
            </div>

            <div class="product">
                <h3>Croissant</h3>
               <img
                src="https://images.pexels.com/photos/27969785/pexels-photo-27969785.jpeg"
                alt="Fresh Croissant"
                width="250"
            >
                <p class="price">Price: &dollar;3</p>
            </div>

        </section>

        <section id="prices">

            <h2>Our Price List</h2>

            <table>
                <tr>
                    <th>Product</th>
                    <th>Size</th>
                    <th>Price</th>
                </tr>

                <tr>
                    <td>Chocolate Cake</td>
                    <td>Medium</td>
                    <td>&dollar;15</td>
                </tr>

                <tr>
                    <td>Croissant</td>
                    <td>Regular</td>
                    <td>&dollar;3</td>
                </tr>
            </table>

        </section>

        <section id="about">

            <h2>About Us</h2>

            <p>
                We prepare our products with fresh ingredients every day.
            </p>

        </section>

        <section id="contact">

            <h2>Place Your Order</h2>

            <form>

                <label for="name">Your Name:</label>
                <input type="text" id="name">

                <label for="email">Your Email:</label>
                <input type="email" id="email">

                <button type="submit">Place Order</button>

            </form>

        </section>

    </main>

</body>
</html>`;

const SWEET_BAKERY_12 = `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sweet Bakery</title>

    <style>
        * {
            box-sizing: border-box;
        }

        body {
            background-color: #fff8f0;
            color: #4b2e2e;
            font-family: Arial, sans-serif;
            margin: 0;
        }

        #header {
            background-color: #f3dfc1;
            padding: 25px;
            margin-bottom: 30px;
        }

        h1 {
            margin: 0 0 20px;
        }

        .navigation a {
            margin-right: 20px;
        }

        section {
            margin: 30px;
            padding: 30px;
        }

        .hero {
            text-align: center;
            border: 2px solid #d9b38c;
            padding: 40px;
        }

        .hero img {
            margin-top: 20px;
        }

        .products-container {
            padding: 20px;
        }

        .product {
            width: 300px;
            padding: 20px;
            margin: 20px;
            border: 2px solid #d9b38c;
            background-color: white;
        }

        .product img {
            max-width: 100%;
        }

        .price {
            font-weight: bold;
            color: #d2691e;
        }

        table {
            border-collapse: collapse;
            margin: auto;
        }

        th,
        td {
            border: 1px solid #7b3f00;
            padding: 15px;
        }

        form {
            width: 400px;
            margin: auto;
            padding: 25px;
            border: 2px solid #d9b38c;
            background-color: white;
        }

        input {
            width: 100%;
            padding: 10px;
            margin: 8px 0 20px;
        }

        button {
            padding: 12px 25px;
            border: none;
            background-color: #7b3f00;
            color: white;
        }
    </style>
</head>

<body>

    <header id="header">

        <h1>Sweet Bakery &copy;</h1>

        <nav class="navigation">
            <a href="#products">Products</a>
            <a href="#prices">Prices</a>
            <a href="#about">About Us</a>
            <a href="#contact">Order</a>
        </nav>

    </header>

    <main>

        <section class="hero">

            <h2>Welcome to Sweet Bakery</h2>

            <p>
                Fresh, delicious, and made with love &hearts;.
            </p>

 <img
            src="https://media.istockphoto.com/id/1479330210/photo/artisan-baker-applying-egg-wash-on-to-pastries-in-a-small-bakery.jpg?b=1&s=612x612&w=0&k=20&c=LoCpP2-n7LhsK1ScQoQXEi0Kp914S7Fwbwi7AD2Z9hU="
            alt="Sweet Bakery"
            width="250"
        >

        </section>

        <section id="products">

            <h2>Our Products</h2>

            <div class="products-container">

                <div class="product">

                    <img
                        src="https://images.pexels.com/photos/11774178/pexels-photo-11774178.jpeg" 
                        alt="Chocolate Cake"
                        width="250"
                    >

                    <h3>Chocolate Cake</h3>

                    <p>
                        Delicious chocolate cake.
                    </p>

                    <p class="price">
                        &dollar;15
                    </p>

                </div>

                <div class="product">

                    <img
                        src="https://images.pexels.com/photos/27969785/pexels-photo-27969785.jpeg"
                        alt="Croissant"
                        width="250"
                    >

                    <h3>Croissant</h3>

                    <p>
                        Fresh and crispy croissant.
                    </p>

                    <p class="price">
                        &dollar;3
                    </p>

                </div>

            </div>

        </section>

        <section id="prices">

            <h2>Our Price List</h2>

            <table>

                <tr>
                    <th>Product</th>
                    <th>Size</th>
                    <th>Price</th>
                </tr>

                <tr>
                    <td>Chocolate Cake</td>
                    <td>Medium</td>
                    <td>&dollar;15</td>
                </tr>

                <tr>
                    <td>Croissant</td>
                    <td>Regular</td>
                    <td>&dollar;3</td>
                </tr>

            </table>

        </section>

        <section id="about">

            <h2>About Us</h2>

            <p>
                We prepare our products with fresh ingredients every day.
            </p>

        </section>

        <section id="contact">

            <h2>Place Your Order</h2>

            <form>

                <label for="name">Your Name:</label>
                <input type="text" id="name">

                <label for="email">Your Email:</label>
                <input type="email" id="email">

                <button type="submit">Place Order</button>

            </form>

        </section>

    </main>

</body>
</html>`;

const SWEET_BAKERY_13 = `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sweet Bakery</title>

    <style>
        * {
            box-sizing: border-box;
        }

        body {
            background-color: #fff8f0;
            color: #4b2e2e;
            font-family: Arial, sans-serif;
            margin: 0;
        }

        #header {
            background-color: #f3dfc1;
            padding: 25px;
        }

        .navigation a {
            color: #7b3f00;
            text-decoration: none;
            margin-right: 20px;
        }

        .navigation a:hover {
            color: #d2691e;
            text-decoration: underline;
        }

        .hero {
            min-height: 400px;
            background-image: url("https://media.istockphoto.com/id/1479330210/photo/artisan-baker-applying-egg-wash-on-to-pastries-in-a-small-bakery.jpg?b=1&s=612x612&w=0&k=20&c=LoCpP2-n7LhsK1ScQoQXEi0Kp914S7Fwbwi7AD2Z9hU=");
            background-size: 100% 100%;
            background-position: center;
            padding: 100px 30px;
            text-align: center;
        }

        .hero-content {
            background-color: rgba(255, 255, 255, 0.85);
            padding: 40px;
        }

        .hero-link {
            display: inline-block;
            padding: 12px 25px;
            background-color: #7b3f00;
            color: white;
            text-decoration: none;
        }

        .hero-link:hover {
            background-color: #d2691e;
        }

        section {
            margin: 30px;
            padding: 30px;
        }

        .products-container {
            padding: 20px;
        }

        .product {
            width: 300px;
            padding: 20px;
            margin: 20px;
            border: 2px solid #d9b38c;
            background-color: white;
        }

        .product img {
            width: 100%;
        }

        .product a {
            color: #7b3f00;
        }

        .product a:hover {
            color: #d2691e;
        }

        .price {
            color: #d2691e;
            font-weight: bold;
        }

        table {
            border-collapse: collapse;
            margin: auto;
        }

        th,
        td {
            border: 1px solid #7b3f00;
            padding: 15px;
        }

        form {
            width: 400px;
            margin: auto;
            padding: 25px;
            border: 2px solid #d9b38c;
            background-color: white;
        }

        input {
            width: 100%;
            padding: 10px;
            margin: 8px 0 20px;
        }

        button {
            padding: 12px 25px;
            border: none;
            background-color: #7b3f00;
            color: white;
        }
    </style>
</head>

<body>

    <header id="header">

        <h1>Sweet Bakery &copy;</h1>

        <nav class="navigation">
            <a href="#products">Products</a>
            <a href="#prices">Prices</a>
            <a href="#about">About Us</a>
            <a href="#contact">Order</a>
        </nav>

    </header>

    <main>

        <section class="hero">

            <div class="hero-content">

                <h2>Welcome to Sweet Bakery</h2>

                <p>
                    Fresh, delicious, and made with love &hearts;.
                </p>

                <a class="hero-link" href="#products">
                    Explore Our Products
                </a>

            </div>

        </section>

        <section id="products">

            <h2>Our Products</h2>

            <div class="products-container">

                <div class="product">

                    <img
                        src="https://images.pexels.com/photos/11774178/pexels-photo-11774178.jpeg" 
                        alt="Chocolate Cake"
                    >

                    <h3>Chocolate Cake</h3>

                    <p>Delicious chocolate cake.</p>

                    <p class="price">&dollar;15</p>

                    <a href="#contact">Order Now</a>

                </div>

                <div class="product">

                    <img
                        src="https://images.pexels.com/photos/27969785/pexels-photo-27969785.jpeg"
                        alt="Croissant"
                    >

                    <h3>Croissant</h3>

                    <p>Fresh and crispy croissant.</p>

                    <p class="price">&dollar;3</p>

                    <a href="#contact">Order Now</a>

                </div>

            </div>

        </section>

        <section id="prices">

            <h2>Our Price List</h2>

            <table>

                <tr>
                    <th>Product</th>
                    <th>Size</th>
                    <th>Price</th>
                </tr>

                <tr>
                    <td>Chocolate Cake</td>
                    <td>Medium</td>
                    <td>&dollar;15</td>
                </tr>

                <tr>
                    <td>Croissant</td>
                    <td>Regular</td>
                    <td>&dollar;3</td>
                </tr>

            </table>

        </section>

        <section id="about">

            <h2>About Us</h2>

            <p>
                We prepare our products with fresh ingredients every day.
            </p>

        </section>

        <section id="contact">

            <h2>Place Your Order</h2>

            <form>

                <label for="name">Your Name:</label>
                <input type="text" id="name">

                <label for="email">Your Email:</label>
                <input type="email" id="email">

                <button type="submit">Place Order</button>

            </form>

        </section>

    </main>

</body>
</html>`;

const SWEET_BAKERY_14 = `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sweet Bakery</title>

    <style>
        * {
            box-sizing: border-box;
        }

        body {
            background-color: #fff8f0;
            color: #4b2e2e;
            font-family: Arial, sans-serif;
            margin: 0;
        }

        #header {
            background-color: #f3dfc1;
            padding: 25px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        #header h1 {
            margin: 0;
        }

        .navigation {
            display: flex;
            gap: 20px;
        }

        .navigation a {
            color: #7b3f00;
            text-decoration: none;
        }

        .navigation a:hover {
            color: #d2691e;
        }

        .hero {
            min-height: 400px;
            background-image: url("https://media.istockphoto.com/id/1479330210/photo/artisan-baker-applying-egg-wash-on-to-pastries-in-a-small-bakery.jpg?b=1&s=612x612&w=0&k=20&c=LoCpP2-n7LhsK1ScQoQXEi0Kp914S7Fwbwi7AD2Z9hU=");
            background-size: 100% 100%;
            background-position: center;
            padding: 100px 30px;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .hero-content {
            background-color: rgba(255, 255, 255, 0.85);
            padding: 40px;
            text-align: center;
        }

        .hero-link {
            display: inline-block;
            padding: 12px 25px;
            background-color: #7b3f00;
            color: white;
            text-decoration: none;
        }

        .products-container {
            display: flex;
            justify-content: center;
            gap: 25px;
            flex-wrap: wrap;
        }

        .product {
            width: 300px;
            padding: 20px;
            border: 2px solid #d9b38c;
            background-color: white;
        }

        .product img {
            width: 100%;
        }

        .product a {
            color: #7b3f00;
        }

        .price {
            color: #d2691e;
            font-weight: bold;
        }

        table {
            border-collapse: collapse;
            margin: auto;
        }

        th,
        td {
            border: 1px solid #7b3f00;
            padding: 15px;
        }

        .about-container {
            display: flex;
            align-items: center;
            gap: 40px;
            max-width: 900px;
            margin: auto;
        }

        .about-container img {
            width: 400px;
        }

        form {
            width: 400px;
            margin: auto;
            padding: 25px;
            border: 2px solid #d9b38c;
            background-color: white;
        }

        input {
            display: block;
            width: 100%;
            padding: 10px;
            margin: 8px 0 20px;
        }

        button {
            padding: 12px 25px;
            border: none;
            background-color: #7b3f00;
            color: white;
        }
    </style>
</head>

<body>

    <header id="header">

        <h1>Sweet Bakery &copy;</h1>

        <nav class="navigation">
            <a href="#products">Products</a>
            <a href="#prices">Prices</a>
            <a href="#about">About Us</a>
            <a href="#contact">Order</a>
        </nav>

    </header>

    <main>

        <section class="hero">

            <div class="hero-content">

                <h2>Welcome to Sweet Bakery</h2>

                <p>
                    Fresh, delicious, and made with love &hearts;.
                </p>

                <a class="hero-link" href="#products">
                    Explore Our Products
                </a>

            </div>

        </section>

        <section id="products">

            <h2>Our Products</h2>

            <div class="products-container">

                <div class="product">

                    <img
                        src="https://images.pexels.com/photos/11774178/pexels-photo-11774178.jpeg" 
                        alt="Chocolate Cake"
                    >

                    <h3>Chocolate Cake</h3>

                    <p>Delicious chocolate cake.</p>

                    <p class="price">&dollar;15</p>

                    <a href="#contact">Order Now</a>

                </div>

                <div class="product">

                    <img
                        src="https://images.pexels.com/photos/27969785/pexels-photo-27969785.jpeg"
                        alt="Croissant"
                    >

                    <h3>Croissant</h3>

                    <p>Fresh and crispy croissant.</p>

                    <p class="price">&dollar;3</p>

                    <a href="#contact">Order Now</a>

                </div>

                <div class="product">

                    <img
                        src="https://images.pexels.com/photos/8478048/pexels-photo-8478048.jpeg"
                        alt="Cookies"
                    >

                    <h3>Cookies</h3>

                    <p>Fresh chocolate cookies.</p>

                    <p class="price">&dollar;10</p>

                    <a href="#contact">Order Now</a>

                </div>

            </div>

        </section>

        <section id="prices">

            <h2>Our Price List</h2>

            <table>

                <tr>
                    <th>Product</th>
                    <th>Size</th>
                    <th>Price</th>
                </tr>

                <tr>
                    <td>Chocolate Cake</td>
                    <td>Medium</td>
                    <td>&dollar;15</td>
                </tr>

                <tr>
                    <td>Croissant</td>
                    <td>Regular</td>
                    <td>&dollar;3</td>
                </tr>

            </table>

        </section>

        <section id="about">

            <h2>About Us</h2>

            <div class="about-container">

                <img
                    src="https://media.istockphoto.com/id/1479330210/photo/artisan-baker-applying-egg-wash-on-to-pastries-in-a-small-bakery.jpg?b=1&s=612x612&w=0&k=20&c=LoCpP2-n7LhsK1ScQoQXEi0Kp914S7Fwbwi7AD2Z9hU="
                    alt="Our Bakery"
                >

                <div>
                    <p>
                        We prepare our products with fresh ingredients every day.
                    </p>

                    <p>
                        Our bakery is built around quality, freshness and love.
                    </p>
                </div>

            </div>

        </section>

        <section id="contact">

            <h2>Place Your Order</h2>

            <form>

                <label for="name">Your Name:</label>
                <input type="text" id="name">

                <label for="email">Your Email:</label>
                <input type="email" id="email">

                <button type="submit">Place Order</button>

            </form>

        </section>

    </main>

</body>
</html>`;

const SWEET_BAKERY_15 = `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sweet Bakery</title>

    <style>
        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            font-family: Arial, sans-serif;
            background-color: #fff8f0;
            color: #4b2e2e;
        }

        .header {
            height: 80px;
            padding: 0 8%;
            background-color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #7b3f00;
        }

        .navigation {
            display: flex;
            gap: 25px;
        }

        .navigation a {
            color: #4b2e2e;
            text-decoration: none;
        }

        .navigation a:hover {
            color: #d2691e;
        }

        .hero {
            min-height: 550px;
            background-image: url("https://media.istockphoto.com/id/1479330210/photo/artisan-baker-applying-egg-wash-on-to-pastries-in-a-small-bakery.jpg?b=1&s=612x612&w=0&k=20&c=LoCpP2-n7LhsK1ScQoQXEi0Kp914S7Fwbwi7AD2Z9hU=");
            background-size: 100% 100%;
            background-position: center;
            display: flex;
            justify-content: center;
            align-items: center;
            text-align: center;
        }

        .hero-content {
            background-color: rgba(255, 255, 255, 0.9);
            padding: 50px;
        }

        .small-title {
            color: #d2691e;
            letter-spacing: 3px;
            font-size: 14px;
        }

        .hero h1 {
            font-size: 60px;
            color: #7b3f00;
            margin: 15px 0;
        }

        .hero-button {
            display: inline-block;
            margin-top: 20px;
            padding: 15px 30px;
            background-color: #7b3f00;
            color: white;
            text-decoration: none;
        }

        #products,
        #prices {
            padding: 80px 8%;
        }

        .section-title {
            text-align: center;
            margin-bottom: 40px;
        }

        .section-title p {
            color: #d2691e;
        }

        .section-title h2 {
            font-size: 36px;
            color: #7b3f00;
        }

        .products-container {
            display: flex;
            justify-content: center;
            gap: 30px;
            flex-wrap: wrap;
        }

        .product {
            width: 300px;
            background-color: white;
            border: 1px solid #ead8c5;
        }

        .product img {
            width: 100%;
            display: block;
        }

        .product-content {
            padding: 25px;
        }

        .product-content h3 {
            color: #7b3f00;
        }

        .price {
            color: #d2691e;
            font-weight: bold;
        }

        #prices {
            text-align: center;
        }

        table {
            border-collapse: collapse;
            margin: auto;
        }

        th,
        td {
            border: 1px solid #7b3f00;
            padding: 15px 30px;
        }

        th {
            background-color: #7b3f00;
            color: white;
        }
    </style>
</head>

<body>

    <header class="header">

        <div class="logo">
            Sweet Bakery
        </div>

        <nav class="navigation">
            <a href="#home">Home</a>
            <a href="#products">Products</a>
            <a href="#prices">Prices</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
        </nav>

    </header>

    <main>

        <section id="home" class="hero">

            <div class="hero-content">

                <p class="small-title">
                    WELCOME TO
                </p>

                <h1>
                    Sweet Bakery
                </h1>

                <p>
                    Freshly baked every day with love &hearts;.
                </p>

                <a class="hero-button" href="#products">
                    Explore Our Bakery
                </a>

            </div>

        </section>

        <section id="products">

            <div class="section-title">
                <p>WHAT WE MAKE</p>
                <h2>Our Special Products</h2>
            </div>

            <div class="products-container">

                <div class="product">

                    <img
                        src="https://images.pexels.com/photos/11774178/pexels-photo-11774178.jpeg" 
                        alt="Chocolate Cake"
                    >

                    <div class="product-content">

                        <h3>Chocolate Cake</h3>

                        <p>
                            A delicious cake made with rich chocolate.
                        </p>

                        <span class="price">
                            &dollar;15
                        </span>

                    </div>

                </div>

                <div class="product">

                    <img
                        src="https://images.pexels.com/photos/27969785/pexels-photo-27969785.jpeg"
                        alt="Croissant"
                    >

                    <div class="product-content">

                        <h3>Fresh Croissant</h3>

                        <p>
                            Crispy outside and soft inside.
                        </p>

                        <span class="price">
                            &dollar;3
                        </span>

                    </div>

                </div>

                <div class="product">

                    <img
                        src="https://images.pexels.com/photos/8478048/pexels-photo-8478048.jpeg"
                        alt="Cookies"
                    >

                    <div class="product-content">

                        <h3>Chocolate Cookies</h3>

                        <p>
                            Fresh cookies filled with chocolate.
                        </p>

                        <span class="price">
                            &dollar;10
                        </span>

                    </div>

                </div>

            </div>

        </section>

        <section id="prices">

            <h2>Our Price List</h2>

            <table>

                <tr>
                    <th>Product</th>
                    <th>Size</th>
                    <th>Price</th>
                </tr>

                <tr>
                    <td>Chocolate Cake</td>
                    <td>Medium</td>
                    <td>&dollar;15</td>
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

            </table>

        </section>

    </main>

</body>
</html>`;

const SWEET_BAKERY_16 = `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sweet Bakery</title>

    <style>
        * {
            box-sizing: border-box;
        }

        html {
            scroll-behavior: smooth;
        }

        body {
            margin: 0;
            font-family: Arial, sans-serif;
            background-color: #fff8f0;
            color: #4b2e2e;
        }

        .header {
            min-height: 80px;
            padding: 0 8%;
            background-color: white;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #7b3f00;
        }

        .navigation {
            display: flex;
            gap: 25px;
        }

        .navigation a {
            color: #4b2e2e;
            text-decoration: none;
        }

        .navigation a:hover {
            color: #d2691e;
        }

        .hero {
            min-height: 600px;
            background-image: url("https://media.istockphoto.com/id/1479330210/photo/artisan-baker-applying-egg-wash-on-to-pastries-in-a-small-bakery.jpg?b=1&s=612x612&w=0&k=20&c=LoCpP2-n7LhsK1ScQoQXEi0Kp914S7Fwbwi7AD2Z9hU=");
            background-size: 100% 100%;
            background-position: center;
            display: flex;
            justify-content: center;
            align-items: center;
            text-align: center;
        }

        .hero-content {
            background-color: rgba(255, 255, 255, 0.9);
            padding: 60px;
            max-width: 650px;
        }

        .small-title {
            color: #d2691e;
            letter-spacing: 3px;
            font-size: 14px;
            font-weight: bold;
        }

        .hero h1 {
            font-size: 60px;
            color: #7b3f00;
            margin: 15px 0;
        }

        .hero-button {
            display: inline-block;
            margin-top: 20px;
            padding: 15px 30px;
            background-color: #7b3f00;
            color: white;
            text-decoration: none;
        }

        .hero-button:hover {
            background-color: #d2691e;
        }

        #products {
            padding: 80px 8%;
        }

        .section-title {
            text-align: center;
            margin-bottom: 50px;
        }

        .section-title p {
            color: #d2691e;
            letter-spacing: 3px;
        }

        .section-title h2 {
            font-size: 38px;
            color: #7b3f00;
        }

        .products-container {
            display: flex;
            justify-content: center;
            gap: 30px;
            flex-wrap: wrap;
        }

        .product {
            width: 300px;
            background-color: white;
            border: 1px solid #ead8c5;
        }

        .product img {
            width: 100%;
            display: block;
        }

        .product-content {
            padding: 25px;
        }

        .product-content h3 {
            color: #7b3f00;
        }

        .price {
            display: block;
            color: #d2691e;
            font-weight: bold;
            margin-bottom: 20px;
        }

        .order-link {
            color: #7b3f00;
            text-decoration: none;
        }

        .order-link:hover {
            color: #d2691e;
        }

        .about {
            padding: 80px 8%;
            background-color: #f3dfc1;
            display: flex;
            align-items: center;
            gap: 60px;
        }

        .about-image,
        .about-content {
            width: 50%;
        }

        .about-image img {
            width: 100%;
            display: block;
        }

        .about-content h2 {
            color: #7b3f00;
            font-size: 40px;
        }

        .about-content p {
            line-height: 1.8;
        }

        .contact {
            padding: 80px 8%;
        }

        form {
            max-width: 600px;
            margin: auto;
            background-color: white;
            padding: 40px;
            border: 1px solid #ead8c5;
        }

        label {
            display: block;
            margin-bottom: 8px;
            color: #7b3f00;
            font-weight: bold;
        }

        input,
        select,
        textarea {
            width: 100%;
            padding: 12px;
            margin-bottom: 20px;
            border: 1px solid #d9b38c;
            font-family: inherit;
        }

        textarea {
            resize: vertical;
        }

        button {
            width: 100%;
            padding: 14px;
            border: none;
            background-color: #7b3f00;
            color: white;
            cursor: pointer;
        }

        button:hover {
            background-color: #d2691e;
        }

        footer {
            padding: 40px 8%;
            background-color: #7b3f00;
            color: white;
            text-align: center;
        }

        footer h3 {
            margin-top: 0;
        }
    </style>
</head>

<body>

    <header class="header">

        <div class="logo">
            Sweet Bakery
        </div>

        <nav class="navigation">
            <a href="#home">Home</a>
            <a href="#products">Products</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
        </nav>

    </header>

    <main>

        <section id="home" class="hero">

            <div class="hero-content">

                <p class="small-title">
                    WELCOME TO
                </p>

                <h1>Sweet Bakery</h1>

                <p>
                    Freshly baked every day with love &hearts;.
                </p>

                <a class="hero-button" href="#products">
                    Explore Our Bakery
                </a>

            </div>

        </section>

        <section id="products">

            <div class="section-title">
                <p>WHAT WE MAKE</p>
                <h2>Our Special Products</h2>
            </div>

            <div class="products-container">

                <div class="product">

                    <img
                        src="https://images.pexels.com/photos/11774178/pexels-photo-11774178.jpeg" 
                        alt="Chocolate Cake"
                    >

                    <div class="product-content">

                        <h3>Chocolate Cake</h3>

                        <p>
                            A delicious cake made with rich chocolate.
                        </p>

                        <span class="price">&dollar;15</span>

                        <a class="order-link" href="#contact">
                            Order Now
                        </a>

                    </div>

                </div>

                <div class="product">

                    <img
                        src="https://images.pexels.com/photos/27969785/pexels-photo-27969785.jpeg"
                        alt="Croissant"
                    >

                    <div class="product-content">

                        <h3>Fresh Croissant</h3>

                        <p>
                            Crispy outside and soft inside.
                        </p>

                        <span class="price">&dollar;3</span>

                        <a class="order-link" href="#contact">
                            Order Now
                        </a>

                    </div>

                </div>

                <div class="product">

                    <img
                        src="https://images.pexels.com/photos/8478048/pexels-photo-8478048.jpeg"
                        alt="Cookies"
                    >

                    <div class="product-content">

                        <h3>Chocolate Cookies</h3>

                        <p>
                            Fresh cookies filled with chocolate.
                        </p>

                        <span class="price">&dollar;10</span>

                        <a class="order-link" href="#contact">
                            Order Now
                        </a>

                    </div>

                </div>

            </div>

        </section>

        <section id="about" class="about">

            <div class="about-image">
                <img
                    src="https://media.istockphoto.com/id/1479330210/photo/artisan-baker-applying-egg-wash-on-to-pastries-in-a-small-bakery.jpg?b=1&s=612x612&w=0&k=20&c=LoCpP2-n7LhsK1ScQoQXEi0Kp914S7Fwbwi7AD2Z9hU="
                    alt="Inside Sweet Bakery"
                >
            </div>

            <div class="about-content">

                <p class="small-title">
                    ABOUT US
                </p>

                <h2>
                    Baked With Love
                </h2>

                <p>
                    At Sweet Bakery, we believe that great food starts
                    with great ingredients.
                </p>

                <p>
                    Every product is freshly prepared to bring you
                    the best taste and quality.
                </p>

                <a class="hero-button" href="#contact">
                    Contact Us
                </a>

            </div>

        </section>

        <section id="contact" class="contact">

            <div class="section-title">

                <p>GET IN TOUCH</p>

                <h2>Place Your Order</h2>

            </div>

            <form>

                <label for="name">Your Name</label>

                <input
                    type="text"
                    id="name"
                    placeholder="Enter your name"
                >

                <label for="email">Your Email</label>

                <input
                    type="email"
                    id="email"
                    placeholder="Enter your email"
                >

                <label for="product">Choose Product</label>

                <select id="product">

                    <option>Chocolate Cake</option>
                    <option>Fresh Croissant</option>
                    <option>Chocolate Cookies</option>

                </select>

                <label for="message">Your Message</label>

                <textarea
                    id="message"
                    rows="5"
                    placeholder="Write your message">
                </textarea>

                <button type="submit">
                    Send Order
                </button>

            </form>

        </section>

    </main>

    <footer>

        <h3>Sweet Bakery</h3>

        <p>
            Freshly baked with love &hearts;.
        </p>

        <p>
            &copy; 2026 Sweet Bakery. All Rights Reserved.
        </p>

    </footer>

</body>
</html>`;

export const cssLessons: CssLesson[] = [
  // ══ 1 · Your first stylesheet ═════════════════════════════════════════
  {
    id: "css-1",
    number: 9,
    month: 3,
    phase: 2,
    kind: "CSS",
    title: "Your First Stylesheet",
    subtitle: "What CSS is, and the five rules that colour the bakery",
    intro:
      "The Sweet Bakery page is finished in HTML and has no style at all: black text on white, every heading the same size, the links underlined in blue. Today you open a <style> tag in its head and write five rules. Same page, different page.",
    learningGoal:
      "Say what CSS is, read a rule as selector, property and value, and write the rules that put the bakery's colours on the page.",
    successCriteria: [
      "Name the three parts of a rule and point at each one in your own file",
      "Open a <style> tag in the head and write a rule inside it",
      "Set background-color and color on the body of the page",
      "Change one colour and reload, and only that colour changes",
    ],
    commonMistake:
      "Writing the rules straight into the head with no <style> tag around them. The browser reads them as text, throws them away, and the page comes back exactly as it was.",
    heroImage: CSS_HERO,
    sections: [
      s(
        "What CSS is for",
        "HTML decides what a thing is. CSS decides what it looks like. A separate language for a separate job — and once the two are apart you can change the whole look of a page without touching one tag of its structure.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>What CSS is for</title>
    <style>
        /* Same markup, two different looks. */
        h1 {
            color: #7b3f00;
        }
    </style>
</head>
<body>
    <h1>Sweet Bakery</h1>
</body>
</html>`
      ),
      s(
        "The shape of a rule",
        "A rule is a selector, a property and a value, in that order, and it always ends with a semicolon.\n\nThe selector says which elements. The property says what you are about to change. The value says what to change it to.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>The shape of a rule</title>
    <style>
        body {
            /* property: value; */
            background-color: lightgray;
        }
    </style>
</head>
<body>
    <h1>Sweet Bakery</h1>
</body>
</html>`
      ),
      s(
        "Where the rules live",
        "For this course every rule goes inside one <style> tag in the head of index.html, which you write empty on your first day and never empty again.\n\nPut it after the <title>. Everything in the head is invisible on the page, which is exactly what a stylesheet is.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sweet Bakery</title>
    <style>

    </style>
</head>
<body>
    <h1>Sweet Bakery</h1>
</body>
</html>`
      ),
      s(
        "Targeting a tag",
        "A bare tag name is a selector that points at every element of that name on the page. One rule, then: every h1 on the page, wherever it is.\n\nThe colours below are the bakery's: a cream page, brown headings, dark red section titles.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Targeting a tag</title>
    <style>
        body {
            background-color: lightgray;
        }

        h1 {
            color: brown;
        }

        h2 {
            color: darkred;
        }

        p {
            color: #333;
        }

        a {
            color: brown;
        }
    </style>
</head>
<body>
    <h1>Sweet Bakery</h1>
    <h2>Our Products</h2>
    <p>Fresh, delicious, and made with love.</p>
    <a href="#products">Products</a>
</body>
</html>`
      ),
      s(
        "Colour names and hex codes",
        "A colour can be a word the browser already knows — brown, darkred, white — or a hex code, which is the exact shade written as six characters.\n\nEvery hex code starts with a #, then three pairs: red, green, blue. #333 is near-black, #7b3f00 is the bakery's brown, #fff8f0 is its cream. When a named colour is not quite right, the hex code is.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Colour names and hex codes</title>
    <style>
        body {
            background-color: #fff8f0;
        }

        h1 {
            color: #7b3f00;
        }

        h2 {
            color: #9b4d20;
        }

        a {
            color: #d2691e;
        }
    </style>
</head>
<body>
    <h1>Sweet Bakery</h1>
    <h2>Our Price List</h2>
    <a href="#prices">Prices</a>
</body>
</html>`
      ),
      s(
        "The order rules are read in",
        "Two rules that point at the same element are not a choice — the last one written wins. Read top to bottom and the bottom line is the one you see.\n\nSo the order of your file is a real decision, not decoration. Put the general rule first and the specific one after it.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>The order rules are read in</title>
    <style>
        /* Both point at the h1. This one is written first... */
        h1 {
            color: brown;
        }

        /* ...so this is the one the visitor sees. */
        h1 {
            color: #7b3f00;
        }
    </style>
</head>
<body>
    <h1>Sweet Bakery</h1>
</body>
</html>`
      ),
      s(
        "Try yourself: the bakery gets its colours",
        "Five rules. The page you are given has an empty style tag and everything else already finished.",
        undefined,
        undefined,
        SWEET_BAKERY_9_BARE,
        SWEET_BAKERY_9
      ),
    ],
    challenge:
      "Take the page home and go one layer further, in the style tag of index.html.\n1. Set the background of the whole page to the bakery cream, #fff8f0.\n2. Give h1 a size of its own — 40px is a good start.\n3. Make the links sit 20px apart with margin-right, so they are not one unreadable run of blue.\n4. Change one colour, reload, and say out loud which rule the browser used. Then change it back.",
    quiz: [
      q(
        "What are the three parts of a CSS rule?",
        [
          "Selector, property and value",
          "Tag, attribute and text",
          "Class, id and name",
          "Selector, element and tag",
        ],
        0,
        "The selector says which elements, the property says what changes, the value says what it changes to."
      ),
      q(
        "Where do the rules in this course live?",
        [
          "In a style attribute on each element",
          "In one <style> tag in the head of index.html",
          "In a separate file called style.css",
          "Anywhere in the body",
        ],
        1,
        "One <style> tag in the head. Rules printed loose in the head are thrown away by the browser."
      ),
      q(
        "Two rules point at the same h1. Which colour shows?",
        [
          "The one in the first rule",
          "The browser picks one at random",
          "The one in the last rule written",
          "Neither — the page falls back to black",
        ],
        2,
        "The last rule written wins, so the order of the file is a decision."
      ),
      q(
        "What does a hex code like #7b3f00 describe?",
        [
          "The name of the file the colour came from",
          "A font to draw the text with",
          "The size of the text",
          "An exact shade, as three pairs of red, green and blue",
        ],
        3,
        "#7b3f00 is one exact shade. Named colours are only shortcuts to codes like it."
      ),
    ],
    accent: ACCENT,
  },
  // ══ 2 · Text and colour ════════════════════════════════════════════════
  {
    id: "css-2",
    number: 10,
    month: 3,
    phase: 2,
    kind: "CSS",
    title: "Text and Colour",
    subtitle: "Sizes, spacing, line height, and the page's whole colour scheme",
    intro:
      "Five rules is enough to prove CSS works. Ten is enough to make a page look designed. This session is the type scale of Sweet Bakery: how big each heading is, how far apart the lines sit, what colour the words are, and what happens when a visitor puts the pointer on a link.",
    learningGoal:
      "Set font-family, font-size, line-height and text-align on a page, and build a colour scheme from a small set of hex codes reused across every rule.",
    successCriteria: [
      "Set the font of the whole page with one font-family rule on the body",
      "Give h1, h2 and h3 three different sizes, and say which is which",
      "Use line-height to make a paragraph easier to read, and name a number you tried",
      "Remove the underline from a link and put it back on hover",
    ],
    commonMistake:
      "Setting font-size on the body and then again on every heading, so the sizes drift. Set the size you want on the page once, and let the headings step down from it.",
    heroImage: CSS_HERO,
    sections: [
      s(
        "The page gets a font",
        "One rule on the body decides the font for everything inside it, because every element inherits from the body unless you tell it otherwise.\n\nArial is the first name, sans-serif is the fallback for anyone whose machine has no Arial. The comma matters: it is the order of preference.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>The page gets a font</title>
    <style>
        body {
            font-family: Arial, sans-serif;
        }
    </style>
</head>
<body>
    <h1>Sweet Bakery</h1>
    <p>Fresh, delicious, and made with love.</p>
</body>
</html>`
      ),
      s(
        "A size for each heading",
        "font-size takes a number and a unit. px is pixels — the unit you use all course.\n\nThe step-down is the whole point: h1 the biggest thing on the page, h2 clearly smaller, h3 smaller again. Headings that are all the same size are not a heading structure.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>A size for each heading</title>
    <style>
        body {
            font-family: Arial, sans-serif;
        }

        h1 {
            font-size: 40px;
        }

        h2 {
            font-size: 30px;
        }

        h3 {
            font-size: 22px;
        }
    </style>
</head>
<body>
    <h1>Sweet Bakery</h1>
    <h2>Our Products</h2>
    <h3>Chocolate Cake</h3>
</body>
</html>`
      ),
      s(
        "line-height",
        "The gap between one line and the next. Without it, lines of text sit almost on top of each other and the page reads as a wall.\n\nA number is enough: line-height: 1.6 means each line is one and a half times as tall as the text itself. Try 1.2, then 1.6, then 2 and keep the one you like.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>line-height</title>
    <style>
        p {
            font-size: 18px;
            line-height: 1.6;
        }
    </style>
</head>
<body>
    <p>Fresh, delicious, and made with love. We prepare our products with fresh ingredients every day, and we bake them in small batches so nothing sits on the shelf.</p>
</body>
</html>`
      ),
      s(
        "text-align",
        "Where the words sit inside their box: left, center, or right.\n\nThe bakery centres its title and every section heading, and leaves the paragraphs alone. Centred body text is hard to read, so reserve it for short headings.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>text-align</title>
    <style>
        h1 {
            text-align: center;
        }

        h2 {
            text-align: center;
        }

        p {
            text-align: left;
        }
    </style>
</head>
<body>
    <h1>Sweet Bakery</h1>
    <h2>Our Price List</h2>
    <p>Fresh, delicious, and made with love.</p>
</body>
</html>`
      ),
      s(
        "Links: text-decoration",
        "The browser underlines every link by default. A page designed as a page takes the underline off and puts a colour on instead.\n\ntext-decoration: none removes it. And the underline is worth keeping for one state: the one where the pointer is on the link, which is the next section.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Links: text-decoration</title>
    <style>
        a {
            color: #7b3f00;
            text-decoration: none;
            font-size: 18px;
        }
    </style>
</head>
<body>
    <nav>
        <a href="#products">Products</a>
        <a href="#prices">Prices</a>
        <a href="#contact">Order</a>
    </nav>
</body>
</html>`
      ),
      s(
        ":hover, and a button that looks like a button",
        "A pseudo-class is a state rather than an element. :hover means the pointer is on it.\n\nTwo lines with a colon between them and nothing else: the button when it is at rest, and the button with the pointer on it. Every link on the bakery gets both, and that pair is the cheapest polish there is.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>:hover, and a button that looks like a button</title>
    <style>
        a {
            color: #7b3f00;
            text-decoration: none;
        }

        a:hover {
            color: #d2691e;
            text-decoration: underline;
        }

        button {
            background-color: #7b3f00;
            color: white;
        }

        button:hover {
            background-color: #d2691e;
        }
    </style>
</head>
<body>
    <nav>
        <a href="#products">Products</a>
        <a href="#contact">Order</a>
    </nav>
    <button type="button">Place Order</button>
</body>
</html>`
      ),
      s(
        "One palette, used everywhere",
        "The bakery has six colours and no more: a cream page, a dark brown for headings, a lighter brown for section titles, an orange for prices and links, a pale tan for the header band, and white.\n\nWrite them once at the top of your style tag as you choose them, then reuse the same code every time you need that shade. Change the page's accent by editing one line.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>One palette, used everywhere</title>
    <style>
        body {
            background-color: #fff8f0;
            color: #4b2e2e;
        }

        header {
            background-color: #f3dfc1;
        }

        h1 {
            color: #7b3f00;
        }

        h2 {
            color: #9b4d20;
        }

        .price {
            color: #d2691e;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <header><h1>Sweet Bakery</h1></header>
    <h2>Our Products</h2>
    <p class="price">Price: &dollar;15</p>
</body>
</html>`
      ),
      s(
        "Try yourself: give the bakery a type scale",
        "Ten rules on the page you finished last session: the page gets a cream background and a brown text colour, every heading gets its own size, the paragraphs get a line height, and the links get a colour without an underline.",
        undefined,
        undefined,
        SWEET_BAKERY_9,
        SWEET_BAKERY_10
      ),
    ],
    challenge:
      "Typography at home, one page only, in the style tag of index.html.\n1. Set font-family on the body of index.html, then remove it from every other rule.\n2. Give h1 40px, h2 30px and h3 22px, and centre h1 and h2.\n3. Set the paragraphs to 18px with a line height of 1.6. Try 1.2 and 2 as well, and write down which one you kept and why.\n4. Style the table header row with a background colour and white text.\n5. Make the button dark brown with white text, and add a :hover state that changes it.",
    quiz: [
      q(
        "Which property sets the font for the whole page from one rule?",
        ["font-size", "font-family", "line-height", "text-align"],
        1,
        "font-family on the body is inherited by everything inside it."
      ),
      q(
        "What does line-height: 1.6 do?",
        [
          "Makes the text 1.6 pixels tall",
          "Puts 1.6 lines between paragraphs",
          "Makes each line one and a half times as tall as the text",
          "Centres the text on the page",
        ],
        2,
        "It is a multiplier, not a size. 1.6 gives room to breathe between lines."
      ),
      q(
        "What does :hover mean on a rule?",
        [
          "The element is hidden until you click it",
          "The element is at the end of the page",
          "The link has been visited before",
          "The pointer is on the element right now",
        ],
        3,
        ":hover is a state: while the pointer is on it."
      ),
      q(
        "Why keep one set of colour codes for the whole page?",
        [
          "Changing the accent becomes a one-line change",
          "It is what the browser requires",
          "It makes the page load faster",
          "It stops the links being underlined",
        ],
        0,
        "Reusing the same six codes means a colour never drifts, and retheming is one edit."
      ),
    ],
    accent: ACCENT,
  },
  // ══ 3 · Selectors ═════════════════════════════════════════════════════
  {
    id: "css-3",
    number: 11,
    month: 3,
    phase: 2,
    kind: "CSS",
    title: "Selectors",
    subtitle: "id, class, and pointing at exactly the element you meant",
    intro:
      "A tag selector is blunt: every h2 on the Sweet Bakery page, including the one inside the contact form. This session is how you stop being blunt. An id names one element, a class names a kind, and the two together let you write a rule that cannot hit the wrong thing.",
    learningGoal:
      "Write an id selector and a class selector, tell the two apart on sight, and use them to style one section of the page without touching the rest.",
    successCriteria: [
      "Use # to target one element and . to target a kind, and say which is which",
      "Put the same class on three elements and write one rule that styles all three",
      "Target a child of an element, such as #contact input",
      "Group two selectors in one rule with a comma",
    ],
    commonMistake:
      "Adding a class to your CSS that the markup does not have. The rule is then dead: the browser matches nothing and says nothing, so it looks exactly like a rule you got wrong.",
    heroImage: CSS_HERO,
    sections: [
      s(
        "# points at one element",
        "A hash, then a name, no spaces in the name. An id is unique on the page — the bakery already uses one on every section, which is what the nav links jump to.\n\nSo #header is the only header, and #products is the only products section. There is no second one to argue with.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title># points at one element</title>
    <style>
        #header {
            background-color: #f3dfc1;
        }

        #about {
            text-align: center;
        }
    </style>
</head>
<body>
    <header id="header">
        <h1>Sweet Bakery</h1>
    </header>
    <section id="about">
        <h2>About Us</h2>
    </section>
</body>
</html>`
      ),
      s(
        ". points at a kind of element",
        'A dot, then a name. A class is not unique: three product cards can all carry class="product", and one rule styles all three.\n\nThis is the selector you will use most. Reach for it the moment a tag selector would catch something it should not.',
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>. points at a kind of element</title>
    <style>
        .product {
            background-color: #ffffff;
        }

        .product h3 {
            color: #7b3f00;
        }
    </style>
</head>
<body>
    <div class="product">
        <h3>Chocolate Cake</h3>
    </div>
    <div class="product">
        <h3>Croissant</h3>
    </div>
    <div class="product">
        <h3>Cookies</h3>
    </div>
</body>
</html>`
      ),
      s(
        "id or class?",
        "The test is not how they are written, it is how many things they can match.\n\nAn id answers to exactly one element, so it is right for a section you jump to or a script you will drive. A class answers to as many as you like, so it is right for anything that repeats — cards, prices, buttons.\n\nIf you catch yourself writing the same hex code twice, the answer is usually a class.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>id or class?</title>
    <style>
        /* One element only: an id. */
        #products {
            text-align: center;
        }

        /* As many as you like: a class. */
        .product {
            background-color: white;
        }

        .price {
            color: #d2691e;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <section id="products">
        <div class="product">
            <p class="price">&dollar;15</p>
        </div>
        <div class="product">
            <p class="price">&dollar;3</p>
        </div>
    </section>
</body>
</html>`
      ),
      s(
        "Pointing at a child",
        "A space between two selectors means the second one is somewhere inside the first.\n\n#contact input means every input inside the contact section and nowhere else. It is the same idea as nesting in HTML, read downwards: parent, then child.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Pointing at a child</title>
    <style>
        #contact input {
            display: block;
        }

        #contact button {
            background-color: #7b3f00;
            color: white;
        }
    </style>
</head>
<body>
    <section id="contact">
        <form>
            <input type="text" id="name">
            <input type="email" id="email">
            <button type="submit">Place Order</button>
        </form>
    </section>
</body>
</html>`
      ),
      s(
        "One rule, several targets",
        "A comma between selectors means all of them, in one rule. h1, h2 and p share a colour, and that is one line instead of three.\n\nIt only works when the values are the same. Two targets that need different values are two rules, and joining them would just make one of them wrong.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>One rule, several targets</title>
    <style>
        h1, h2, h3 {
            color: #7b3f00;
        }

        p {
            color: #4b2e2e;
        }
    </style>
</head>
<body>
    <h1>Sweet Bakery</h1>
    <h2>Our Products</h2>
    <h3>Chocolate Cake</h3>
    <p>Fresh, delicious, and made with love.</p>
</body>
</html>`
      ),
      s(
        "The universal selector",
        "A single asterisk points at every element on the page. It is the bluntest selector there is and it is almost never the right one.\n\nLeave it alone in this course. Write the rule for the elements you actually mean.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>The universal selector</title>
    <style>
        * {
            margin: 0;
            padding: 0;
        }

        body {
            font-family: Arial, sans-serif;
        }
    </style>
</head>
<body>
    <h1>Sweet Bakery</h1>
    <p>Fresh, delicious, and made with love.</p>
</body>
</html>`
      ),
      s(
        "Try yourself: name the parts of the page",
        "Put an id on the header, a class on the nav, a class on the hero, a class on each product and a class on each price — then write rules that only hit what you named.",
        undefined,
        undefined,
        SWEET_BAKERY_10,
        SWEET_BAKERY_11
      ),
    ],
    challenge:
      "Selectors at home, in the style tag of index.html.\n1. Give the header an id, and the nav a class. Style the header band with the pale tan.\n2. Give each product card a class and write one rule that gives all of them a white background.\n3. Target only the price inside a card with .price, and make it orange and bold.\n4. Style the price table through its section: centre it, darken the header row, and set the margin to auto so the table sits in the middle.\n5. Add a :hover colour to the nav links and say what changed when the pointer went over one.",
    quiz: [
      q(
        "What does #products select?",
        [
          "Every element inside the products section",
          "Every element of the same type as products",
          "The one element whose id is products",
          "The element with class products",
        ],
        2,
        "A hash names one element on the page, and no other element can share the name."
      ),
      q(
        "What does .product select?",
        [
          "One element only",
          "Every p element on the page",
          "Only the first element with that class",
          'Every element carrying class="product", however many there are',
        ],
        3,
        "A class names a kind of element, so one rule can style a whole set of them."
      ),
      q(
        "What does #contact input mean?",
        [
          "Every input inside the contact section",
          "Two rules: one for the section and one for the input",
          "The input element called contact",
          "An input directly before the contact section",
        ],
        0,
        "A space reads downwards: parent, then a descendant inside it."
      ),
      q(
        "What happens to a rule whose class is not in the markup?",
        [
          "The browser picks a similar class instead",
          "The rule is ignored, silently",
          "The whole style tag is thrown away",
          "The last rule wins",
        ],
        1,
        "It matches nothing and says nothing. That is why a dead rule feels like your own mistake."
      ),
    ],
    accent: ACCENT,
  },
  // ══ 4 · The box model ══════════════════════════════════════════════════
  {
    id: "css-4",
    number: 12,
    month: 3,
    phase: 2,
    kind: "CSS",
    title: "The Box Model",
    subtitle: "padding, margin, border — and why 300px is not 300px",
    intro:
      "Every element of Sweet Bakery is a box, and this session is the rule that decides how big that box is. Once you can see the four layers, the product cards stop being guesswork — and one property at the top of the file stops the surprise that catches everybody once.",
    learningGoal:
      "Describe the four layers of a box, set padding, margin and border on a card, and use box-sizing so the width you write is the width you get.",
    successCriteria: [
      "Name content, padding, border and margin in that order, from the middle outwards",
      "Tell the difference between padding and margin in one sentence",
      "Set a width on a card and explain why it comes out bigger",
      "Put box-sizing: border-box on everything and watch the widths become honest",
    ],
    commonMistake:
      "Reading width as the outside of the box. By default it is the content only, so padding and border are added on top — and two cards that should sit side by side no longer do.",
    heroImage: CSS_HERO,
    sections: [
      s(
        "Every element is a box",
        "Four layers, from the middle out: the content, then padding around it, then a border around that, then a margin outside everything.\n\nThe content is the words or the picture. The padding is the air inside the border. The margin is the gap between this box and the next one.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Every element is a box</title>
    <style>
        .product {
            width: 300px;
            padding: 20px;
            margin: 20px;
            border: 2px solid #d9b38c;
            background-color: white;
        }
    </style>
</head>
<body>
    <div class="product">
        <h3>Chocolate Cake</h3>
        <p>Delicious chocolate cake.</p>
    </div>
</body>
</html>`
      ),
      s(
        "padding: air inside the border",
        "padding pushes the content in from the border, without touching anything outside the box.\n\nOne number puts the same space on all four sides. Four numbers go top, right, bottom, left — and that is the one thing in CSS worth memorising, because every property that takes four values works this way.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>padding: air inside the border</title>
    <style>
        .product {
            background-color: white;
            border: 2px solid #d9b38c;
            /* one number: all four sides */
            padding: 20px;
            /* four numbers: top right bottom left */
            padding: 10px 30px 10px 30px;
        }
    </style>
</head>
<body>
    <div class="product">
        <h3>Chocolate Cake</h3>
    </div>
</body>
</html>`
      ),
      s(
        "margin: air outside the border",
        "margin pushes everything else away. It is the only one of the four that does not change the size of the box itself.\n\nSo: padding is space inside the card, margin is space between cards. Same page, two boxes, one sentence.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>margin: air outside the border</title>
    <style>
        .product {
            width: 300px;
            background-color: white;
            border: 2px solid #d9b38c;
            /* inside the card */
            padding: 20px;
            /* outside the card, between it and the next */
            margin: 20px;
        }
    </style>
</head>
<body>
    <div class="product">
        <h3>Chocolate Cake</h3>
    </div>
    <div class="product">
        <h3>Croissant</h3>
    </div>
</body>
</html>`
      ),
      s(
        "Why the box is bigger than the width you wrote",
        "This is the single most common surprise in CSS, and it is not a bug.\n\nBy default box-sizing is content-box, which means width means the content only. The browser then adds both sides of the padding and both sides of the border on top. This section writes 300px and ends up 364px wide.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Why the box is bigger than the width you wrote</title>
    <style>
        .product {
            width: 300px;
            padding: 30px;
            border: 2px solid #d9b38c;
            background-color: white;
        }
    </style>
</head>
<body>
    <div class="product">
        <h3>Chocolate Cake</h3>
    </div>
</body>
</html>`
      ),
      s(
        "box-sizing: border-box",
        "One rule at the top of the style tag fixes it for the whole page.\n\nWith border-box, width means the entire box — padding and border eat into the number you wrote instead of being added to it. 300px is then 300px, and the arithmetic in your head finally matches the page.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>box-sizing: border-box</title>
    <style>
        /* the one rule that makes every width on the page honest */
        * {
            box-sizing: border-box;
        }

        .product {
            width: 300px;
            padding: 30px;
            border: 2px solid #d9b38c;
            background-color: white;
        }
    </style>
</head>
<body>
    <div class="product">
        <h3>Chocolate Cake</h3>
    </div>
</body>
</html>`
      ),
      s(
        "margin: auto, and margin: 0",
        "Two shorthands worth knowing by heart.\n\nmargin: 0 removes the space the browser puts around the body, which is why a styled page starts hard against the edge. margin: auto on a block with a width centres it, because the leftover space is shared out evenly.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>margin: auto, and margin: 0</title>
    <style>
        body {
            margin: 0;
            font-family: Arial, sans-serif;
        }

        form {
            width: 400px;
            margin: auto;
            padding: 25px;
            border: 2px solid #d9b38c;
            background-color: white;
        }
    </style>
</head>
<body>
    <form>
        <input type="text" id="name">
        <input type="email" id="email">
    </form>
</body>
</html>`
      ),
      s(
        "A table that looks like a table",
        "border-collapse: collapse draws one line between cells instead of two, which is what makes a bordered table look finished rather than drawn in a hurry.\n\nPadding inside each cell is what stops the words touching the lines. Both go together, always.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>A table that looks like a table</title>
    <style>
        table {
            border-collapse: collapse;
            margin: auto;
        }

        th,
        td {
            border: 1px solid #7b3f00;
            padding: 15px;
        }
    </style>
</head>
<body>
    <table>
        <tr>
            <th>Product</th>
            <th>Price</th>
        </tr>
        <tr>
            <td>Chocolate Cake</td>
            <td>&dollar;15</td>
        </tr>
    </table>
</body>
</html>`
      ),
      s(
        "Try yourself: give the cards room",
        "Put box-sizing on the page, then give the header, the sections, the cards and the order form their padding, margin and border.",
        undefined,
        undefined,
        SWEET_BAKERY_11,
        SWEET_BAKERY_12
      ),
    ],
    challenge:
      "The box model at home, in index.html.\n1. Put `* { box-sizing: border-box; }` at the top of your style tag, before every other rule.\n2. Set margin: 0 on the body, then give the header 25px of padding.\n3. Give every section 30px of margin and 30px of padding, and the hero a 2px tan border.\n4. Make each product card 300px wide with 20px of padding and a 2px tan border. Then remove box-sizing and look at what happens.\n5. Give the order form a width of 400px, centre it with margin: auto, and put a border and 25px of padding around it.",
    quiz: [
      q(
        "Which four layers make up every box, from the middle outwards?",
        [
          "Content, margin, border, padding",
          "Margin, border, padding, content",
          "Width, height, padding, colour",
          "Content, padding, border, margin",
        ],
        3,
        "Content in the middle, then padding, then border, then margin outside everything."
      ),
      q(
        "What is the difference between padding and margin?",
        [
          "Padding is inside the border, margin is outside it",
          "They are two names for the same thing",
          "Padding works on text, margin works on pictures",
          "Margin only works on the body",
        ],
        0,
        "Padding is the space inside the card; margin is the gap between cards."
      ),
      q(
        "By default, what does width: 300px mean?",
        [
          "The whole box is 300px wide",
          "The content is 300px wide and padding and border are added on top",
          "The box is 300px wide before the body margin",
          "Nothing — width needs a height as well",
        ],
        1,
        "That is content-box, the default, and the reason a card ends up bigger than the number you wrote."
      ),
      q(
        "What does box-sizing: border-box change?",
        [
          "The order of the four layers",
          "Whether padding works on text",
          "It makes width mean the whole box, padding and border included",
          "It removes the border from the page",
        ],
        2,
        "One rule, and the width you write is the width you get."
      ),
    ],
    accent: ACCENT,
  },
  // ══ 5 · Backgrounds and states ════════════════════════════════════════
  {
    id: "css-5",
    number: 13,
    month: 4,
    phase: 2,
    kind: "CSS",
    title: "Backgrounds and States",
    subtitle: "A photograph behind the hero, and links that answer back",
    intro:
      "A plain background colour fills a box. A background image fills it and tells the visitor where they are. This session puts Sweet Bakery's photograph behind the hero, then teaches the small honest trick that makes a page feel finished: everything reacts when the pointer arrives.",
    learningGoal:
      "Place an image behind a section with background-image, size it with background-size and background-position, and add a :hover state to links and buttons.",
    successCriteria: [
      "Put a photograph behind the hero with background-image and a path",
      "Explain what background-size: cover does, in one sentence",
      "Give a link and a button both a resting state and a :hover state",
      "Turn an <a> into a button-shaped block with display: inline-block",
    ],
    commonMistake:
      "Putting background-image on the section but leaving the words unreadable on top of it. The picture is a backdrop, so something translucent has to sit between it and the text.",
    heroImage: CSS_HERO,
    sections: [
      s(
        "background-color and background-image",
        "The same property, two values. A colour fills the box flat; an image fills it with a file, found by the same path rules you used for a picture in month 1.\n\nThe url() takes the path in quotes. The path here is https://media.istockphoto.com/id/1479330210/photo/artisan-baker-applying-egg-wash-on-to-pastries-in-a-small-bakery.jpg?b=1&s=612x612&w=0&k=20&c=LoCpP2-n7LhsK1ScQoQXEi0Kp914S7Fwbwi7AD2Z9hU= — a folder called images next to index.html.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>background-color and background-image</title>
    <style>
        .hero {
            background-color: #f3dfc1;
            background-image: url("https://media.istockphoto.com/id/1479330210/photo/artisan-baker-applying-egg-wash-on-to-pastries-in-a-small-bakery.jpg?b=1&s=612x612&w=0&k=20&c=LoCpP2-n7LhsK1ScQoQXEi0Kp914S7Fwbwi7AD2Z9hU=");
            padding: 100px 30px;
        }
    </style>
</head>
<body>
    <section class="hero">
        <h2>Welcome to Sweet Bakery</h2>
    </section>
</body>
</html>`
      ),
      s(
        "background-size: cover",
        "Left alone, an image repeats — which is never what a photograph wants. cover tells the browser to scale it until it fills the whole box, cropping whatever hangs off the edge.\n\nIts partner is background-position: center, which decides which part survives the crop. The middle of a photograph is almost always the part you want.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>background-size: cover</title>
    <style>
        .hero {
            background-image: url("https://media.istockphoto.com/id/1479330210/photo/artisan-baker-applying-egg-wash-on-to-pastries-in-a-small-bakery.jpg?b=1&s=612x612&w=0&k=20&c=LoCpP2-n7LhsK1ScQoQXEi0Kp914S7Fwbwi7AD2Z9hU=");
            background-size: 100% 100%;
            background-position: center;
            min-height: 400px;
            padding: 100px 30px;
        }
    </style>
</head>
<body>
    <section class="hero">
        <h2>Welcome to Sweet Bakery</h2>
    </section>
</body>
</html>`
      ),
      s(
        "rgba: a colour you can see through",
        "A photograph behind text is unreadable text. rgba takes three numbers from 0 to 255 and then a fourth: how transparent the colour is, from 0 for clear to 1 for solid.\n\n0.85 is the bakery's number — a white panel you can just see the photograph through.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>rgba: a colour you can see through</title>
    <style>
        .hero {
            background-image: url("https://media.istockphoto.com/id/1479330210/photo/artisan-baker-applying-egg-wash-on-to-pastries-in-a-small-bakery.jpg?b=1&s=612x612&w=0&k=20&c=LoCpP2-n7LhsK1ScQoQXEi0Kp914S7Fwbwi7AD2Z9hU=");
            background-size: 100% 100%;
            background-position: center;
            padding: 100px 30px;
            text-align: center;
        }

        .hero-content {
            background-color: rgba(255, 255, 255, 0.85);
            padding: 40px;
        }
    </style>
</head>
<body>
    <section class="hero">
        <div class="hero-content">
            <h2>Welcome to Sweet Bakery</h2>
            <p>Fresh, delicious, and made with love.</p>
        </div>
    </section>
</body>
</html>`
      ),
      s(
        "display: inline-block, and a link that looks like a button",
        "A link is inline by default, so width and padding on it do nothing useful. display: inline-block keeps it on the same line but gives it a box of its own — which is what lets it take padding and a background.\n\nThat is the whole trick behind every button that is really a link.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>display: inline-block, and a link that looks like a button</title>
    <style>
        .hero-link {
            display: inline-block;
            padding: 12px 25px;
            background-color: #7b3f00;
            color: white;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <a class="hero-link" href="#products">Explore Our Products</a>
</body>
</html>`
      ),
      s(
        "Every state, both states",
        "A rule for a link and a second rule for the same link with :hover. Two lines, and the page tells the visitor their pointer is on something.\n\nGive the hero link and every product link the same pair. Then give the button its own. Consistency here is what makes a page feel deliberate.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Every state, both states</title>
    <style>
        .navigation a {
            color: #7b3f00;
            text-decoration: none;
            margin-right: 20px;
        }

        .navigation a:hover {
            color: #d2691e;
            text-decoration: underline;
        }

        .hero-link {
            display: inline-block;
            padding: 12px 25px;
            background-color: #7b3f00;
            color: white;
            text-decoration: none;
        }

        .hero-link:hover {
            background-color: #d2691e;
        }
    </style>
</head>
<body>
    <nav class="navigation">
        <a href="#products">Products</a>
        <a href="#prices">Prices</a>
    </nav>
    <a class="hero-link" href="#products">Explore Our Products</a>
</body>
</html>`
      ),
      s(
        "Replacing the hero picture with the hero photograph",
        "The <img> tag is gone from the hero and the photograph is behind it instead. Nothing is lost: the words are still real text, so they are still readable by a screen reader and still selectable.\n\nThat is the difference between a picture of a hero and a hero. The background is decoration; the words are content.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Replacing the hero picture with the hero photograph</title>
    <style>
        .hero {
            min-height: 400px;
            background-image: url("https://media.istockphoto.com/id/1479330210/photo/artisan-baker-applying-egg-wash-on-to-pastries-in-a-small-bakery.jpg?b=1&s=612x612&w=0&k=20&c=LoCpP2-n7LhsK1ScQoQXEi0Kp914S7Fwbwi7AD2Z9hU=");
            background-size: 100% 100%;
            background-position: center;
            padding: 100px 30px;
            text-align: center;
        }

        .hero-content {
            background-color: rgba(255, 255, 255, 0.85);
            padding: 40px;
        }

        .product img {
            width: 100%;
        }
    </style>
</head>
<body>
    <section class="hero">
        <div class="hero-content">
            <h2>Welcome to Sweet Bakery</h2>
        </div>
    </section>
    <div class="product">
        <img src="https://images.pexels.com/photos/11774178/pexels-photo-11774178.jpeg"  alt="Chocolate Cake">
    </div>
</body>
</html>`
      ),
      s(
        "Try yourself: the hero gets a photograph",
        "Take the img out of the hero, put the bakery's photograph behind it, and add a :hover state to every link and the button.",
        undefined,
        undefined,
        SWEET_BAKERY_12,
        SWEET_BAKERY_13
      ),
    ],
    challenge:
      "Backgrounds and states at home, in the style tag of index.html.\n1. Remove the <img> from the hero section of index.html and put the photograph behind it with background-image.\n2. Give the hero a min-height of 400px, set background-size to cover and background-position to center.\n3. Put the words in a div inside the hero and give it a white background at 0.85 transparency and 40px of padding.\n4. Turn the hero's link into a block with 12px of vertical padding and 25px of horizontal, on the bakery's brown.\n5. Add a :hover state to the nav links, the hero link and the button — three rules, and the page stops being static.",
    quiz: [
      q(
        "What does background-size: cover do?",
        [
          "Scales the image until it fills the box, cropping the overflow",
          "Repeats the image across the box",
          "Keeps the image at its own size",
          "Compresses the image file",
        ],
        0,
        "cover fills the box and crops what hangs over. repeat is the opposite and almost never wanted."
      ),
      q(
        "What are the four numbers in rgba(255, 255, 255, 0.85)?",
        [
          "Top, right, bottom, left",
          "Red, green, blue, and how transparent it is",
          "Width, height, padding, margin",
          "Red, green, blue, and how blurred it is",
        ],
        1,
        "Three colour channels and one alpha value: 0 is clear, 1 is solid."
      ),
      q(
        "Why does a link need display: inline-block before it can take padding?",
        [
          "An inline element is ignored by the browser",
          "Padding is not allowed on links",
          "An inline element has no box, so there is nothing to pad",
          "It makes the link change colour",
        ],
        2,
        "Inline elements ignore width and height. inline-block keeps the line but gives the link a box."
      ),
      q(
        "What does :hover add to a rule?",
        [
          "The element hidden from the page",
          "A second copy of the element",
          "The style for a screen with a mouse",
          "The state while the pointer is on the element",
        ],
        3,
        "Two rules — one at rest, one with :hover — are what make a page answer the pointer."
      ),
    ],
    accent: ACCENT,
  },
  // ══ 6 · Display and flexbox ═══════════════════════════════════════════
  {
    id: "css-6",
    number: 14,
    month: 4,
    phase: 2,
    kind: "CSS",
    title: "Display and Flexbox",
    subtitle: "Putting the header, the cards and the story on one line",
    intro:
      "Everything so far stacked downwards, because that is what a page does by default. Flexbox is the property that changes it: one line on a parent, and its children stop stacking and start sitting side by side. This is the session where Sweet Bakery's header becomes a header.",
    learningGoal:
      "Use display: flex with justify-content, align-items, gap and flex-wrap to lay out a header, a row of cards and a two-column story.",
    successCriteria: [
      "Turn a stacking column into a row with one display: flex on the parent",
      "Push the ends apart with justify-content: space-between",
      "Space items with gap instead of a margin on every one of them",
      "Make a row of cards wrap to the next line instead of overflowing",
    ],
    commonMistake:
      "Putting the flex properties on the children. The parent is the container and carries them; the children only take part, which is why the same one-line rule moves all three cards at once.",
    heroImage: CSS_HERO,
    sections: [
      s(
        "One line on the parent",
        "display: flex on an element makes it a container, and its direct children become items in a row.\n\nPut it on the parent, never on the items. That is why the header below moves both the title and the nav with a single rule.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>One line on the parent</title>
    <style>
        #header {
            display: flex;
            padding: 25px;
            background-color: #f3dfc1;
        }
    </style>
</head>
<body>
    <header id="header">
        <h1>Sweet Bakery</h1>
        <nav class="navigation">
            <a href="#products">Products</a>
            <a href="#prices">Prices</a>
        </nav>
    </header>
</body>
</html>`
      ),
      s(
        "justify-content: space-between",
        "justify-content works along the row. space-between pushes the first item hard left and the last hard right, and shares what is left between them.\n\nIt is the single line that turns a title above a nav into a title at one end and a nav at the other — which is what every header on the web is.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>justify-content: space-between</title>
    <style>
        #header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 25px;
            background-color: #f3dfc1;
        }

        #header h1 {
            margin: 0;
        }

        .navigation {
            display: flex;
            gap: 20px;
        }
    </style>
</head>
<body>
    <header id="header">
        <h1>Sweet Bakery</h1>
        <nav class="navigation">
            <a href="#products">Products</a>
            <a href="#prices">Prices</a>
            <a href="#contact">Order</a>
        </nav>
    </header>
</body>
</html>`
      ),
      s(
        "align-items, and the other axis",
        "justify-content works along the row. align-items works across it.\n\nWithout align-items: center, a tall title and a short nav sit on the same line with their tops level, which looks broken. align-items lines their middles up instead.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>align-items, and the other axis</title>
    <style>
        #header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 25px;
            background-color: #f3dfc1;
        }

        .hero {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 300px;
            background-color: #fff8f0;
        }
    </style>
</head>
<body>
    <header id="header">
        <h1>Sweet Bakery</h1>
        <nav class="navigation">
            <a href="#products">Products</a>
        </nav>
    </header>
    <section class="hero">
        <h2>Welcome to Sweet Bakery</h2>
    </section>
</body>
</html>`
      ),
      s(
        "gap instead of margins",
        "A margin on every item leaves a stray gap after the last one, because the margin belongs to the item, not to the space between.\n\ngap belongs to the space between. One line, nothing hanging off either end — and it is the reason the bakery's cards are evenly spaced and the header is not.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>gap instead of margins</title>
    <style>
        .products-container {
            display: flex;
            justify-content: center;
            gap: 25px;
        }

        .product {
            width: 300px;
            padding: 20px;
            border: 2px solid #d9b38c;
            background-color: white;
        }
    </style>
</head>
<body>
    <div class="products-container">
        <div class="product">Chocolate Cake</div>
        <div class="product">Croissant</div>
        <div class="product">Cookies</div>
    </div>
</body>
</html>`
      ),
      s(
        "flex-wrap: wrap",
        "By default a flex row stays on one line whatever happens, which means cards get squeezed until the text inside them is unreadable.\n\nflex-wrap: wrap lets them drop to a new line instead. Narrow the window and three cards become two, then one, with no other rule and no media query.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>flex-wrap: wrap</title>
    <style>
        .products-container {
            display: flex;
            justify-content: center;
            gap: 25px;
            flex-wrap: wrap;
        }

        .product {
            width: 300px;
            padding: 20px;
            border: 2px solid #d9b38c;
            background-color: white;
        }
    </style>
</head>
<body>
    <div class="products-container">
        <div class="product">Chocolate Cake</div>
        <div class="product">Croissant</div>
        <div class="product">Cookies</div>
    </div>
</body>
</html>`
      ),
      s(
        "Two columns for the story",
        "The same property builds a column instead of a row: a picture on one side, the words on the other.\n\nalign-items: center lines them up, gap keeps them apart, and max-width on the container stops the pair from stretching across a wide screen.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Two columns for the story</title>
    <style>
        .about-container {
            display: flex;
            align-items: center;
            gap: 40px;
            max-width: 900px;
            margin: auto;
        }

        .about-container img {
            width: 400px;
        }
    </style>
</head>
<body>
    <section id="about">
        <div class="about-container">
            <img src="https://media.istockphoto.com/id/1479330210/photo/artisan-baker-applying-egg-wash-on-to-pastries-in-a-small-bakery.jpg?b=1&s=612x612&w=0&k=20&c=LoCpP2-n7LhsK1ScQoQXEi0Kp914S7Fwbwi7AD2Z9hU=" alt="Our Bakery">
            <div>
                <p>We prepare our products with fresh ingredients every day.</p>
                <p>Our bakery is built around quality, freshness and love.</p>
            </div>
        </div>
    </section>
</body>
</html>`
      ),
      s(
        "Try yourself: lay the page out",
        "Make the header a row with the title at one end and the nav at the other, the product cards a wrapping row, and the About section two columns.",
        undefined,
        undefined,
        SWEET_BAKERY_13,
        SWEET_BAKERY_14
      ),
    ],
    challenge:
      "Layout at home, in the style tag of index.html.\n1. Make #header a flex row: space-between on the main axis, center across it.\n2. Make .navigation a flex row as well, and replace the margin-right on the links with gap: 20px on the nav.\n3. Make .products-container a wrapping row with gap: 25px, and centre it.\n4. Add a third product — cookies — and check that the row still behaves when the window is narrow.\n5. Wrap the contents of #about in a div and lay it out as two columns: picture left, words right, centred vertically.",
    quiz: [
      q(
        "Where does display: flex go?",
        [
          "On the child that should move",
          "On the parent, which becomes the container",
          "On the body only",
          "On every element at once",
        ],
        1,
        "The parent is the container and carries the flex properties. That is why one line moves all the items."
      ),
      q(
        "What does justify-content: space-between do?",
        [
          "Lines the items up by their middles",
          "Centres everything",
          "Pushes the first and last items to the two ends and shares the rest between them",
          "Stacks the items in a column",
        ],
        2,
        "It works along the row. space-around and center are the other two worth knowing."
      ),
      q(
        "Which property lines items up across the row, vertically?",
        ["justify-content", "gap", "flex-wrap", "align-items"],
        3,
        "align-items works across the line; justify-content works along it."
      ),
      q(
        "Why prefer gap over a margin on every item?",
        [
          "gap measures the space between items, so nothing hangs off the end",
          "gap is faster",
          "margins do not work in flexbox",
          "gap works without a parent",
        ],
        0,
        "A margin belongs to the item, so the last one leaves a gap after it. gap does not."
      ),
    ],
    accent: ACCENT,
  },
  // ══ 7 · The header and the cards ══════════════════════════════════════
  {
    id: "css-7",
    number: 15,
    month: 4,
    phase: 2,
    kind: "CSS",
    title: "The Header and the Cards",
    subtitle: "A logo, a hero with room to breathe, and three cards that match",
    intro:
      "Sweet Bakery works. It does not yet look designed. This session is the pass that changes that: a real logo instead of a heading, a hero with height and a small title above the big one, and cards with a picture on top and text underneath — the shape of almost every page you have ever visited.",
    learningGoal:
      "Build a header with a logo and a navigation row, give the hero height and a large heading, and give each product card the same picture-above-text structure.",
    successCriteria: [
      "Replace the header h1 with a logo div and style it as the shop's name",
      "Give the hero a min-height and set the big heading to 60px",
      "Add a small title above the hero heading with letter-spacing",
      "Give every product card the same picture-above-text structure",
    ],
    commonMistake:
      "Styling one card beautifully and the other two by eye. Cards are a class: they are identical, and the only honest way to keep them identical is one rule that hits all three.",
    heroImage: CSS_HERO,
    sections: [
      s(
        "A logo instead of a heading",
        "The shop's name is not a heading — it is a mark, and it belongs in a div with a class.\n\nThat sounds like a small change. It is not: a heading is content the browser and a search engine read, and a logo is decoration. Using the right tag is half of designing a header.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>A logo instead of a heading</title>
    <style>
        .header {
            height: 80px;
            padding: 0 8%;
            background-color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #7b3f00;
        }
    </style>
</head>
<body>
    <header class="header">
        <div class="logo">Sweet Bakery</div>
    </header>
</body>
</html>`
      ),
      s(
        "Padding in per cent",
        "8% is not 8 pixels. It is 8% of the width of the parent — so the header keeps the same margin from the edge whatever the window is doing.\n\nThis is the difference between a page that only looks right on the monitor it was built on and one that holds together everywhere. padding: 0 8% is two numbers: top and bottom, then left and right.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Padding in per cent</title>
    <style>
        .header {
            min-height: 80px;
            padding: 0 8%;
            background-color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .navigation {
            display: flex;
            gap: 25px;
        }
    </style>
</head>
<body>
    <header class="header">
        <div class="logo">Sweet Bakery</div>
        <nav class="navigation">
            <a href="#home">Home</a>
            <a href="#products">Products</a>
            <a href="#prices">Prices</a>
        </nav>
    </header>
</body>
</html>`
      ),
      s(
        "A hero with height",
        "min-height: 550px gives the section room to be a hero at all. A hero with no height is just a heading on a background.\n\nThe flex properties then centre the panel in the middle of that space, both across and down, so the words sit where the eye lands first.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>A hero with height</title>
    <style>
        .hero {
            min-height: 550px;
            background-image: url("https://media.istockphoto.com/id/1479330210/photo/artisan-baker-applying-egg-wash-on-to-pastries-in-a-small-bakery.jpg?b=1&s=612x612&w=0&k=20&c=LoCpP2-n7LhsK1ScQoQXEi0Kp914S7Fwbwi7AD2Z9hU=");
            background-size: 100% 100%;
            background-position: center;
            display: flex;
            justify-content: center;
            align-items: center;
            text-align: center;
        }

        .hero-content {
            background-color: rgba(255, 255, 255, 0.9);
            padding: 50px;
        }
    </style>
</head>
<body>
    <section id="home" class="hero">
        <div class="hero-content">
            <h1>Sweet Bakery</h1>
        </div>
    </section>
</body>
</html>`
      ),
      s(
        "letter-spacing, and the small title above the big one",
        "A short line in small capitals, spaced out with letter-spacing, above the real heading. Two rules, and the hero stops being a sentence and starts being a designed panel.\n\nThe same line works twice more on the page — above About, and above the order form — and repeating it is what makes three sections look like one site.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>letter-spacing, and the small title above the big one</title>
    <style>
        .small-title {
            color: #d2691e;
            letter-spacing: 3px;
            font-size: 14px;
        }

        .section-title {
            text-align: center;
            margin-bottom: 40px;
        }

        .section-title h2 {
            font-size: 36px;
            color: #7b3f00;
        }
    </style>
</head>
<body>
    <section id="products">
        <div class="section-title">
            <p class="small-title">WHAT WE MAKE</p>
            <h2>Our Special Products</h2>
        </div>
    </section>
</body>
</html>`
      ),
      s(
        "A card with the picture on top",
        "The card is one div. The picture goes first and takes the full width of it; the text goes below inside a second div with padding.\n\ndisplay: block on the image matters — an inline image leaves a gap underneath it that you will spend an afternoon blaming on the padding.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>A card with the picture on top</title>
    <style>
        .product {
            width: 300px;
            background-color: white;
            border: 1px solid #ead8c5;
        }

        .product img {
            width: 100%;
            display: block;
        }

        .product-content {
            padding: 25px;
        }

        .product-content h3 {
            color: #7b3f00;
        }
    </style>
</head>
<body>
    <div class="product">
        <img src="https://images.pexels.com/photos/11774178/pexels-photo-11774178.jpeg"  alt="Chocolate Cake">
        <div class="product-content">
            <h3>Chocolate Cake</h3>
            <p>A delicious cake made with rich chocolate.</p>
            <span class="price">&dollar;15</span>
        </div>
    </div>
</body>
</html>`
      ),
      s(
        "Three cards, one rule",
        "The three cards are the same div three times, and they are styled by one class. Nothing in that rule says which card it is styling, and nothing needs to.\n\nIf you find yourself editing a card one at a time, stop — you have written three rules where one was wanted, and they will drift apart by the third product.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Three cards, one rule</title>
    <style>
        .products-container {
            display: flex;
            justify-content: center;
            gap: 30px;
            flex-wrap: wrap;
        }

        .product {
            width: 300px;
            background-color: white;
            border: 1px solid #ead8c5;
        }

        .product img {
            width: 100%;
            display: block;
        }

        .product-content {
            padding: 25px;
        }

        .price {
            color: #d2691e;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="products-container">
        <div class="product">
            <img src="https://images.pexels.com/photos/11774178/pexels-photo-11774178.jpeg"  alt="Chocolate Cake">
            <div class="product-content">
                <h3>Chocolate Cake</h3>
                <span class="price">&dollar;15</span>
            </div>
        </div>
        <div class="product">
            <img src="https://images.pexels.com/photos/27969785/pexels-photo-27969785.jpeg" alt="Croissant">
            <div class="product-content">
                <h3>Fresh Croissant</h3>
                <span class="price">&dollar;3</span>
            </div>
        </div>
        <div class="product">
            <img src="https://images.pexels.com/photos/8478048/pexels-photo-8478048.jpeg" alt="Cookies">
            <div class="product-content">
                <h3>Chocolate Cookies</h3>
                <span class="price">&dollar;10</span>
            </div>
        </div>
    </div>
</body>
</html>`
      ),
      s(
        "The price list, centred",
        "The same three ideas on a table: collapse the borders so the lines are single, centre the table with margin: auto, and darken the header row.\n\nA header row that looks like the data rows is a table nobody can scan.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>The price list, centred</title>
    <style>
        #prices {
            padding: 80px 8%;
            text-align: center;
        }

        table {
            border-collapse: collapse;
            margin: auto;
        }

        th,
        td {
            border: 1px solid #7b3f00;
            padding: 15px 30px;
        }

        th {
            background-color: #7b3f00;
            color: white;
        }
    </style>
</head>
<body>
    <section id="prices">
        <h2>Our Price List</h2>
        <table>
            <tr>
                <th>Product</th>
                <th>Size</th>
                <th>Price</th>
            </tr>
            <tr>
                <td>Chocolate Cake</td>
                <td>Medium</td>
                <td>&dollar;15</td>
            </tr>
        </table>
    </section>
</body>
</html>`
      ),
      s(
        "Try yourself: the header and the cards",
        "Turn the header's heading into a logo, give the hero its height and its small title, and rebuild the products as three cards with the picture on top.",
        undefined,
        undefined,
        SWEET_BAKERY_14,
        SWEET_BAKERY_15
      ),
    ],
    challenge:
      'The design pass, at home, in the style tag of index.html.\n1. Replace the h1 in the header with a div of class "logo", 28px and bold, on the bakery\'s brown.\n2. Give the header min-height 80px and padding 0 8%, so the margin holds at every window width.\n3. Give the hero min-height 550px and put a small-title line above the h1, 14px with 3px of letter spacing.\n4. Rebuild the products as cards: picture on top taking the full width with display: block, text below inside .product-content with 25px of padding.\n5. Add cookies as a third card and a third row in the price list. Check the page at half width and say whether the row still wraps.',
    quiz: [
      q(
        "Why is the shop's name a div rather than an h1?",
        [
          "A div is easier to style",
          "Headings cannot be styled",
          "The name is a decoration, not content, so it should not be a heading",
          "A div is smaller on the page",
        ],
        2,
        "The right tag for the job: a heading is content the browser reads, a logo is a mark."
      ),
      q(
        "What does padding: 0 8% give the header?",
        [
          "8 pixels on the left and right",
          "Nothing, per cent does not work on padding",
          "8% of the screen height",
          "8% of the parent's width on the left and right",
        ],
        3,
        "A per cent is measured against the parent, so the margin holds at every window width."
      ),
      q(
        "Why display: block on a card's image?",
        [
          "An inline image leaves a gap under it that padding then makes worse",
          "It makes the image load faster",
          "It centres the image",
          "It is needed for the alt text",
        ],
        0,
        "An inline image sits on a text line, so there is a descender-sized gap under it."
      ),
      q(
        "How should the three product cards be styled?",
        [
          "Three separate rules, one per card",
          "One rule on the class, because they are identical",
          "One rule per product type",
          "An id on each card",
        ],
        1,
        "Cards are a class. One rule that hits all three keeps them identical for ever."
      ),
    ],
    accent: ACCENT,
  },
  // ══ 8 · Finish the page ═══════════════════════════════════════════════
  {
    id: "css-8",
    number: 16,
    month: 4,
    phase: 2,
    kind: "CSS",
    title: "Finish the Page",
    subtitle: "Smooth scrolling, two columns, a real form and a footer",
    intro:
      "One session left, and it is the one that finishes Sweet Bakery. A nav that scrolls instead of jumping. An About section in two columns. An order form with a dropdown and a message box that actually look like they were designed. A footer, and the copyright line at the bottom of it.",
    learningGoal:
      "Add scroll-behavior: smooth to the page, lay out the About section and the order form, style every input type consistently, and finish the page with a footer.",
    successCriteria: [
      "Make the page scroll smoothly instead of jumping when a nav link is followed",
      "Lay out the About section as two columns, and say what each flex property does there",
      "Style input, select and textarea with one rule that covers all three",
      "Add a footer and a copyright line, and check every nav link lands somewhere",
    ],
    commonMistake:
      "Styling input and leaving select and textarea alone. Three different looking fields in one form is the thing a visitor notices first and forgives last.",
    heroImage: CSS_HERO,
    sections: [
      s(
        "scroll-behavior: smooth",
        "One rule on the html element, and every jump inside the page slides instead of teleporting.\n\nIt belongs on html rather than body because html is what actually scrolls. A page with a footer at the bottom and six links in the nav feels broken without it.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>scroll-behavior: smooth</title>
    <style>
        html {
            scroll-behavior: smooth;
        }

        .navigation {
            display: flex;
            gap: 25px;
        }
    </style>
</head>
<body>
    <nav class="navigation">
        <a href="#home">Home</a>
        <a href="#products">Products</a>
        <a href="#about">About</a>
    </nav>
    <section id="home">
        <h1>Sweet Bakery</h1>
    </section>
    <section id="products">
        <h2>Our Products</h2>
    </section>
    <section id="about">
        <h2>About Us</h2>
    </section>
</body>
</html>`
      ),
      s(
        "The About section, in two columns",
        "A background colour on the section, then the flex row inside it: the picture at width 50%, the words at width 50%, centred against each other.\n\nThe .about-image and .about-content names are two elements sharing one class, which is a selector list — and sharing a class is how you get identical widths without repeating the number.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>The About section, in two columns</title>
    <style>
        .about {
            padding: 80px 8%;
            background-color: #f3dfc1;
            display: flex;
            align-items: center;
            gap: 60px;
        }

        .about-image,
        .about-content {
            width: 50%;
        }

        .about-image img {
            width: 100%;
            display: block;
        }

        .about-content h2 {
            color: #7b3f00;
            font-size: 40px;
        }

        .about-content p {
            line-height: 1.8;
        }
    </style>
</head>
<body>
    <section id="about" class="about">
        <div class="about-image">
            <img src="https://media.istockphoto.com/id/1479330210/photo/artisan-baker-applying-egg-wash-on-to-pastries-in-a-small-bakery.jpg?b=1&s=612x612&w=0&k=20&c=LoCpP2-n7LhsK1ScQoQXEi0Kp914S7Fwbwi7AD2Z9hU=" alt="Inside Sweet Bakery">
        </div>
        <div class="about-content">
            <h2>Baked With Love</h2>
            <p>Great food starts with great ingredients.</p>
        </div>
    </section>
</body>
</html>`
      ),
      s(
        "One rule for every field",
        "input, select and textarea in one selector, one rule. Full width, padding of 12px, a border, and font-family: inherit so they use the page's font instead of the browser's default.\n\nfont-family: inherit is the line everybody misses. A dropdown that renders in a different typeface from the page next to it is the giveaway that a form was bolted on.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>One rule for every field</title>
    <style>
        input,
        select,
        textarea {
            width: 100%;
            padding: 12px;
            margin-bottom: 20px;
            border: 1px solid #d9b38c;
            font-family: inherit;
        }

        textarea {
            resize: vertical;
        }
    </style>
</head>
<body>
    <form>
        <input type="text" id="name" placeholder="Enter your name">
        <select id="product">
            <option>Chocolate Cake</option>
            <option>Fresh Croissant</option>
        </select>
        <textarea id="message" rows="5" placeholder="Write your message"></textarea>
    </form>
</body>
</html>`
      ),
      s(
        "Labels above their fields",
        "label is display: block, so each one sits on its own line above its field instead of beside it.\n\nThe label markup is from the HTML track and does not change. Only its styling does — and the pairing is the reason a screen reader can announce each field at all.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Labels above their fields</title>
    <style>
        form {
            max-width: 600px;
            margin: auto;
            background-color: white;
            padding: 40px;
            border: 1px solid #ead8c5;
        }

        label {
            display: block;
            margin-bottom: 8px;
            color: #7b3f00;
            font-weight: bold;
        }

        input {
            width: 100%;
            padding: 12px;
            margin-bottom: 20px;
            border: 1px solid #d9b38c;
            font-family: inherit;
        }
    </style>
</head>
<body>
    <form>
        <label for="name">Your Name</label>
        <input type="text" id="name" placeholder="Enter your name">
    </form>
</body>
</html>`
      ),
      s(
        "A button that takes the whole width",
        "width: 100% on the button, 14px of padding, no border, and the bakery's brown with white text.\n\ncursor: pointer is the last line and it matters: without it the pointer stays an arrow over the one element on the page that does something.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>A button that takes the whole width</title>
    <style>
        button {
            width: 100%;
            padding: 14px;
            border: none;
            background-color: #7b3f00;
            color: white;
            cursor: pointer;
        }

        button:hover {
            background-color: #d2691e;
        }
    </style>
</head>
<body>
    <button type="submit">Send Order</button>
</body>
</html>`
      ),
      s(
        "A footer to close the page",
        "A page that stops at the form reads as unfinished. The footer is the last section, and the same header brown closes the page the way the header opened it.\n\nThe copyright line uses the &copy; entity from month 1, and the year is written out because next year you will change it.",
        `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>A footer to close the page</title>
    <style>
        footer {
            padding: 40px 8%;
            background-color: #7b3f00;
            color: white;
            text-align: center;
        }

        footer h3 {
            margin-top: 0;
        }
    </style>
</head>
<body>
    <footer>
        <h3>Sweet Bakery</h3>
        <p>Freshly baked with love.</p>
        <p>&copy; 2026 Sweet Bakery. All Rights Reserved.</p>
    </footer>
</body>
</html>`
      ),
      s(
        "The closing checks",
        "Run all six on the page before you call it finished.\n1. Does every nav link land on a section that exists?\n2. Does the page hold together at half width, with the cards wrapping rather than overflowing?\n3. Are every field and every link reachable with Tab alone?\n4. Do the input, the dropdown and the message box look like three fields of the same form?\n5. Is every colour one of the six in your palette, with no seventh?\n6. Is there one style tag, in the head, and not a single style attribute anywhere on the page?",
        undefined
      ),
      s(
        "Try yourself: finish the bakery page",
        "Add smooth scrolling, the two-column About section, the styled order form and the footer — the last four pieces of the page.",
        undefined,
        undefined,
        SWEET_BAKERY_15,
        SWEET_BAKERY_16
      ),
    ],
    challenge:
      'Hand the bakery in. Every rule below goes in the style tag of index.html.\n1. Add scroll-behavior: smooth to the html element and follow every nav link to check it lands somewhere real.\n2. Move the About section into a div class "about" with a picture on one side and the words on the other, on the pale tan.\n3. Add a dropdown and a message box to the order form, and style input, select and textarea with one rule each.\n4. Add the footer with the shop name, the tagline and a &copy; line.\n5. Run the six closing checks, fix everything they find, and write down the three differences between your page and the one you have been building towards all month.',
    quiz: [
      q(
        "Which element does scroll-behavior: smooth go on?",
        ["body", "Every section", "nav", "html"],
        3,
        "html is what actually scrolls, so that is where the rule belongs."
      ),
      q(
        "Why does font-family: inherit belong on input and select?",
        [
          "So the fields use the page's font instead of the browser's default",
          "It makes them load faster",
          "It is required for the placeholder to show",
          "It makes the fields read-only",
        ],
        0,
        "A dropdown in a different typeface from the page beside it is the giveaway of a bolted-on form."
      ),
      q(
        "What does resize: vertical on a textarea allow?",
        [
          "The visitor to move it around the page",
          "The visitor to change its height but not its width",
          "The visitor to resize it in any direction",
          "Nothing — it is a read-only property",
        ],
        1,
        "Width is set to 100% by the rule above, so height is the only axis left to offer."
      ),
      q(
        "Why put cursor: pointer on the button?",
        [
          "To make it change colour",
          "It is required on every button",
          "To tell the visitor it is the one thing on the page that acts",
          "To make it bigger on hover",
        ],
        2,
        "Without it the pointer stays an arrow over the only element that does something."
      ),
    ],
    accent: ACCENT,
  },
];

/** Every session in the track, in the order the student meets them. */
export const allCssLessons: CssLesson[] = cssLessons;

/** How many sessions the track runs, used by the roadmap and the certificate. */
export const CSS_SESSION_COUNT = cssLessons.length;

/** The ids, so progress saved before a track grew still resolves. */
export const CSS_LESSON_IDS: string[] = cssLessons.map(lesson => lesson.id);

export { q, s };
