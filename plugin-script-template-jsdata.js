window.addEventListener("load", _ => {
    Array.from(document.querySelectorAll("template")).forEach(templateObject => {
        const elementObject = templateObject.parentElement;
        const elementMethod = fn => {
            return function() {
                const [dataArg] = arguments;
                // console.log("data arg:", dataArg, arguments);
                if (dataArg === undefined) return;
                if (dataArg instanceof Response) {
                    const r = dataArg;
                    const rdata = r.data;
                    if (rdata) {
                        return fn.apply(elementObject,
                                        [rdata].concat(Array.from(arguments).slice(1)));
                    }
                    return r.json().then(fn);
                }
                return fn.apply(elementObject, arguments);
            }
        }
        const slotReplace = (slot,data) => {
            if (slot.tagName === "SLOT" && slot.getAttribute("attr")) {
                slot.parentElement.setAttribute(slot.getAttribute("attr"), data[slot.name]);
                slot.remove();
            } else if (slot.tagName !== "SLOT") {
                const attr = slot.removeAttributeNode(slot.getAttributeNode("slot-attr"));
                const valName = slot.removeAttributeNode(slot.getAttributeNode("slot"));
                slot.setAttribute(attr.value, data[valName.value]);
            } else slot.replaceWith(data[slot.name]);
        };
        elementObject.add = elementMethod(function (data) {
            const fragment = templateObject.content.cloneNode(true);
            Array.from(fragment.querySelectorAll("slot,[slot]"))
                .forEach(slot=>slotReplace(slot,data));
            const ret = elementObject.appendChild(fragment);
            if (window.formExtender) window.formExtender(elementObject.querySelectorAll("form"));
            return ret;
        });
        elementObject.insert = elementMethod(function (data, insertPoint) {
            const fragment = templateObject.content.cloneNode(true);
            Array.from(fragment.querySelectorAll("slot")).forEach(slot=>slotReplace(slot,data));
            return elementObject.insertBefore(fragment, insertPoint);
        });
        elementObject.replace = elementMethod(function (data) {
            const fragment = templateObject.content.cloneNode(true);
            Array.from(fragment.querySelectorAll("slot,[slot]"))
                .forEach(slot=>slotReplace(slot,data));
            Array.from(elementObject.children)
                .filter(e => !e.isEqualNode(templateObject))
                .forEach(e => e.remove());
            return elementObject.appendChild(fragment);
        });
    });
});
