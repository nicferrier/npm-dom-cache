# Extending WebDev with DomCache

Table of content:

* [`Q` helper](#Qhelper)
* [`template` helper](#templatehelper)
* [`form` handling](#formhandling)

DomCache affords the perfect opportunity for backend developers to
inject javascript into a page, through `modifierFunctions`:

```js
function myPageModifier(dom, api) {
  if (process.env.PRODENV === "dev") {
    dom.head.appendChild(dom.createElement("style"))
       .textContent = "body { background-color: red !important; }";
  }
}
const cache = domCache(__dirname, { modifierFunctions: [myPageModifier] });
```

This will insert a style to make it clear in the front end that the
backend is running in the development environment.

But this can also be used to extend HTML, consistently across an
application, perhaps to provide some standard tooling for developers.

DomCache even comes with some pre-canned extensions and this readme
seeks to document those extensions.

<a id="Qhelper"></a>
## The `Q` helper

JQuery used to have the `$` function which was very cool. DOM has an
equivalent: `document.querySelector` and it's great that this is
standardized. But it's hell to type!!

So the `Q` helper adds a function `Q` that does what
`document.querySelector` does.

It's that simple.

Here's how to ensure it's added to every cached page:

```js
domCache(directory, {QquerySelector: true});
```

And then you can use it inside your page:

```html
<body>
  <script>function clickHandler() {
      Q('#article').textContent = window.event.target.textContent;
   }
  </script>
  <button onclick="clickHandler()">Buttons need pushing!</button>
  <article></article>
```

<a id="templatehelper"></a>
## Template helpers

Doing:

```js
domCache(directory, {dataTemplating: true});
```

will turn on some data handling via `template` elements for all pages
cached.

This provides extended element methods for elements that have
`template` children allowing `add` and `insert` to be used to append
and insert plain Javascript data objects as child elements based on
invoking the `template`.

For example:

```html
<div id="example">
  <template>
    <P>You will witness the <slot name="keyVal"></slot>
       of this <slot name="key"></slot>
       </P>
  </template>
  <p>You will witness the awesome power of this extension library</P>
</div>
<script>document.querySelector("#example").add({
    key: "battlestation",
    keyVal: "awesome power"
})</script>
```

will result in the following HTML:

```html
<div id="example">
  <P>You will witness the awesome power of this extension library</P>
  <P>You will witness the awesome power of this battlestation</P>
</div>
```

In addition, if the object passed to `add` is a `Response` object then
`add` will try to fetch `json` from the `Response` and use that as the
data.

This means that the Template Data extension can be used more directly
with the [Form Handling extension](#formhandling):

```html
<form method="POST" action="identity"
      onsubmit="go({onJSON: document.querySelector('#rowslist').add})">
  <fieldset>
    <label>field 1</label>
    <input type="text" name="field1">
    <label>field 2</label>
    <input type="text" name="field2">
  </fieldset>
  <input type="submit" value="submmit">
</form>
<section id="rowslist">
  <template>
    <div>
      <span><slot name="field1"></slot></span>
      <span><slot name="field2"></slot></span>
    </div>
  </template>
</section>
```

We aren't limited to just append operations with the `add` method,
there are two other methods:

* `insert` which takes two arguments, data AND the insert point
* `replace` which will replace the contents of an element, except the template

An example of `insert`:

```html
<section id="rows">
  <template>
    <ul>
      <li><slot name="a"></slot></li>
    </ul>
  </template>
  <p>everything is good</p>
</section>
<script>Q('#rows').insert({'a':"1,000,000"}, Q('#rows P'))</script>
```

Possibly, `replace` is more useful:

```html
<section id="rows">
  <template>
    <ul>
      <li><slot name="a"></slot></li>
    </ul>
  </template>
  <p>everything is good</p>
</section>
<script>Q('#rows').replace({'a':"1,000,000"})</script>
```

`replace` (and `insert`) also take data as a `Response` object.

`replace` is so useful because it allows Forms to replace content,
much like in HTMx.

### Attributes

According to the HTML5 specification `slot` elements cannot cause
attribute nodes to be created.

But I have added a a hack to allow this:

```html
<section id="hypertext">
  <template>
    <p>Go <a>
     <slot name="url" attr="href"></slot>
     <slot name="link"></slot>
    </a> for a good time</p>
  </template>
  <p>everything is good</p>
</section>
<script>Q('#rows').replace({'link':"to London", "href": "https://discover.london"})</script>
```

The `attr` attribute on a slot used with this system will caused the
parent element to receive the named attribute with the value found by
the slot replacement.



<a id="formhandling"></a>
## Form Handling

Doing:

```js
domCache(directory, {formHandling: true});
```

will turn on the Form Handling extension for all pages cached.

This provides extended Form behaviour when an `onsubmit` attribute is
added to a `form` object. The extensions allow intercepting submission
of the Form in the manner of the `submit` form event.

Here is an example:

```html
<form method='POST' action='/create'
      onsubmit="alert('form action is ' + this.action)">
   <input type="submit" name="submit" value="submit me">
</form>
```

Pressing `submit me` here will cause an alert with `form action is
/create` as the warning message. The Form will _not_ be `POSTed` over
the network because the `onsubmit` script does not cause a `POST`.

The value of `this` during the expression is always the current Form.

The capability to do this would be limited if not for second part of
the extension: the `go` function which is attached to each Form
with the `onsubmit` attribute.

`Form.go` allows a form to be sent without browser context
change. The form data is encoded in whatever way is specified by the
`enctype` attribute of the form (or by the default) and then sent to
the target, asynchronously, and a response is returned.

Here is an example:

```html
<form method='POST' action='/create'
      onsubmit='this.go().then(response=>alert("form said:" + response.statusText))'>
   <input type="submit" name="submit" value="submit me">
</form>
```

Form.go also extends the HTML specification for `enctype` allowing
an `enctype` to be specified as `application/json` or `text/json`;
when specified as either of those the Form's fields are turned into a
JS object like this:

```
Object.fromEntries(new URLSearchParams(new FormData(form)))
```

It's possible to fail to convert things that way and currently there
is no way to alter or influence this behaviour.


Form.go still has difficulties for practical Form handling, so
`Form.go` can also take several document type handlers which will
be executed depending on the response's `content-type`.

For example, if the response content is an HTML or XML document,
consider the following document excerpt:

```html
<div>
  <form method="POST" action="/identity?out=html"
        onsubmit="this.go({onDocument(r) { this.parentElement.querySelector('article').innerHTML = r.document.body.innerHTML}})">
    <input type="submit" name="send" value="show document handling">
    <fieldset>
      <label>field 1</label>
      <input type="text" name="field1">
      <label>field 2</label>
      <input type="text" name="field2">
      <label>field 3</label>
      <input type="text" name="field3">
    </fieldset>
  </form>
  <article>
  </article>
</div>
```

This will insert the body of the returned document into the `article`
following the Form.

It's also possible to do this with JSON:

```html
<form method='POST' action='/create'
      onsubmit='this.go({onJSON(r) alert(`the data was: ${JSON.stringify(r.data)}`)})'>
   <input type="submit" name="submit" value="submit me">
</form>
```

These examples of `Form.go` only work if the endpoint returns the
correct content type, specifying a content type handler for that does
not match the returned content will mean the content type handler is
ignored.

An error can be caught directly by the developer, in the `onsubmit`
like so:

```html
<form method="POST" onsubmit='this.go().catch(e => alert("error! " + e.message))'>
  <input type="submit" value="defaults send!">
</form>
```

But there is also good _default_ behaviour. If the Form has a `name`
and a `dialog` can be found in the document with the same `name` _and_
the `class` which is the name of the JS Error, then the dialog will be
opened, modal.

For example, consider this document excerpt:

```html
<dialog name="registration" class="HTTPError">
  <form method="dialog">
    <button autofocus>Ok</button>
  </form>
  <P>Sorry, there was an error submitting the registration, call support?</P>
</dialog>
<form name="registration" method="POST" action="/register"
      onsubmit="this.go()">
   <label>forename:</label><input type="text" name="forename">
   <label>surname:</label> <input type="text" name="surname">
   <input type="submit" value="register">
</form>
```

If there is an HTTP error submitting the form with `Form.go` then,
because no direct `catch` is defined in the `onsubmit` the extended
Form will `showModal` on the `registration` dialog - because it shares
the same name as the Form and has a class of `HTTPError`.

In this example there is no `dialog`:

```html
<form name="registration" method="POST" action="/register"
      onsubmit="this.go()">
   <label>forename:</label><input type="text" name="forename">
   <label>surname:</label> <input type="text" name="surname">
   <input type="submit" value="register">
</form>
```

and so what will happen on error will be a simple `alert`.

The final _trick_ of the Form handling extension is that there are
also aliases for different `go` methods, all the below work the same;
first the way we've done it elsewhere in this document:

```html
<form method="POST" action="/handler" onsubmit="this.go()"><form>
```

now, an `onsubmit` bound alias for `this.go`:

```html
<form method="POST" action="/handler" onsubmit="go()"><form>
```

now a Form bound alias for `go` with a `POST` method:

```html
<form method="POST" action="/handler" onsubmit="this.POST()"><form>
```

or you could use:

```html
<form method="POST" action="/handler" onsubmit="this.post()"><form>
```

now an `onsubmit` bound alias for `go` with a `POST` method:

```html
<form action="/handler" onsubmit="POST()"><form>
```

note you cannot use `post()` - it _must_ be uppercase.

And in addition, of course, the following Form alises _and_ `onsubmit`
aliases are provided:

* `form.delete`
* `form.DELETE`
* `DELETE`
* `form.put`
* `form.PUT`
* `PUT`
* `form.get`
* `form.GET`
* `GET`

So things like the following are possible:

```html
<dialog name="wiki" class="HTTPError">
  <form method="dialog">
    <button autofocus>Ok</button>
  </form>
  <P>Sorry, there was an error saving the text, call support?</P>
</dialog>
<form name="wiki" method="POST" action="/save"
      onsubmit="PUT({onDocument: Q('doc').replace})">
   <label>text:</label><textarea cols="40" rows="80" name="wikitext></textarea>
   <label>change:</label><input type="text" name="change">
   <input type="submit" value="save">
</form>
<article>
  <template>
    <pre class="hidden"><slot name="wikitext"></slot></pre>
    <slot name="wikidoc"></slot>
    <footer>
      Last edit by <address><a><slot name="editor"></slot></a></address>
    </footer>
  </template>
  <h2>A wiki page</h2>
  <P>This is my wiki page, it's not very long</P>
</article>
```

_fin_
