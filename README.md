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