"use strict";
var CodeMirror_1 = require('./CodeMirror');
// export const EXAMPLES: {text: string, mode: EditorMode}[] = [
//     {mode: JAVASCRIPT, text: 'foobar'},
//     {mode: C, text: 'barbar'},
//     {mode: PYTHON, text: 'bleepbelp'}
// ];
exports.EXAMPLES = [
    {
        mode: CodeMirror_1.JAVASCRIPT,
        text: "\n\n\n\n\nfunction eratosthenes(n) {\n    // Eratosthenes algorithm to find all primes under n\n    var array = [], upperLimit = Math.sqrt(n), output = [];\n\n    // Make an array from 2 to (n - 1)\n    for (var i = 0; i < n; i++) {\n        array.push(true);\n    }\n\n    // Remove multiples of primes starting from 2, 3, 5,...\n    for (var i = 2; i <= upperLimit; i++) {\n        if (array[i]) {\n            for (var j = i * i; j < n; j += i) {\n                array[j] = false;\n            }\n        }\n    }\n\n    // All array[i] set to true are primes\n    for (var i = 2; i < n; i++) {\n        if (array[i]) {\n            output.push(i);\n        }\n    }\n\n    return output;\n}"
    },
    {
        mode: CodeMirror_1.C,
        text: "\n\n\n\n\nstatic struct node *prev = NULL;\n\nbool isBST(struct node* root)\n{\n    // traverse the tree in inorder fashion and keep track of prev node\n    if (root)\n    {\n        if (!isBST(root->left))\n          return false;\n\n        // Allows only distinct valued nodes\n        if (prev != NULL && root->data <= prev->data)\n          return false;\n\n        prev = root;\n\n        return isBST(root->right);\n    }\n\n    return true;\n}"
    },
    {
        mode: CodeMirror_1.PYTHON,
        text: "\n\n\n\n\nfrom bitarray import bitarray\nimport mmh3\n \nclass BloomFilter:\n    \n    def __init__(self, size, num_hashes = 10):\n        self.size = size\n        self.num_hashes = num_hashes\n        self.bit_array = bitarray(size)\n        self.bit_array.setall(0)\n        \n    def add(self, string):\n        for seed in xrange(self.num_hashes):\n            result = mmh3.hash(string, seed) % self.size\n            self.bit_array[result] = 1\n            \n    def might_have(self, string):\n        for seed in xrange(self.num_hashes):\n            result = mmh3.hash(string, seed) % self.size\n            if self.bit_array[result] == 0:\n                return False\n        return True\n"
    },
    {
        mode: CodeMirror_1.RUST,
        text: "\n\n\n\n\nfn fib(x: int) -> int {\n    match x {\n        0 | 1 => x,\n        _     => fib(x - 1) + fib(x - 2),\n    }\n}\n\nfn main() {\n    let number = 20;\n    println(fmt!(\"%?th fib number is: %?\", number, fib(number)));\n}"
    }
];
//# sourceMappingURL=ExampleCode.js.map