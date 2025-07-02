#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import os from "node:os";
import express from "express";
import domCache from "./dom-cache.mjs";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const thisDirectoryCache = domCache(__dirname, {
    formHandling: true,
    templateJSData: true,
    QquerySelector: true
});

const cache = domCache(process.cwd(), {
    formHandling: true,
    templateJSData: true,
    QquerySelector: true
});

const app = express();

app.post("/identity", async (i,o) => {
    let data = "";
    new Promise((t,c) => {
        i.on("data", chunk => data = data + chunk.toString("utf8"));
        i.on("end", t);
    }).then(_ => {
        if (i.get("content-type").startsWith("application/json")
            || i.get("content-type").startsWith("text/json")) {
            return JSON.parse(data);
        }
        return Object.fromEntries(new url.URLSearchParams(data));
    }).then(data => {
        if (i.query?.["out"] === "html") {
            const row2html = ([key,val]) => `<div><span>${key}</span><span>${val}</span></div>`;
            const data2html = data => {
                console.log("data:", data);
                return Object.entries(data).map(row2html).join("\n");
            }
            return o.status(200)
                .set("content-type", "text/html")
                .send(`<!doctype html>
<html>
<body>
${data2html(data)}
</body>
</html>`);
        }

        // Else it's json
        o.status(200).json(data);
    });
});

const pageRegex = new RegExp("^/[^/.]+$");
app.use(async function (i,o,next) {
    // If it's not in a subdirectory and it's got no extension OR it IS an html page... 
    if (i.url.substring(1).split("/").length === 1
        && (pageRegex.test(i.url) || i.url.endsWith(".html"))) {
        const pageName = i.url.endsWith(".html")
              ? i.url.substring(1, i.url.indexOf(".html"))
              : i.url.substring(1);
        const [err,page] = await cache.getJsdom(pageName)
              .then(r=>[,r]).catch(e=>[e]);
        if (err) {
            return next();
        }
        return o.send(page.toString());
    }
    next();
});

app.get("/dom-cache-test", async (i,o) => {
    const [err,page] = await thisDirectoryCache.getJsdom("page-extension-demo")
          .then(r=>[,r]).catch(e=>[e]);
    if (err) {
        return o.status(404).send(`<style>
html {color-scheme: light dark; font-family: sans-serif;}
</style>
<H1>Not found</H1>
<P>Sorry, that page was not found. Given that you were looking for the demo page, perhaps the dom-cache package is broken in some way?</P>`)
    }
    return o.send(page.toString());
});

// Indexes
app.get("/", async (i,o) => {
    const [err,page] = await cache.getJsdom("page-index")
          .then(r=>[,r])
          .catch(e=> {
              return cache.getJsdom("index")
          })
          .then(r=>r)
          .catch(e=>[e]);

    if (err) {
        return fs.promises.readdir(process.cwd())
            .then(l => {
                const ls = l.filter(f => f.endsWith(".html"))
                      .map(f => `<a href='${f}'>${f}</a><br>`)
                      .join("\n")
                      + "\n";
                o.send(ls);
            });
    }
    o.send(page.toString());
});

const argv = process.argv.slice(2);
if (argv[0] === "help" || argv[0] === "--help") {
    console.log(`DOM Cache web server - a simple webserver for DOM Cache
Usage:

  nicferrier-dcserver help        -- gives this message
  nicferrier-dcserver <port>      -- starts the server on <port>

The server is an example webserver which serves cached DOM from HTML
files in the current directory.  If there is an 'index.html' file or a
'page-index.html' it will serve that as an index.

The server also provides a '/identity' POST endpoint which will try to
echo back whatever is POSTed to it as JSON or, when passed the
'?out=html' query parameter, as an HTML document.
`);
    process.exit(0);
}

function str2num(str, retval=-1) {
    if (isNaN(parseInt(str))) return retval;
    return parseInt(str);
}
const port = str2num(argv[0], 9000);
const listener = await app.listen(port);
console.log(
    `dom-cache serving files from ${path.basename(process.cwd())} listening on:`,
    listener.address().port
);

// End

