import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import {parseHTML as linkedomParseHTML} from "linkedom";
import ignore from "ignore";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Could use this...
const defaultIgnoreFile = path.join(__dirname, ".gitignore");

// But this is better: compute the dirname of the thing that called us
// by ignoring the recent stack names that are this file, presume
// there is a .gitignore in that directory.
const stackFrameFileRegex = new RegExp(/.*\(*file:[/]+([^:]+):.*\)*/);
const defaultIgnoreFunction = function () {
    const s = new Error().stack;
    for (const frame of s.split(" at ")) {
        const matched = stackFrameFileRegex.exec(frame);
        if (matched === null) continue;

        const [_, fileRef] = matched;
        if (fileRef) {
            if ("/" + fileRef === __filename) continue;
            return path.join(path.dirname("/" + fileRef), ".gitignore");
        }
    }
    return process.cwd();
};

function pluginIncluder(filename) {
    return async function (dom, api) {
        return fs.promises.readFile(filename, "utf8")
            .then(fileContent => {
                const script = dom.head.firstElementChild !== null
                      ? dom.head.insertBefore(
                          dom.createElement("script"),
                          dom.head.firstElementChild)
                      : dom.head.appendChild(dom.createElement("script"));
                script.textContent = fileContent;
            });
    };
}

const formHandlingIncluder = pluginIncluder(
    path.join(__dirname, "plugin-script-form-handling.js")
);
const templateDataAdder = pluginIncluder(
    path.join(__dirname, "plugin-script-template-jsdata.js")
);
const QquerySelectorAdder = pluginIncluder(
    path.join(__dirname, "plugin-script-Q-query-selector.js")
);

// ignoreFile can be a function or a string - if a function it is
// evaluated with no args
export default function (directory, {
    formHandling=false,
    templateJSData=false,
    QquerySelector=false,
    modifierFunctions=[],
    ignoreFile=defaultIgnoreFunction,
    errReporting = {
        ignoreErrors:false
    }
}={}) {
    // console.log(`ignore errors:`, errReporting?.ignoreErrors, errReporting);
    var realIgnoreFile;
    const jsdomCache = {};
    const [ignoreErr, ignoreText] = (function () {
        try {
            realIgnoreFile = typeof(ignoreFile) === "function"
                  ? (ignoreFile())
                  : ignoreFile;
            // console.log("real ignore file:", realIgnoreFile);
            return [,fs.readFileSync(realIgnoreFile, "utf8")];
        }
        catch (e) { return [e]; }
    })();

    if (ignoreErr) {
        if (errReporting?.ignoreErrors === false) {
            console.warn(`dom-cache unable to read ignore file '${realIgnoreFile}':`, ignoreErr);
        }
    }

    const gitIgnorer = ignoreErr === undefined
          ? ignore().add(ignoreText.toString())
          : ignore();

    // Initiate a watcher for the cache files
    const watcher = fs.watch(directory, {}, function (et, filename) {
        if (gitIgnorer.ignores(filename)) {
            return;
        }
        
        if (et === "rename") {
            console.warn(`fs watcher: renamed file ${filename} WILL NOT BE HANDLED - RESTART`);
            return;
        }
        if (et === "change" && filename.endsWith(".html")) {
            apiObject.updateJsdom(path.basename(filename, ".html"));
        } 
    });

    const modifierFns = modifierFunctions.concat(
        formHandling ? [formHandlingIncluder]  : []
    ).concat(
        templateJSData ? [templateDataAdder] : []
    ).concat(
        QquerySelector ? [QquerySelectorAdder] : []
    );
    var apiObject = {
        async updateJsdom(pageName) {
            console.log("updating file template:", pageName);
            const fileText = await fs.promises.readFile(
                path.join(directory, pageName) + ".html",
                "utf8"
            );
            const newDom = linkedomParseHTML(fileText).document;

            // a temp api that does everything but doesn't run these template modifiers
            const temporaryDomCache = {};
            const temporaryApi = {
                async updateJsdom(pageName) {
                    const fileText = await fs.promises.readFile(
                        path.join(directory, pageName) + ".html",
                        "utf8"
                    );
                    const newDom = linkedomParseHTML(fileText).document;
                    temporaryDomCache[pageName] = newDom;
                    return newDom;
                },
                async getJsdom(pageName) {
                    const dom = jsdomCache[pageName];
                    if (dom) {
                        return dom;
                    }
                    // Else there's no file
                    return temporaryApi.updateJsdom(pageName);
                }
            };

            for (const modifier of modifierFns) {
                await modifier(newDom, temporaryApi);
            }

            // We should probabky merge those things from
            // temporaryDomCache back into the main dom cache?
            
            jsdomCache[pageName] = newDom;
            return newDom;
        },

        async getJsdom(pageName) {
            const dom = jsdomCache[pageName];
            if (dom) {
                return dom.cloneNode(true);
            }
            // Else there's no file
            return apiObject.updateJsdom(pageName).then(d => d.cloneNode(true));
        },

        // Stops the embedded watcher
        stop() {
            watcher.close();
        }
    };
    return apiObject;
}


// End
