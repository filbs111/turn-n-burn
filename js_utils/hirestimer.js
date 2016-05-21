//high res timer thing. from http://stackoverflow.com/questions/6233927/microsecond-timing-in-javascript
if (window.performance.now) {
    myconsolelog("Using high performance timer");
    getTimestamp = function() { return window.performance.now(); };
} else {
    if (window.performance.webkitNow) {
        myconsolelog("Using webkit high performance timer");
        getTimestamp = function() { return window.performance.webkitNow(); };
    } else {
        myconsolelog("Using low performance timer");
        getTimestamp = function() { return new Date().getTime(); };
    }
}