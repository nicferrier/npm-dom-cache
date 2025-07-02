# DOM Cache

This is a tiny thing but I use it a lot and it seems valuable enough
to wrap up in a package.


## How to install

Install this little library in your web project like this:

```
npm i \@nicferrier/dom-cache
```


## What is it?

It let's you cache DOM on the server side and use DOM manipulation to
change pages:

For example, something like:

```js
import domCache from "@nicferrier/dom-cache";

const pages = domCache(process.cwd());

app.get("/somepage", async (i,o) => {
    const object = {
        my: ["object", "is", "just"],
        a: ["test"]
    };
    const page = pages.getJsdom("some-html-page");
    const script = page.body.appendChild(page.createElement("script"))
    script.textContent = `var myObject = ${JSON.stringify(object)}`;
    o.send(page.toString());
});
```

If an uncached page is requested by name then it will be
read and parsed and cached.

Additionally, the dom-cache will start a watcher on the directory you
pass it for any changed HTML page - when an HTML file changes then the
dom-cache the: read, parse, cache process.

The DOM objects returned from `getJsdom` are always clones of the
cached object. So they can be modified with impunity.

## Adding data with script tags

The example above adds a script tag and embeds some data. This seems a
pretty safe way to add data to a DOM page but of course you go further
and do all the manipulation on the server side.

One common use case is for database rows and I like to:

* define a template for the row in my HTML page
* define a js function on the client side that will accept data and materialize the template

and then do something like:

```js
const page = pages.getJsdom("db-result");
for (const row of databaseResult.rows) {
   const script = page.body.appendChild(page.createElement("script"));
   script.textContent = `templateMaterialize(${JSON.stringify(row)});
}
```

This is quite fast.


## API

Everything is in the dom cache creation really:

```
function domCache (directory, {
    modifierFunctions=[],
    ignoreFile=defaultIgnoreFunction,
    errReporting = {
        ignoreErrors:false
    }
```

The `modifierFunctions` are called on load of a page into the cache,
before the entry into the cache is made. Which means it's possible to
alter the DOMs before they are cached, for example to make them
consistent: add a `HEAD` or a `FOOTER` or whatever.

The tests have an example.


The `ignoreFile` can be a path to an ignore file, such as gitignore or
a function to be called with no arguments which is expected to return
an ignore file path.

The `defaultIgnoreFunction` tries to compute a `.gitignore` from the
stack trace of the caller, presuming that the caller will be running
somewhere located near a `.gitignore`. This is just how I do things
normally, I don't use `src` directories or the like...

`errReporting` just turns on or off some messaging about errors.


## Built-in _extensions_

Dom-cache provides an ideal opportunity to load script into pages when
we cache them, that's why the `modifierScripts` option is
provided. This is an ideal way to extend the DOM.

There are a few optional extensions built-in to dom-cache which you
can activate when you create the cache:

```js
const cache = domCache(process.cwd(), {
    formHandling: true,
    templateJSData: true,
    QquerySelector: true
});
```

These are all documented separately
[here](READMY-EXTENDING-WEBDEV-WITH-DOMCACHE.md).


## Demonstration dom-cache server

Serving dom-cache enabled HTML pages is something I sometimes find
useful to do off the cuff so I also included a dom-cache enabled
server which you can start in any directory and will dom-cache HTML
files from the current directory.

In addition it will serve a dom-cache index page if it can find one or
generate a plain HTML index page of any HTML files it can find in the
current directory.

You can run the dom-cache server like this:

```
nicferrier-dcserver 9000
```

to start it on port 9000, although port 9000 is the default.

You can also do:

```
nicferrier-dcserver help
```

to get basic help.

It is _just_ an HTTP server, there are no certificates, so it's not
useful for anything but local use.


## Further improvements

I would like to make the speed even faster and the memory footprint
even smaller by allowing the DOM to have lazily evaluated elements
_and_ a streaming output function.

Then the DOM could be written directly to an output stream and as long
as the lazily evaluated elements did not refer to other parts of the
DOM then they would effectively be just outputting directly to the
stream.

This would be the nirvana of server side rendering in my opinion.


_fin_