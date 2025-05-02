import path from "node:path";
import url from "node:url";
import assert from "node:assert";
import domCache from "./dom-cache.mjs";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tests = [
    async function basicUsage() {
        const pages = domCache(path.join(__dirname, "html"), { errReporting: {
            ignoreErrors: true
        }});
        const page = await pages.getJsdom("test1-1");
        assert(page.querySelector("title").textContent == "a first page", "test for title failed");
        assert(page.querySelector("title").parentElement.tagName == "HEAD");
        assert(page.querySelector("h1").textContent == "My first page", "test for H1/title failed");
        pages.stop();
    },


    async function makeACopyAndThenAlterIt() {
        const pages = domCache(path.join(__dirname, "html"), { errReporting: {
            ignoreErrors: true
        }});
        const page = await pages.getJsdom("test1-1");

        // Make a copy
        const pageCloned = page.cloneNode(true);

        // Alter the copy
        pageCloned.body.appendChild(pageCloned.createElement("p")).innerHTML
            = `Hello there <b>everyone</b>`;

        const originalBodyLen = Array.from(
            page.body.parentElement.querySelectorAll("body > *")
        ).length;
        const clonedBodyLen = Array.from(
            pageCloned.body.parentElement.querySelectorAll("body > *")
        ).length;
        assert(originalBodyLen == 1, `original body len is not 1 but ${originalBodyLen}`);
        assert(clonedBodyLen == 2, `cloned body len is not 2 but ${clonedBodyLen}`);
        pages.stop();
    },

    async function doSimpleLoadModifications() {
        const pages = domCache(path.join(__dirname, "html"), {
            modifierFunctions: [
                function (dom) {
                    dom.body.insertBefore(
                        dom.createElement("header"), dom.body.firstElementChild
                    ).innerHTML = `<p>Standardized header</p>`;
                }
            ],
            errReporting: {
                ignoreErrors: true
            }
        });
        const page = await pages.getJsdom("test-modifiers-page");
        const footer = page.body.firstElementChild.querySelector("p");
        assert(footer?.textContent === "Standardized header", `the templated header was not found`);
        pages.stop();
    },

    async function doTemplateLoadModifications() {
        const pages = domCache(path.join(__dirname, "html"), {
            modifierFunctions: [
                async function (dom, api) {
                    const template = await api.getJsdom("test-modifiers-template");
                    const head = template.head.cloneNode(true);

                    const domHead = dom.insertBefore(
                        head,
                        dom.firstElementChild.firstElementChild
                    );

                    dom.body.insertBefore(
                        template.body.querySelector("h1").cloneNode(true),
                        dom.body.firstElementChild
                    );

                    const footer = template.body.querySelector("footer").cloneNode(true);
                    dom.body.appendChild(footer);
                }
            ],
            errReporting: {
                ignoreErrors: true
            }
        });
        const page = await pages.getJsdom("test-modifiers-page");
        const title = page?.head?.querySelector("title");
        assert(
            title?.textContent === "My page",
            `the title was not 'My page' for some reason but '${title}'`
        );

        const h1 = page?.body?.firstElementChild;
        assert(h1?.localName === "h1", `the first body element is not an H1 but ${h1?.localName}`);
        assert(
            h1?.textContent === "My page",
            `the H1 text isn't as expected but ${h1?.textContent}`
        );
        
        const footer = page.body.querySelector("footer p");
        assert(
            footer?.textContent
                === "Demonstrating the ability to make html pages conform to a standard",
            `The expected footer was not found`
        );

        pages.stop();
    },
];


// test runner
if (process.argv.slice(2).length === 0) {
    for (const test of tests) {
        await test();
    }
}
else {
    // There's one or more patterns on the command line so check
    // against them and run the relevant functions
    const regexList = process.argv.slice(2).map(arg => new RegExp("^" + arg + "$"));
    for (const testFn of tests) {
        const name = testFn.name;
        for (const regex of regexList) {
            const regexCheck = regex.test(name);
            // console.log('testing:', name, regexCheck, regex)
            if (regexCheck) {
                // console.log("matched ", name);
                await testFn();
                break;
            }
        }
    }
}

// End


