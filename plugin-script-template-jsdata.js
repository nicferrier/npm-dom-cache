window.addEventListener("load", _ => {
    Array.from(document.querySelectorAll("template")).forEach(templateObject => {
        const elementObject = templateObject.parentElement;
        const _add = function (data) {
            const fragment = templateObject.content.cloneNode(true);
            Array.from(fragment.querySelectorAll("slot")).forEach(slot => {
                slot.replaceWith(data[slot.name]);
            });
            return elementObject.appendChild(fragment);
        };
        elementObject.add = async function (data) {
            if (data instanceof Response) {
                const r = data;
                const resolvedData = r.data;
                if (resolvedData) {
                    return _add(resolvedData);
                }
                return r.json().then(_add);
            }
            return _add(data);
        };
    });
});
