window.Q = function (selector) {
    return document.querySelector(selector);
};
window.addEventListener("load", _ => {
    window.Q = function (selector) {
        return document.querySelector(selector);
    };
});

