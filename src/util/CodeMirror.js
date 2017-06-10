"use strict";
var CodeMirror = require('codemirror');
require('../../node_modules/codemirror/lib/codemirror.css');
require('../../node_modules/codemirror/theme/monokai.css');
require('../../node_modules/codemirror/addon/selection/active-line');
require('../../node_modules/codemirror/addon/edit/closebrackets');
require('../../node_modules/codemirror/addon/edit/matchbrackets');
require('../../node_modules/codemirror/mode/clike/clike.js');
require('../../node_modules/codemirror/mode/clojure/clojure.js');
require('../../node_modules/codemirror/mode/coffeescript/coffeescript.js');
require('../../node_modules/codemirror/mode/css/css.js');
require('../../node_modules/codemirror/mode/dockerfile/dockerfile.js');
require('../../node_modules/codemirror/mode/erlang/erlang.js');
require('../../node_modules/codemirror/mode/elm/elm.js');
require('../../node_modules/codemirror/mode/go/go.js');
require('../../node_modules/codemirror/mode/haskell/haskell.js');
require('../../node_modules/codemirror/mode/htmlmixed/htmlmixed.js');
require('../../node_modules/codemirror/mode/javascript/javascript.js');
require('../../node_modules/codemirror/mode/jsx/jsx.js');
require('../../node_modules/codemirror/mode/julia/julia.js');
require('../../node_modules/codemirror/mode/markdown/markdown.js');
require('../../node_modules/codemirror/mode/octave/octave.js');
require('../../node_modules/codemirror/mode/perl/perl.js');
require('../../node_modules/codemirror/mode/php/php.js');
require('../../node_modules/codemirror/mode/python/python.js');
require('../../node_modules/codemirror/mode/r/r.js');
require('../../node_modules/codemirror/mode/ruby/ruby.js');
require('../../node_modules/codemirror/mode/rust/rust.js');
require('../../node_modules/codemirror/mode/sass/sass.js');
require('../../node_modules/codemirror/mode/shell/shell.js');
require('../../node_modules/codemirror/mode/sql/sql.js');
require('../../node_modules/codemirror/mode/swift/swift.js');
require('../../node_modules/codemirror/mode/vb/vb.js');
exports.DEFAULT_MODE = { name: 'Plaintext', mime: 'text/plain', children: [] };
exports.JAVASCRIPT = { name: 'JavaScript', mime: 'application/javascript', children: [] };
exports.C = { name: 'C', mime: 'text/x-c', children: [] };
exports.PYTHON = { name: 'Python', mime: 'text/x-python', children: [] };
exports.RUST = { name: 'Rust', mime: 'text/x-rustsrc', children: [] };
exports.MODES = filterModes([
    exports.DEFAULT_MODE,
    { name: 'Markdown', mime: 'text/x-markdown', children: [] },
    exports.C,
    { name: 'C++', mime: 'text/x-c++src', children: [] },
    { name: 'Java', mime: 'text/x-java', children: [] },
    { name: 'C#', mime: 'text/x-csharp', children: [] },
    { name: 'Scala', mime: 'text/x-scala', children: [] },
    { name: 'Kotlin', mime: 'text/x-kotlin', children: [] },
    {
        name: 'GLSL', children: [
            { name: 'Vertex Shader', mime: 'x-shader/x-vertex', children: [] },
            { name: 'Fragment Shader', mime: 'x-shader/x-fragment', children: [] }
        ]
    },
    { name: 'Objective C', mime: 'text/x-objectivec', children: [] },
    { name: 'Clojure', mime: 'text/x-clojure', children: [] },
    { name: 'ClojureScript', mime: 'text/x-clojurescript', children: [] },
    {
        name: 'CSS flavors', children: [
            { name: 'CSS', mime: 'text/css', children: [] },
            { name: 'SCSS', mime: 'text/x-scss', children: [] },
            { name: 'Sass', mime: 'text/x-sass', children: [] },
            { name: 'LESS', mime: 'text/x-less', children: [] }
        ]
    },
    exports.JAVASCRIPT,
    { name: 'TypeScript', mime: 'application/typescript', children: [] },
    { name: 'CoffeeScript', mime: 'text/coffeescript', children: [] },
    { name: 'JSX', mime: 'text/jsx', children: [] },
    { name: 'JSON', mime: 'application/json', children: [] },
    { name: 'Julia', mime: 'text/x-julia', children: [] },
    { name: 'MATLAB', mime: 'text/x-octave', children: [] },
    { name: 'R', mime: 'text/x-rsrc', children: [] },
    {
        name: 'SQL', children: [
            { name: 'ANSI SQL', mime: 'text/x-sql', children: [] },
            { name: 'Microsoft SQL', mime: 'text/x-mssql', children: [] },
            { name: 'MySQL', mime: 'text/x-mysql', children: [] },
            { name: 'MariaDB', mime: 'text/x-mariadb', children: [] },
            { name: 'Cassandra', mime: 'text/x-cassandra', children: [] },
            { name: 'PL/SQL', mime: 'text/x-plsql', children: [] },
            { name: 'HiveQL', mime: 'text/x-hive', children: [] },
            { name: 'Postgres', mime: 'text/x-pgsql', children: [] },
            { name: 'GQL', mime: 'text/x-gql', children: [] }
        ]
    },
    { name: 'Dockerfile', mime: 'text/x-dockerfile', children: [] },
    { name: 'Erlang', mime: 'text/x-erlang', children: [] },
    { name: 'Elm', mime: 'text/x-elm', children: [] },
    { name: 'Go', mime: 'text/x-go', children: [] },
    { name: 'Haskell', mime: 'text/x-haskell', children: [] },
    { name: 'XML', mime: 'application/xml', children: [] },
    { name: 'HTML', mime: 'text/html', children: [] },
    { name: 'Perl', mime: 'text/x-perl', children: [] },
    { name: 'PHP', mime: 'text/x-php', children: [] },
    exports.PYTHON,
    { name: 'Ruby', mime: 'text/x-ruby', children: [] },
    exports.RUST,
    { name: 'Bash', mime: 'text/x-sh', children: [] },
    { name: 'Swift', mime: 'text/x-swift', children: [] },
    { name: 'Visual Basic', mime: 'text/x-vb', children: [] }
]);
var MIME_TO_MODE = indexModes(exports.MODES);
var UNKNOWN_MODE = { name: 'Unknown', mime: exports.DEFAULT_MODE.mime, children: [] };
exports.DEFAULT_EDITOR_CONFIG = {
    theme: 'monokai',
    lineNumbers: true,
    lineWrapping: true,
    styleActiveLine: true,
    autofocus: true,
    mode: exports.DEFAULT_MODE.mime,
    viewportMargin: Infinity,
    autoCloseBrackets: true,
    matchBrackets: true
};
function buildEditor(host, options) {
    if (options === void 0) { options = exports.DEFAULT_EDITOR_CONFIG; }
    return CodeMirror(host, options);
}
exports.buildEditor = buildEditor;
function getModeForMime(mime) {
    if (!mime)
        return exports.DEFAULT_MODE;
    return MIME_TO_MODE[mime] || UNKNOWN_MODE;
}
exports.getModeForMime = getModeForMime;
function filterModes(modes) {
    if (!modes || modes.length === 0)
        return [];
    var availableMimes = CodeMirror['mimeModes'];
    var result = [];
    modes.forEach(function (mode) {
        var children = filterModes(mode.children);
        if (children.length > 0 || availableMimes[mode.mime] !== undefined) {
            mode.children = children;
            result.push(mode);
        }
    });
    return result.sort(function (a, b) { return a.name.localeCompare(b.name); });
}
function indexModes(modes, soFar) {
    if (soFar === void 0) { soFar = {}; }
    if (!modes || modes.length === 0)
        return soFar;
    modes.forEach(function (mode) {
        if (mode.mime)
            soFar[mode.mime] = mode;
        indexModes(mode.children, soFar);
    });
    return soFar;
}
//# sourceMappingURL=CodeMirror.js.map