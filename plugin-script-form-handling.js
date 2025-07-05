class HTTPError extends Error {
    constructor(response, message) {
        super(message);
        this.response = response;
        this.name = "HTTPError";
    }
}

window.addEventListener("load", loadEvt => {
    let _domParser;
    const _getDOMParser = function() {
        if (_domParser === undefined) {
            _domParser = new DOMParser();
        }
        return _domParser;
    };
    Array.from(document.forms).forEach(form => {
        if (form.getAttribute("onsubmit") === null
            || form.getAttribute("onsubmit") === undefined) {
            return;
        }

        // Decorate
        form.go = async function({
            method=undefined,
            onJSON=undefined,
            onDocument=undefined
        }={}) {
            const formMethod = method??form.getAttribute("method")??"GET";
            console.log("Form EXTEND go");
            const fetchOps = { method: formMethod };
            if (fetchOps.method === "POST") {  // FIXME!! what other methods have bodies?
                const body = ({
                    "application/x-www-form-urlencoded":
                    _ => new URLSearchParams(new FormData(form)),
                    "multipart/form-data":
                    _ => new FormData(form),
                    "application/json":
                    _ => Object.fromEntries(new URLSearchParams(new FormData(form))),
                    "text/json":
                    _ => Object.fromEntries(new URLSearchParams(new FormData(form)))
                }[form.getAttribute("enctype")??"application/x-www-form-urlencoded"])();
                Object.assign(fetchOps, {body});
            }
            // FIXME - if not a POST body don't they have to get converted onto the action??

            return fetch(form.getAttribute("action")??"", fetchOps).then(r => {
                if (!(r.status === 200 || r.status === 201)) {
                    console.log("Form EXTEND go error response");
                    throw new HTTPError(r, r.statusText);
                }
                return r;
            }).then(r => {
                r.contentType = r.headers.get("content-type");
                if (onJSON !== undefined
                    && (r.contentType.startsWith("application/json")
                        || r.contentType.startsWith("text/json"))) {
                    return r.json().then(jsonParsed => {
                        r.data = jsonParsed;
                        return r;
                    });
                }
                if (onDocument !== undefined
                    && (r.contentType.startsWith("text/html")
                        || r.contentType.startsWith("text/xml"))) {
                    return r.text()
                        .then(docText => {
                            console.log("DOC TEXT:", docText);
                            const justType = r.contentType.split(";")[0];
                            console.log("JUST TYPE:", justType);
                            return _getDOMParser()
                                .parseFromString(docText, justType);
                        })
                        .then(doc => {
                            r.document = doc;
                            return r;
                        });
                }
                return r;
            }).then(r => {
                console.log("Form.Go EXTEND data type handling");
                if (r.data && (typeof onJSON === "function")) {
                    return Promise.resolve(onJSON.call(form, r));
                }
                if (r.document && (typeof onDocument === "function")) {
                    return Promise.resolve(onDocument.call(form, r));
                }
                // else maybe it's a querySelector?
                return r;
            });
        };
        form.post = function({
            onJSON=undefined,
            onDocument=undefined
        }) { return form.go.call(form, {method:"POST", onJSON, onDocument}); };
        form.POST = form.post;
        form.delete = function({
            onJSON=undefined,
            onDocument=undefined
        }) { return form.go.call(form, {method:"DELETE", onJSON, onDocument}); };
        form.DELETE = form.delete;
        form.put = function({
            onJSON=undefined,
            onDocument=undefined
        }) { return form.go.call(form, {method:"PUT", onJSON, onDocument}); };
        form.PUT = form.put;

        form.err = function (err) {
            console.log("Form EXTEND err handler");
            if (err instanceof HTTPError) {
                if (form.getAttribute("name") !== null
                    && document.querySelector(
                        `dialog[name=${form.getAttribute("name")}].HTTPError`
                    ) !== null) {
                    document.querySelector(
                        `dialog[name=${form.getAttribute("name")}].HTTPError`
                    ).showModal();
                    // form.querySelector("dialog.HTTPError").showModal();
                    return;
                }
                alert(`${err.name??'Error'}: ${err.message??'Something went wrong'}`);
                return;
            }
            throw err;
        };

        form.onsubmit = function () {
            const submitEvt = window.event;
            submitEvt.preventDefault();
            submitEvt.stopPropagation();
            const script = form.getAttribute("onsubmit");
            console.log("script:", script, form.onsubmit);
            if (script === null || script === undefined) {
                return false;
            }
            const evaler = function () {
                return eval(`"use strict";
var {go, POST, PUT, DELETE} = this; 
${script}`);
            };
            evaler.call(form)?.catch(form.err);

            return false;
        };
    });
});
