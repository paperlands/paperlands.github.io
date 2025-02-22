export class Registry {
    constructor() {
        // Built-in functions
        this.builtins = {
            'sin': [(x) => Math.sin(this.toRadians(x)), 1],
            'cos': [(x) => Math.cos(this.toRadians(x)), 1],
            'tan': [(x) => Math.tan(this.toRadians(x)), 1],
            'asin': [(x) => this.toDegrees(Math.asin(x)), 1],
            'acos': [(x) => this.toDegrees(Math.acos(x)), 1],
            'atan': [(x) => this.toDegrees(Math.atan(x)), 1],
            'sqrt': [Math.sqrt, 1],
            'log': [Math.log, 1],
            'exp': [Math.exp, 1]
        };

        // User-defined functions
        this.userDefined = new Map();

        // Constants (can be thought of as 0-arity functions)
        this.constants = new Map([
            ['pi', Math.PI],
            ['e', Math.E]
        ]);
    }

    defineFunction(name, implementation, arity) {
        this.userDefined.set(name, [implementation, arity]);
    }

    defineConstant(name, value) {
        this.constants.set(name, value);
    }

    getFunction(name) {
        return this.builtins[name] || this.userDefined.get(name);
    }

    getConstant(name) {
        return this.constants.get(name);
    }

    hasFunction(name) {
        return name in this.builtins || this.userDefined.has(name);
    }

    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    toDegrees(radians) {
        return radians * (180 / Math.PI);
    }
}
